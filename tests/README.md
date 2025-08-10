# Testing

Comprehensive test suite for the SquareX browser extension project.

## Overview

This module contains all tests for the project, including unit tests, integration tests, and end-to-end tests across all browser extensions.

## Planned Role

### Core Responsibilities
- **Comprehensive Testing**: Unit, integration, and end-to-end test coverage
- **Cross-browser Testing**: Automated testing across Chrome, Firefox, and Safari
- **Performance Testing**: Benchmarking and performance regression testing
- **Quality Assurance**: Ensure reliability and accuracy of analysis algorithms

### Technical Architecture
- **Playwright Framework**: Cross-browser E2E testing automation
- **Jest Framework**: Unit and integration testing
- **Rust Testing**: WASM module testing with Rust test framework
- **Test Fixtures**: Comprehensive test data and sample files

### Testing Strategy
- **Unit Tests**: Individual component testing (WASM, extensions, utilities)
- **Integration Tests**: Component interaction testing
- **E2E Tests**: Complete workflow testing across browsers
- **Performance Tests**: Large file processing and memory usage testing

## Test Structure

### Purpose
The tests package provides comprehensive testing infrastructure for the entire project, including unit tests, integration tests, and end-to-end tests across all browser extensions. It ensures code quality, reliability, and cross-browser compatibility.

### File Layout
```
tests/
├── package.json            # Node.js package configuration
├── jest.config.js          # Jest configuration
├── playwright.config.ts    # Playwright configuration
├── tsconfig.json           # TypeScript configuration
├── src/
│   ├── unit/               # Unit tests
│   │   ├── wasm/          # WASM module tests
│   │   ├── shared/        # Shared utilities tests
│   │   └── extensions/    # Extension-specific tests
│   ├── integration/        # Integration tests
│   │   ├── wasm-integration/ # WASM integration tests
│   │   └── browser-integration/ # Browser API tests
│   ├── e2e/               # End-to-end tests
│   │   ├── chrome/        # Chrome extension E2E tests
│   │   ├── firefox/       # Firefox extension E2E tests
│   │   └── safari/        # Safari extension E2E tests
│   ├── fixtures/          # Test fixtures and sample files
│   │   ├── sample-files/  # Sample .txt files for testing
│   │   └── test-page/     # Test page HTML and assets
│   ├── utils/             # Test utilities and helpers
│   └── setup.ts           # Test setup and configuration
├── coverage/              # Test coverage reports
├── test-results/          # Playwright test results
└── playwright-report/     # Playwright HTML reports
```

## Build & Test

### Prerequisites

- **Node.js** 18+ and **pnpm** 8+
  ```bash
  # Install Node.js from https://nodejs.org/
  npm install -g pnpm
  ```

- **Playwright** browsers
  ```bash
  # Install Playwright browsers
  npx playwright install
  ```

- **Rust** 1.70+ (for WASM tests)
  ```bash
  # Install Rust from https://rustup.rs/
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  source ~/.cargo/env
  ```

- **Chrome, Firefox, Safari** browsers for E2E testing

### Test Commands

```bash
# Install dependencies
pnpm install

# Run all tests
pnpm test

# Run specific test suites
pnpm test:unit         # Unit tests only
pnpm test:integration  # Integration tests
pnpm test:e2e          # End-to-end tests
pnpm test:coverage     # Tests with coverage

# Run tests for specific components
pnpm test:wasm         # WASM module tests
pnpm test:shared       # Shared utilities tests
pnpm test:extensions   # Extension-specific tests

# Run E2E tests for specific browsers
pnpm test:e2e:chrome
pnpm test:e2e:firefox
pnpm test:e2e:safari

# Run tests in watch mode
pnpm test:watch
```

### Development Workflow

```bash
# Start test development server
pnpm dev:test

# Run tests in watch mode
pnpm test:watch

# Run specific test files
pnpm test:file -- tests/unit/wasm/entropy.test.ts

# Run tests with specific browser
pnpm test:e2e:chrome:headed  # Run with browser UI
pnpm test:e2e:chrome:debug   # Run with debug mode

# Generate test reports
pnpm test:report
```

### Manual Testing

1. **Unit Tests**:
   ```bash
   # Test WASM algorithms
   pnpm test:wasm:unit
   
   # Test shared utilities
   pnpm test:shared:unit
   
   # Test extension logic
   pnpm test:extensions:unit
   ```

2. **Integration Tests**:
   ```bash
   # Test WASM integration
   pnpm test:wasm:integration
   
   # Test browser APIs
   pnpm test:browser:integration
   
   # Test file processing pipeline
   pnpm test:pipeline:integration
   ```

3. **End-to-End Tests**:
   ```bash
   # Test complete workflows
   pnpm test:e2e:workflow
   
   # Test file upload scenarios
   pnpm test:e2e:upload
   
   # Test UI interactions
   pnpm test:e2e:ui
   ```

### Test Fixtures

Sample files for testing:
- **Normal text files**: Regular human-readable content
- **Large files**: Multi-MB files for performance testing
- **Obfuscated files**: High-entropy content for detection testing
- **Files with banned phrases**: Content containing "confidential" and "do not share"
- **Files with PII**: Content with 9-12 digit numbers

### Performance Testing

```bash
# Run performance benchmarks
pnpm test:performance

# Test large file processing
pnpm test:performance:large-files

# Test memory usage
pnpm test:performance:memory

# Test WASM performance
pnpm test:performance:wasm
```

### Browser Compatibility Testing

```bash
# Test all browsers
pnpm test:compatibility

# Test specific browser features
pnpm test:compatibility:wasm
pnpm test:compatibility:apis
pnpm test:compatibility:extensions
```

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

### CI Local Testing

```bash
# Run CI pipeline locally
pnpm ci:test

# Run specific CI stages
pnpm ci:test:unit      # Unit test stage
pnpm ci:test:integration # Integration test stage
pnpm ci:test:e2e       # E2E test stage
pnpm ci:test:coverage  # Coverage stage
```

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

### Generate Reports

```bash
# Generate coverage report
pnpm test:coverage:report

# Generate performance report
pnpm test:performance:report

# Generate compatibility matrix
pnpm test:compatibility:report

# Generate test summary
pnpm test:summary
```

## Troubleshooting

### Common Test Issues

#### Test Failures
```bash
# Clear test cache
pnpm test:clean

# Reinstall test dependencies
pnpm install --force

# Check test environment
pnpm test:validate:environment
```

#### Browser Test Issues
```bash
# Reinstall Playwright browsers
npx playwright install

# Check browser compatibility
pnpm test:validate:browsers

# Run tests with debug output
pnpm test:e2e:debug
```

#### WASM Test Issues
```bash
# Rebuild WASM module
pnpm build:wasm:test

# Check Rust toolchain
rustup show
rustup update

# Run WASM tests with verbose output
pnpm test:wasm:verbose
```

### Getting Help
- Check test logs for detailed error information
- Review browser console output
- Verify test environment setup
- Check [docs/analysis.md](../docs/analysis.md) for technical details
