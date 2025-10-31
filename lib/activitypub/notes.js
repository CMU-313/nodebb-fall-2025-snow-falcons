'use strict';

const winston = require('winston');
const nconf = require('nconf');
const db = require('../database');
const batch = require('../batch');
const meta = require('../meta');
const privileges = require('../privileges');
const categories = require('../categories');
const messaging = require('../messaging');
const notifications = require('../notifications');
const user = require('../user');
const topics = require('../topics');
const posts = require('../posts');
const utils = require('../utils');
const activitypub = module.parent.exports;
const Notes = module.exports;
async function lock(value) {
  const count = await db.incrObjectField('locks', value);
  return count <= 1;
}
async function unlock(value) {
  await db.deleteObjectField('locks', value);
}
Notes._normalizeTags = async (tag, cid) => {
  const systemTags = (meta.config.systemTags || '').split(',');
  const maxTags = await categories.getCategoryField(cid, 'maxTags');
  const tags = (tag || []).map(tag => {
    tag.name = tag.name.startsWith('#') ? tag.name.slice(1) : tag.name;
    return tag;
  }).filter(o => o.type === 'Hashtag' && !systemTags.includes(o.name)).map(t => t.name);
  if (tags.length > maxTags) {
    tags.length = maxTags;
  }
  return tags;
};
Notes.assert = async (uid, input, options = {
  skipChecks: false
}) => {
  if (!input) {
    return null;
  }
  const id = !activitypub.helpers.isUri(input) ? input.id : input;
  const lockStatus = await lock(id, '[[error:activitypub.already-asserting]]');
  if (!lockStatus) {
    return null;
  }
  let chain;
  let context = await activitypub.contexts.get(uid, id);
  if (context.tid) {
    unlock(id);
    const {
      tid
    } = context;
    return {
      tid,
      count: 0
    };
  } else if (context.context) {
    chain = Array.from(await activitypub.contexts.getItems(uid, context.context, {
      input
    }));
    if (chain && chain.length) {
      context = context.context;
    }
  } else {
    context = undefined;
  }
  if (!chain || !chain.length) {
    chain = Array.from(await Notes.getParentChain(uid, input));
    chain.reverse();
  }
  if (!chain.length) {
    unlock(id);
    return null;
  }
  chain = chain.sort((a, b) => a.timestamp - b.timestamp);
  const mainPost = chain[0];
  let {
    pid: mainPid,
    tid,
    uid: authorId,
    timestamp,
    title,
    content,
    sourceContent,
    _activitypub
  } = mainPost;
  const hasTid = !!tid;
  const cid = hasTid ? await topics.getTopicField(tid, 'cid') : options.cid || -1;
  if (options.cid && cid === -1) {
    await topics.tools.move(tid, {
      cid: options.cid,
      uid: 'system'
    });
  }
  const members = await db.isSortedSetMembers(`tid:${tid}:posts`, chain.slice(1).map(p => p.pid));
  members.unshift(await posts.exists(mainPid));
  if (tid && members.every(Boolean)) {
    activitypub.helpers.log('[notes/assert] No new notes to process.');
    unlock(id);
    return {
      tid,
      count: 0
    };
  }
  if (hasTid) {
    mainPid = await topics.getTopicField(tid, 'mainPid');
  } else {
    const set = activitypub.helpers.makeSet(_activitypub, ['to', 'cc', 'audience']);
    await activitypub.actors.assert(Array.from(set));
    const resolved = await Promise.all(Array.from(set).map(async id => await activitypub.helpers.resolveLocalId(id)));
    const recipientCids = resolved.filter(Boolean).filter(({
      type
    }) => type === 'category').map(obj => obj.id);
    let remoteCid;
    const assertedGroups = await categories.exists(Array.from(set));
    try {
      const {
        hostname
      } = new URL(mainPid);
      remoteCid = Array.from(set).filter((id, idx) => {
        const {
          hostname: cidHostname
        } = new URL(id);
        return assertedGroups[idx] && cidHostname === hostname;
      }).shift();
    } catch (e) {}
    if (remoteCid || recipientCids.length) {
      options.cid = remoteCid || recipientCids.shift();
    }
    title = title || activitypub.helpers.generateTitle(utils.decodeHTMLEntities(content || sourceContent));
    if (_activitypub && _activitypub.tag && Array.isArray(_activitypub.tag)) {
      _activitypub.tag.filter(tag => tag.type === 'Emoji').forEach(tag => {
        title = title.replace(new RegExp(tag.name, 'g'), '');
      });
    }
  }
  mainPid = utils.isNumber(mainPid) ? parseInt(mainPid, 10) : mainPid;
  const inputIndex = chain.map(n => n.pid).indexOf(id);
  const hasRelation = uid || hasTid || options.skipChecks || options.cid || (await assertRelation(chain[inputIndex !== -1 ? inputIndex : 0]));
  const privilege = `topics:${tid ? 'reply' : 'create'}`;
  const allowed = await privileges.categories.can(privilege, options.cid || cid, activitypub._constants.uid);
  if (!hasRelation || !allowed) {
    if (!hasRelation) {
      activitypub.helpers.log(`[activitypub/notes.assert] Not asserting ${id} as it has no relation to existing tracked content.`);
    }
    unlock(id);
    return null;
  }
  tid = tid || utils.generateUUID();
  mainPost.tid = tid;
  const urlMap = chain.reduce((map, post) => post.url ? map.set(post.url, post.id) : map, new Map());
  const unprocessed = chain.map(post => {
    post.tid = tid;
    if (urlMap.has(post.toPid)) {
      post.toPid = urlMap.get(post.toPid);
    }
    return post;
  }).filter((p, idx) => !members[idx]);
  const count = unprocessed.length;
  activitypub.helpers.log(`[notes/assert] ${count} new note(s) found.`);
  if (!hasTid) {
    const {
      to,
      cc,
      attachment
    } = mainPost._activitypub;
    const tags = await Notes._normalizeTags(mainPost._activitypub.tag || []);
    try {
      await topics.post({
        tid,
        uid: authorId,
        cid: options.cid || cid,
        pid: mainPid,
        title,
        timestamp,
        tags,
        content: mainPost.content,
        sourceContent: mainPost.sourceContent,
        _activitypub: mainPost._activitypub
      });
      unprocessed.shift();
    } catch (e) {
      activitypub.helpers.log(`[activitypub/notes.assert] Could not post topic (${mainPost.pid}): ${e.message}`);
      return null;
    }
    await Promise.all([Notes.updateLocalRecipients(mainPid, {
      to,
      cc
    }), mainPost._activitypub.image ? topics.thumbs.associate({
      id: tid,
      path: mainPost._activitypub.image
    }) : null, posts.attachments.update(mainPid, attachment)]);
    if (context) {
      activitypub.helpers.log(`[activitypub/notes.assert] Associating tid ${tid} with context ${context}`);
      await topics.setTopicField(tid, 'context', context);
    }
  }
  for (const post of unprocessed) {
    const {
      to,
      cc,
      attachment
    } = post._activitypub;
    try {
      await topics.reply(post);
      await Promise.all([Notes.updateLocalRecipients(post.pid, {
        to,
        cc
      }), posts.attachments.update(post.pid, attachment)]);
    } catch (e) {
      activitypub.helpers.log(`[activitypub/notes.assert] Could not add reply (${post.pid}): ${e.message}`);
    }
  }
  await Promise.all([Notes.syncUserInboxes(tid, uid), unlock(id)]);
  return {
    tid,
    count
  };
};
Notes.assertPrivate = async object => {
  if (!object || !object.id || !activitypub.helpers.isUri(object.id)) {
    return null;
  }
  const localUids = [];
  const recipients = new Set([...(object.to || []), ...(object.cc || [])]);
  await Promise.all(Array.from(recipients).map(async value => {
    const {
      type,
      id
    } = await activitypub.helpers.resolveLocalId(value);
    if (type === 'user') {
      localUids.push(id);
      recipients.delete(value);
      recipients.add(parseInt(id, 10));
    }
  }));
  await activitypub.actors.assert([...recipients]);
  const exists = await user.exists([...recipients]);
  Array.from(recipients).forEach((uid, idx) => {
    if (!exists[idx]) {
      recipients.delete(uid);
    }
  });
  let roomId;
  const resolved = await activitypub.helpers.resolveLocalId(object.inReplyTo);
  let toMid = resolved.type === 'message' && resolved.id;
  if (object.inReplyTo && (await messaging.messageExists(toMid || object.inReplyTo))) {
    roomId = await messaging.getMessageField(toMid || object.inReplyTo, 'roomId');
  }
  const participants = await messaging.getUsersInRoom(roomId, 0, -1);
  const participantUids = participants.map(user => user.uid);
  if (roomId) {
    const omitted = participants.filter(user => {
      const {
        uid
      } = user;
      return !recipients.has(uid) && uid !== object.attributedTo;
    });
    if (omitted.length) {
      toMid = undefined;
      roomId = null;
    }
  }
  let timestamp;
  try {
    timestamp = new Date(object.published).getTime() || Date.now();
  } catch (e) {
    timestamp = Date.now();
  }
  const payload = await activitypub.mocks.message(object);
  try {
    await messaging.checkContent(payload.content, false);
  } catch (e) {
    const {
      displayname,
      userslug
    } = await user.getUserFields(payload.uid, ['displayname', 'userslug']);
    const notification = await notifications.create({
      bodyShort: `[[error:remote-chat-received-too-long, ${displayname}]]`,
      path: `/user/${userslug}`,
      nid: `error:chat:uid:${payload.uid}`,
      from: payload.uid
    });
    notifications.push(notification, Array.from(recipients).filter(uid => utils.isNumber(uid)));
    return null;
  }
  if (!roomId) {
    roomId = await messaging.newRoom(payload.uid, {
      uids: [...recipients]
    });
  }
  const added = Array.from(recipients).filter(uid => !participantUids.includes(uid));
  const assertion = await activitypub.actors.assert(added);
  if (assertion) {
    await messaging.addUsersToRoom(payload.uid, added, roomId);
  }
  const message = await messaging.sendMessage({
    ...payload,
    timestamp: Date.now(),
    roomId: roomId,
    toMid: toMid
  });
  messaging.notifyUsersInRoom(payload.uid, roomId, message);
  await messaging.setMessageField(payload.mid, 'timestamp', timestamp);
  return {
    roomId
  };
};
async function assertRelation(post) {
  const {
    followers
  } = await activitypub.actors.getLocalFollowCounts(post.uid);
  const {
    tag
  } = post._activitypub;
  let uids = [];
  if (tag && tag.length) {
    const slugs = tag.reduce((slugs, tag) => {
      if (tag.type === 'Mention') {
        const [slug, hostname] = tag.name.slice(1).split('@');
        if (hostname === nconf.get('url_parsed').hostname) {
          slugs.push(slug);
        }
      }
      return slugs;
    }, []);
    uids = slugs.length ? await db.sortedSetScores('userslug:uid', slugs) : [];
    uids = uids.filter(Boolean);
  }
  return followers > 0 || uids.length;
}
Notes.updateLocalRecipients = async (id, {
  to,
  cc
}) => {
  const recipients = new Set([...(to || []), ...(cc || [])]);
  const uids = new Set();
  await Promise.all(Array.from(recipients).map(async recipient => {
    const {
      type,
      id
    } = await activitypub.helpers.resolveLocalId(recipient);
    if (type === 'user' && (await user.exists(id))) {
      uids.add(parseInt(id, 10));
      return;
    }
    const followedUid = await db.getObjectField('followersUrl:uid', recipient);
    if (followedUid) {
      const {
        uids: followers
      } = await activitypub.actors.getLocalFollowers(followedUid);
      if (followers.size > 0) {
        followers.forEach(uid => {
          uids.add(uid);
        });
      }
    }
  }));
  if (uids.size > 0) {
    await db.setAdd(`post:${id}:recipients`, Array.from(uids));
  }
};
Notes.getParentChain = async (uid, input) => {
  const id = activitypub.helpers.isUri(input) ? input : input.id;
  const chain = new Set();
  const traverse = async (uid, id) => {
    const {
      type,
      id: localId
    } = await activitypub.helpers.resolveLocalId(id);
    if (type === 'post' && localId) {
      return await traverse(uid, localId);
    }
    const postData = await posts.getPostData(id);
    if (postData) {
      chain.add(postData);
      if (postData.toPid) {
        await traverse(uid, postData.toPid);
      } else if (utils.isNumber(id)) {
        const mainPid = await topics.getTopicField(postData.tid, 'mainPid');
        if (mainPid !== parseInt(id, 10)) {
          await traverse(uid, mainPid);
        }
      }
    } else {
      let object = !activitypub.helpers.isUri(input) && input.id === id ? input : undefined;
      try {
        object = object || (await activitypub.get('uid', uid, id));
        if (id !== object.id) {
          return await traverse(uid, object.id);
        }
        object = await activitypub.mocks.post(object);
        if (object) {
          chain.add(object);
          if (object.toPid) {
            await traverse(uid, object.toPid);
          }
        }
      } catch (e) {
        winston.verbose(`[activitypub/notes/getParentChain] Cannot retrieve ${id}, terminating here.`);
      }
    }
  };
  await traverse(uid, id);
  return chain;
};
Notes.syncUserInboxes = async function (tid, uid) {
  const [pids, {
    cid,
    mainPid,
    tags
  }] = await Promise.all([db.getSortedSetMembers(`tid:${tid}:posts`), topics.getTopicFields(tid, ['tid', 'cid', 'mainPid', 'tags'])]);
  pids.unshift(mainPid);
  const recipients = await db.getSetsMembers(pids.map(id => `post:${id}:recipients`));
  const uids = recipients.reduce((set, uids) => new Set([...set, ...uids.map(u => parseInt(u, 10))]), new Set());
  if (uid) {
    uids.add(parseInt(uid, 10));
  }
  const tagsFollowers = await topics.getTagsFollowers(tags.map(tag => tag.value));
  new Set(tagsFollowers.flat()).forEach(uid => {
    uids.add(uid);
  });
  const categoryFollowers = await activitypub.actors.getLocalFollowers(cid);
  categoryFollowers.uids.forEach(uid => {
    uids.add(uid);
  });
  const keys = Array.from(uids).map(uid => `uid:${uid}:inbox`);
  const score = await db.sortedSetScore(`cid:${cid}:tids`, tid);
  const removeKeys = (await db.getSetMembers(`tid:${tid}:recipients`)).filter(uid => !uids.has(parseInt(uid, 10))).map(uid => `uid:${uid}:inbox`);
  activitypub.helpers.log(`[activitypub/syncUserInboxes] Syncing tid ${tid} with ${uids.size} inboxes`);
  await Promise.all([db.sortedSetsRemove(removeKeys, tid), db.sortedSetsAdd(keys, keys.map(() => score || Date.now()), tid), db.setAdd(`tid:${tid}:recipients`, Array.from(uids))]);
};
Notes.getCategoryFollowers = async cid => {
  let uids = await db.getSortedSetRangeByScore(`cid:${cid}:uid:watch:state`, 0, -1, categories.watchStates.tracking, categories.watchStates.tracking);
  uids = uids.filter(uid => !utils.isNumber(uid));
  return uids;
};
Notes.announce = {};
Notes.announce.list = async ({
  pid,
  tid
}) => {
  let pids = [];
  if (pid) {
    pids = [pid];
  } else if (tid) {
    let mainPid;
    [pids, mainPid] = await Promise.all([db.getSortedSetMembers(`tid:${tid}:posts`), topics.getTopicField(tid, 'mainPid')]);
    pids.unshift(mainPid);
  }
  if (!pids.length) {
    return [];
  }
  const keys = pids.map(pid => `pid:${pid}:announces`);
  let announces = await db.getSortedSetsMembersWithScores(keys);
  announces = announces.reduce((memo, cur, idx) => {
    if (cur.length) {
      const pid = pids[idx];
      cur.forEach(({
        value: actor,
        score: timestamp
      }) => {
        memo.push({
          pid,
          actor,
          timestamp
        });
      });
    }
    return memo;
  }, []);
  return announces;
};
Notes.announce.add = async (pid, actor, timestamp = Date.now()) => {
  const [tid] = await Promise.all([posts.getPostField(pid, 'tid'), db.sortedSetAdd(`pid:${pid}:announces`, timestamp, actor)]);
  await Promise.all([posts.setPostField(pid, 'announces', await db.sortedSetCard(`pid:${pid}:announces`)), topics.tools.share(tid, actor, timestamp)]);
};
Notes.announce.remove = async (pid, actor) => {
  await db.sortedSetRemove(`pid:${pid}:announces`, actor);
  const count = await db.sortedSetCard(`pid:${pid}:announces`);
  if (count > 0) {
    await posts.setPostField(pid, 'announces', count);
  } else {
    await db.deleteObjectField(`post:${pid}`, 'announces');
  }
};
Notes.announce.removeAll = async pid => {
  await Promise.all([db.delete(`pid:${pid}:announces`), db.deleteObjectField(`post:${pid}`, 'announces')]);
};
Notes.delete = async pids => {
  if (!Array.isArray(pids)) {
    pids = [pids];
  }
  const exists = await posts.exists(pids);
  pids = pids.filter((_, idx) => exists[idx]);
  let tids = await posts.getPostsFields(pids, ['tid']);
  tids = new Set(tids.map(obj => obj.tid));
  const recipientSets = pids.map(id => `post:${id}:recipients`);
  const announcerSets = pids.map(id => `pid:${id}:announces`);
  await db.deleteAll([...recipientSets, ...announcerSets]);
  await Promise.all(Array.from(tids).map(async tid => Notes.syncUserInboxes(tid)));
};
Notes.prune = async () => {
  winston.info('[notes/prune] Starting scheduled pruning of topics');
  const start = '-inf';
  const stop = Date.now() - 1000 * 60 * 60 * 24 * meta.config.activitypubContentPruneDays;
  let tids = await db.getSortedSetRangeByScore('cid:-1:tids', 0, -1, start, stop);
  winston.info(`[notes/prune] Found ${tids.length} topics older than 30 days (since last activity).`);
  const posters = await db.getSortedSetsMembers(tids.map(tid => `tid:${tid}:posters`));
  const hasLocalVoter = await Promise.all(tids.map(async tid => {
    const mainPid = await db.getObjectField(`topic:${tid}`, 'mainPid');
    const pids = await db.getSortedSetMembers(`tid:${tid}:posts`);
    pids.unshift(mainPid);
    const voters = new Set();
    await Promise.all(pids.map(async pid => {
      const [upvoters, downvoters] = await db.getSetsMembers([`pid:${pid}:upvote`, `pid:${pid}:downvote`]);
      upvoters.forEach(uid => voters.add(uid));
      downvoters.forEach(uid => voters.add(uid));
    }));
    return Array.from(voters).some(uid => utils.isNumber(uid));
  }));
  tids = tids.filter((_, idx) => {
    const localPoster = posters[idx].some(uid => utils.isNumber(uid));
    const localVoter = hasLocalVoter[idx];
    return !localPoster && !localVoter;
  });
  winston.info(`[notes/prune] ${tids.length} topics eligible for pruning`);
  await batch.processArray(tids, async tids => {
    await Promise.all(tids.map(async tid => await topics.purgePostsAndTopic(tid, 0)));
  }, {
    batch: 100
  });
  winston.info('[notes/prune] Scheduled pruning of topics complete.');
};