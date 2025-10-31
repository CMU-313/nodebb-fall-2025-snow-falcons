# Stryker Mutation Testing Setup for NodeBB

This document explains how Stryker-mutator is configured in this NodeBB codebase for mutation testing.

## Overview

Stryker-mutator is a mutation testing tool that helps improve test quality by introducing small changes (mutations) to your code and running tests to see if they detect these changes. If tests pass with mutated code, it indicates weak test coverage.

## Installation

The following packages have been installed as dev dependencies:

```bash
npm install --save-dev @stryker-mutator/core @stryker-mutator/jest-runner jest
```

## Configuration

### Stryker Configuration (`stryker.config.mjs`)

The Stryker configuration is set up to:

- **Mutate specific files**: Currently configured to mutate `src/socket.io/index.js` and `src/topics/index.js`
- **Use Jest as test runner**: Independent from NodeBB's existing Mocha setup
- **Mock NodeBB dependencies**: Prevents initialization issues during testing
- **Generate HTML reports**: For detailed mutation analysis

### Key Configuration Options

```javascript
{
  mutate: [
    'src/socket.io/index.js',
    'src/topics/index.js'
  ],
  testRunner: 'jest',
  reporters: ['html', 'clear-text', 'progress'],
  coverageAnalysis: 'off', // Faster execution
  timeoutMS: 60000
}
```

## Test Structure

### Mutation Tests Directory (`mutation-tests/`)

The mutation tests are located in the `mutation-tests/` directory and are completely separate from NodeBB's existing test suite:

- `topics.test.js` - Tests for the topics module
- `socketio.test.js` - Tests for the socket.io module

### Mocking Strategy

Each test file includes comprehensive mocking to isolate the modules under test:

1. **Process mocking**: Prevents NodeBB from exiting during tests
2. **Winston logger mocking**: Prevents console spam
3. **Configuration mocking**: Mocks `nconf` with default values
4. **Module mocking**: Mocks heavy NodeBB subsystems (database, plugins, etc.)

## Usage

### Running Mutation Tests

```bash
# Run mutation tests with full reporting
npm run mutation-test

# Run mutation tests with CI-friendly output
npm run mutation-test:ci
```

### Direct Stryker Commands

```bash
# Run Stryker directly
npx stryker run

# Run with debug logging
npx stryker run --logLevel debug
```

## Adding New Modules for Mutation Testing

To add a new module for mutation testing:

1. **Add to mutate array** in `stryker.config.mjs`:
   ```javascript
   mutate: [
     'src/socket.io/index.js',
     'src/topics/index.js',
     'src/your-new-module/index.js'  // Add here
   ]
   ```

2. **Create a test file** in `mutation-tests/`:
   ```javascript
   // mutation-tests/your-new-module.test.js
   
   // Mock dependencies
   jest.mock('nconf', () => ({ /* mock config */ }));
   jest.mock('../src/database', () => ({}));
   // ... other mocks
   
   const yourModule = require('../src/your-new-module/index.js');
   
   describe('Your Module', () => {
     test('module exports expected functions', () => {
       expect(typeof yourModule.someFunction).toBe('function');
     });
   });
   ```

## Understanding Mutation Test Results

### HTML Report

After running mutation tests, check the `reports/mutation/html/index.html` file for detailed results including:

- **Mutation score**: Percentage of mutations killed by tests
- **Surviving mutations**: Mutations that weren't detected by tests
- **Killed mutations**: Mutations that were properly detected
- **Code coverage**: Which parts of code were tested

### Clear Text Report

The console output shows:
- Number of mutants created
- Number of mutants killed/survived
- Overall mutation score

## Best Practices

1. **Start small**: Begin with simple modules and gradually add more complex ones
2. **Mock comprehensively**: Ensure all dependencies are properly mocked
3. **Test actual functionality**: Focus on testing real behavior, not just exports
4. **Review surviving mutations**: Use them to identify weak test areas
5. **Regular runs**: Include mutation testing in your CI/CD pipeline

## Troubleshooting

### Common Issues

1. **Module not found errors**: Add more mocks for missing dependencies
2. **Timeout errors**: Increase `timeoutMS` in configuration
3. **No tests found**: Check `testMatch` pattern in Jest configuration
4. **Sandbox issues**: Ensure all required files are included in the configuration

### Debug Mode

Run with debug logging to get more detailed information:

```bash
npx stryker run --logLevel debug --fileLogLevel trace
```

## Integration with Existing Workflow

This Stryker setup is designed to be completely independent from NodeBB's existing testing infrastructure:

- **No interference**: Doesn't affect existing Mocha tests
- **Separate dependencies**: Uses Jest instead of Mocha
- **Isolated environment**: Comprehensive mocking prevents conflicts
- **Independent reporting**: Separate HTML reports for mutation analysis

## Future Enhancements

Consider these improvements:

1. **Expand mutation targets**: Add more modules to the mutate array
2. **Improve test quality**: Use mutation results to strengthen existing tests
3. **CI integration**: Add mutation testing to automated builds
4. **Coverage analysis**: Enable coverage analysis for more detailed insights
5. **Custom mutators**: Add domain-specific mutation operators

## Resources

- [Stryker Documentation](https://stryker-mutator.io/docs/stryker-js/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Mutation Testing Concepts](https://stryker-mutator.io/docs/mutation-testing-elements/)
