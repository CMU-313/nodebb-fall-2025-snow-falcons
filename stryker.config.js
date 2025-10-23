'use strict';

const config = {
	// ✅ Mutate specific files (you can expand this list)
	mutate: [
		'src/socket.io/index.js',
		'src/topics/index.js',
	],

	// ✅ Files to include in the sandbox
	files: [
		'src/**/*.js',
		'mutation-tests/**/*.js',
		'package.json',
	],

	// ✅ Ignore non-target areas to avoid parsing errors
	ignorePatterns: [
		'node_modules/**',
		'public/**',
		'build/**',
		'install/**',
		'test/**', // NodeBB's existing tests
		'src/cli/**',
		'vendor/**',
		'logs/**',
		'scripts/**',
	],

	testRunner: 'jest',
	jest: {
		projectType: 'custom',
		config: {
			testEnvironment: 'node',
			testMatch: ['<rootDir>/mutation-tests/**/*.test.js'],
			transform: {}, // No transforms needed for plain JS
			moduleDirectories: ['node_modules', 'src'],
		},
	},

	reporters: ['html', 'clear-text', 'progress'],
	coverageAnalysis: 'off', // Faster execution
	packageManager: 'npm',
	timeoutMS: 60000,

	// Log level for debugging
	logLevel: 'info',
};

module.exports = config;
