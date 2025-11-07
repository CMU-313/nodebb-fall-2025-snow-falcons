'use strict';

const nconf = require('nconf');
const {
  CookieJar
} = require('tough-cookie');
const fetchCookie = require('fetch-cookie').default;
const {
  version
} = require('../package.json');
exports.jar = function () {
  return new CookieJar();
};
const userAgent = `NodeBB/${version.split('.').shift()}.x (${nconf.get('url')})`;
async function call(url, method, {
  body,
  timeout,
  jar,
  ...config
} = {}) {
  let fetchImpl = fetch;
  if (jar) {
    fetchImpl = fetchCookie(fetch, jar);
  }
  const jsonTest = /application\/([a-z]+\+)?json/;
  const opts = {
    ...config,
    method,
    headers: {
      'content-type': 'application/json',
      'user-agent': userAgent,
      ...config.headers
    }
  };
  if (timeout > 0) {
    opts.signal = AbortSignal.timeout(timeout);
  }
  if (body && ['POST', 'PUT', 'PATCH', 'DEL', 'DELETE'].includes(method)) {
    if (opts.headers['content-type'] && jsonTest.test(opts.headers['content-type'])) {
      opts.body = JSON.stringify(body);
    } else {
      opts.body = body;
    }
  }
  if (global[Symbol.for('undici.globalDispatcher.1')] !== undefined) {
    class FetchAgent extends global[Symbol.for('undici.globalDispatcher.1')].constructor {
      dispatch(opts, handler) {
        delete opts.headers['sec-fetch-mode'];
        return super.dispatch(opts, handler);
      }
    }
    opts.dispatcher = new FetchAgent();
  }
  const response = await fetchImpl(url, opts);
  const {
    headers
  } = response;
  const contentType = headers.get('content-type');
  const isJSON = contentType && jsonTest.test(contentType);
  let respBody = await response.text();
  if (isJSON && respBody) {
    try {
      respBody = JSON.parse(respBody);
    } catch (err) {
      throw new Error('invalid json in response body', url);
    }
  }
  return {
    body: respBody,
    response: {
      ok: response.ok,
      status: response.status,
      statusCode: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    }
  };
}
exports.get = async (url, config) => call(url, 'GET', config);
exports.head = async (url, config) => call(url, 'HEAD', config);
exports.del = async (url, config) => call(url, 'DELETE', config);
exports.delete = exports.del;
exports.options = async (url, config) => call(url, 'OPTIONS', config);
exports.post = async (url, config) => call(url, 'POST', config);
exports.put = async (url, config) => call(url, 'PUT', config);
exports.patch = async (url, config) => call(url, 'PATCH', config);