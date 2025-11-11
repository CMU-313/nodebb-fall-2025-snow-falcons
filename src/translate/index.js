'use strict';

const nconf = require('nconf');
const meta = require('../meta');

const translatorApi = module.exports;

/**
 * Translate post content using the Python translator service
 * @param {Object} postData - Post data object containing content
 * @returns {Promise<[boolean, string]>} - [isEnglish, translatedContent]
 */
translatorApi.translate = async function (postData) {
	const content = postData.content || '';
	
	// Get translator API URL from config or environment variable
	// In Docker, use service name 'translator'; locally use 'localhost'
	// Default to service name for Docker, fallback to localhost for local dev
	const TRANSLATOR_API = meta.config.translatorApiUrl || 
	                       process.env.TRANSLATOR_API_URL || 
	                       (process.env.NODE_ENV === 'production' ? 'http://translator:5000' : 'http://localhost:5000');
	
	// Handle empty content
	if (!content || !content.trim()) {
		return [true, content];
	}
	
	try {
		// Call the Python translator service
		const response = await fetch(`${TRANSLATOR_API}/translate`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ content: content }),
		});
		
		if (!response.ok) {
			throw new Error(`Translator API returned ${response.status}`);
		}
		
		const data = await response.json();
		
		// Handle error response
		if (data.error) {
			console.error('[translate] Translator service error:', data.error);
			// Default to English on error
			return [true, content];
		}
		
		// Return format: [isEnglish (boolean), translatedContent (string)]
		return [
			data.isEnglish === true || data.isEnglish === 'true',
			data.translatedContent || content
		];
	} catch (err) {
		// On error, default to English (don't translate)
		console.error('[translate] Error calling translator service:', err.message);
		return [true, content];
	}
};
