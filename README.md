# SquareX Browser Extension

A cross-browser extension for real-time file upload security scanning using WebAssembly.

## Project Overview

This project implements a browser extension that scans `.txt` files selected for upload and performs security analysis using WebAssembly (WASM). The extension supports Chrome, Firefox, and Safari with a modular architecture designed for extensibility.

For detailed technical analysis, requirements, and architecture decisions, see [docs/analysis.md](docs/analysis.md).

## Prerequisites

### Required Software
- **Node.js** 18+ and **pnpm** 8+
  ```bash
  # Install Node.js from https://nodejs.org/
  # Install pnpm
  npm install -g pnpm
  ```

- **Rust** 1.70+ and **wasm-pack**
  ```bash
  # Install Rust from https://rustup.rs/
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  source ~/.cargo/env
  
  # Install wasm-pack
  cargo install wasm-pack
  ```

- **Playwright** dependencies
  ```bash
  # Install Playwright browsers
  npx playwright install
  ```

### Optional Tools
- **Chrome/Chromium** 88+ for Chrome extension testing
- **Firefox** 57+ for Firefox extension testing  
- **Safari** 13+ and **Xcode** 12+ for Safari extension development (macOS only)

## Quick Start

### 1. Install Dependencies
```bash
# Install all project dependencies
pnpm install
```

### 2. Build WASM Module
```bash
# Build WebAssembly module for web targets
pnpm build:wasm

# Build for testing (Node.js target)
pnpm build:wasm:test
```

### 3. Build Extensions
```bash
# Build all extensions
pnpm build:extensions

# Build specific extensions
pnpm build:ext:chrome
pnpm build:ext:firefox
pnpm build:ext:safari
```

### 4. Start Local Test Server
```bash
# Start local server for test page
python3 -m http.server 8080

# Or using Node.js
npx serve -p 8080
```

### 5. Load Extensions

#### Chrome Extension
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/chrome` directory

#### Firefox Extension
1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from `dist/firefox`

#### Safari Extension (macOS only)
1. Build the extension using Xcode
2. Enable Safari App Extensions in Safari preferences
3. Install the extension from the macOS app
4. Enable the extension in Safari

### 6. Test the Extension
1. Navigate to `http://localhost:8080/test_page.html`
2. Select a `.txt` file for upload
3. The extension will automatically scan and display results

## Development Commands

### Build Commands
```bash
# Development builds with watch mode
pnpm dev:wasm          # Watch WASM changes
pnpm dev:ext:chrome    # Watch Chrome extension
pnpm dev:ext:firefox   # Watch Firefox extension
pnpm dev:ext:safari    # Watch Safari extension

# Production builds
pnpm build:wasm        # Build WASM for production
pnpm build:extensions  # Build all extensions
pnpm build:all         # Build everything
```

### Testing Commands
```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test:unit         # Unit tests
pnpm test:wasm         # WASM module tests
pnpm test:e2e          # End-to-end tests
pnpm test:extensions   # Extension-specific tests

# Test with specific browsers
pnpm test:e2e:chrome
pnpm test:e2e:firefox
pnpm test:e2e:safari

# Run tests in watch mode
pnpm test:watch
```

### Linting and Formatting
```bash
# Lint all code
pnpm lint

# Format code
pnpm format

# Type checking
pnpm type-check
```

## CI/CD Local Testing

### Run CI Pipeline Locally
```bash
# Install CI dependencies
pnpm ci:install

# Run full CI pipeline
pnpm ci:test

# Run specific CI stages
pnpm ci:lint          # Linting stage
pnpm ci:build         # Build stage
pnpm ci:test:unit     # Unit test stage
pnpm ci:test:e2e      # E2E test stage
```

### Docker Development
```bash
# Build development container
docker build -f Dockerfile.dev -t squarex-dev .

# Run development environment
docker run -it --rm -v $(pwd):/app squarex-dev

# Run tests in container
docker run --rm -v $(pwd):/app squarex-dev pnpm test
```

## Project Structure

```
├── wasm/           # Rust WASM module for analysis
├── extensions/     # Browser extension implementations
│   ├── chrome/     # Chrome extension (Manifest V3)
│   ├── firefox/    # Firefox extension (WebExtensions)
│   └── safari/     # Safari extension (App Extensions)
├── shared/         # Shared utilities and types
├── tests/          # Test suite and test files
├── diagrams/       # Architecture and flow diagrams
├── scripts/        # Build and deployment scripts
└── docs/           # Documentation
    └── analysis.md # Technical analysis and requirements
```

## Features

- **Real-time File Analysis**: Scan `.txt` files up to several GB in size
- **Security Detection**: 
  - Word frequency analysis
  - Banned phrase detection
  - PII pattern recognition
  - Obfuscation detection via entropy analysis
- **Cross-browser Support**: Chrome, Firefox, Safari
- **Extensible Architecture**: Modular design for future file format support
- **Automatic Upload Control**: Allow/block uploads based on analysis results

## Development

See individual component READMEs for specific development instructions:

- [WASM Module](wasm/README.md)
- [Chrome Extension](extensions/chrome/README.md)
- [Firefox Extension](extensions/firefox/README.md)
- [Safari Extension](extensions/safari/README.md)
- [Shared Utilities](shared/README.md)
- [Testing](tests/README.md)

## Troubleshooting

### Common Issues

#### WASM Build Failures
```bash
# Clear Rust cache
cargo clean
# Reinstall wasm-pack
cargo install wasm-pack --force
```

#### Extension Loading Issues
- Ensure manifest.json is valid for target browser
- Check browser console for errors
- Verify file permissions on extension directory

#### Test Failures
```bash
# Clear test cache
pnpm test:clean
# Reinstall Playwright browsers
npx playwright install
```

### Getting Help
- Check [docs/analysis.md](docs/analysis.md) for technical details
- Review component-specific READMEs
- Open an issue with detailed error information

## Changelog

### [Unreleased]
- Initial project setup
- WASM module architecture
- Cross-browser extension framework
- Build system configuration

### [0.1.0] - 2024-01-XX
- Initial release
- Basic file analysis functionality
- Chrome extension implementation
- Firefox extension implementation
- Safari extension implementation
- WASM module with core algorithms
- Test suite and CI pipeline

## License

[License information to be added]
