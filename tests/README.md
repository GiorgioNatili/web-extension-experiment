# Testing

Comprehensive test suite for the SquareX browser extension project.

## Overview

This module contains all tests for the project, including unit tests, integration tests, and end-to-end tests across all browser extensions.

## Test Structure

```
tests/
├── unit/              # Unit tests
│   ├── wasm/         # WASM module tests
│   ├── shared/       # Shared utilities tests
│   └── extensions/   # Extension-specific tests
├── integration/       # Integration tests
│   ├── wasm-integration/ # WASM integration tests
│   └── browser-integration/ # Browser API tests
├── e2e/              # End-to-end tests
│   ├── chrome/       # Chrome extension E2E tests
│   ├── firefox/      # Firefox extension E2E tests
│   └── safari/       # Safari extension E2E tests
├── fixtures/         # Test fixtures and sample files
│   ├── sample-files/ # Sample .txt files for testing
│   └── test-page/    # Test page HTML and assets
└── utils/            # Test utilities and helpers
```

## Test Types

### Unit Tests
- **WASM Module**: Rust unit tests for analysis algorithms
- **Shared Utilities**: TypeScript unit tests for common functions
- **Extension Logic**: Individual component testing

### Integration Tests
- **WASM Integration**: Testing WASM module with JavaScript
- **Browser APIs**: Testing browser extension APIs
- **File Processing**: End-to-end file analysis pipeline

### End-to-End Tests
- **Cross-browser Testing**: Using Playwright for browser automation
- **Extension Loading**: Testing extension installation and loading
- **File Upload Scenarios**: Testing complete file upload workflows
- **UI Interaction**: Testing user interface and interactions

## Development

### Prerequisites

- Node.js 18+
- Playwright
- Rust (for WASM tests)
- Chrome, Firefox, Safari browsers

### Test Commands

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run tests for specific browser
npm run test:e2e:chrome
npm run test:e2e:firefox
npm run test:e2e:safari

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Fixtures

Sample files for testing:
- **Normal text files**: Regular human-readable content
- **Large files**: Multi-MB files for performance testing
- **Obfuscated files**: High-entropy content for detection testing
- **Files with banned phrases**: Content containing "confidential" and "do not share"
- **Files with PII**: Content with 9-12 digit numbers

## Test Coverage

### WASM Module Coverage
- Word frequency analysis accuracy
- Banned phrase detection
- PII pattern recognition
- Entropy calculation correctness
- Large file processing performance

### Extension Coverage
- Content script injection
- Background script functionality
- UI rendering and interaction
- File upload interception
- Analysis result display

### Cross-browser Coverage
- Chrome Manifest V3 compatibility
- Firefox WebExtensions compatibility
- Safari App Extensions compatibility
- WASM loading across browsers

## Continuous Integration

Tests are configured to run:
- On every pull request
- On every commit to main branch
- Cross-browser testing in CI environment
- Performance regression testing

## Test Data

Test files are stored in `tests/fixtures/sample-files/` and include:
- Various file sizes (KB to GB)
- Different content types
- Edge cases for analysis algorithms
- Performance test files

## Reporting

Test results include:
- Unit test coverage reports
- Integration test results
- E2E test screenshots and videos
- Performance benchmarks
- Browser compatibility matrix
