'use strict';

const translatorApi = module.exports;
translatorApi.translate = function (postData) {
	return ['is_english', postData];
};