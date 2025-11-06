'use strict';

const db = require('../../database');
module.exports = {
	name: 'Change the schema of simple keys so they don\'t use value field (mongodb only)',
	timestamp: Date.UTC(2017, 11, 18),
	method: async function () {
		let configJSON;
		try {
			configJSON = require('../../../config.json') || {
				[process.env.database]: true,
				database: process.env.database,
			};
		} catch (err) {
			configJSON = {
				[process.env.database]: true,
				database: process.env.database,
			};
		}
		const isMongo = configJSON.hasOwnProperty('mongo') && configJSON.database === 'mongo';
		const {
			progress,
		} = this;
		if (!isMongo) {
			return;
		}
		const {
			client,
		} = db;
		const query = {
			_key: {
				$exists: true,
			},
			value: {
				$exists: true,
			},
			score: {
				$exists: false,
			},
		};
		progress.total = await client.collection('objects').countDocuments(query);
		const cursor = await client.collection('objects').find(query).batchSize(1000);
		const processBatch = async (items = []) => {
			if (items.length >= 1000) {
				const updatePromises = items.map(async (item) => {
					delete item.expireAt;
					if (Object.keys(item).length === 3 && item.hasOwnProperty('_key') && item.hasOwnProperty('value')) {
						await client.collection('objects').updateOne({
							_key: item._key,
						}, {
							$rename: {
								value: 'data',
							},
						});
					}
					progress.incr();
				});
				await Promise.all(updatePromises);
				return processBatch([]);
			}
			const item = await cursor.next();
			if (item === null) {
				if (items.length > 0) {
					const updatePromises = items.map(async (item) => {
						delete item.expireAt;
						if (Object.keys(item).length === 3 && item.hasOwnProperty('_key') && item.hasOwnProperty('value')) {
							await client.collection('objects').updateOne({
								_key: item._key,
							}, {
								$rename: {
									value: 'data',
								},
							});
						}
						progress.incr();
					});
					await Promise.all(updatePromises);
				}
				return;
			}
			items.push(item);
			return processBatch(items);
		};
		await processBatch();
	},
};