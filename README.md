# SquareX Browser Extension

A cross-browser extension for real-time file upload security scanning using WebAssembly.

## Project Overview

This project implements a browser extension that scans `.txt` files selected for upload and performs security analysis using WebAssembly (WASM). The extension supports Chrome, Firefox, and Safari with a modular architecture designed for extensibility.

For detailed technical analysis, requirements, and architecture decisions, see [docs/analysis.md](docs/analysis.md).

For comprehensive project planning, architecture decisions, and development roadmap, see [docs/plan.md](docs/plan.md).

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
npm install
```

### 2. Build WASM Module
```bash
# Build WebAssembly module for web targets
cd wasm && source "$HOME/.cargo/env" && wasm-pack build --target web
cd ..
```

### 3. Build Shared Package
```bash
# Build shared utilities
cd shared && npm run build
cd ..
```

### 4. Build Extensions
```bash
# Build Chrome extension
cd extensions/chrome && npm run build
cd ../..

# Build Firefox extension (when ready)
cd extensions/firefox && npm run build
cd ../..

# Build Safari extension (when ready)
cd extensions/safari && npm run build
cd ../..
```

### 5. Start Local Test Server
```bash
# Start local server for test page
cd test-page && python3 -m http.server 8080
```

### 5. Load Extensions

#### Chrome Extension
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extensions/chrome/dist/` directory

#### Firefox Extension
1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select the `manifest.json` file from `extensions/firefox/dist/`

#### Safari Extension (macOS only)
1. Build the extension using Xcode
2. Enable Safari App Extensions in Safari preferences
3. Install the extension from the macOS app
4. Enable the extension in Safari

### 6. Test the Extension
1. Navigate to `http://localhost:8080`
2. Select a `.txt` file for upload
3. The extension will automatically scan and display results

## Development Commands

### Build Commands
```bash
# Development builds with watch mode
cd wasm && wasm-pack build --target web --dev --watch  # Watch WASM changes
cd extensions/chrome && npm run build:dev              # Watch Chrome extension
cd extensions/firefox && npm run build:dev             # Watch Firefox extension
cd extensions/safari && npm run build:dev              # Watch Safari extension

# Production builds
cd wasm && wasm-pack build --target web --release      # Build WASM for production
cd extensions/chrome && npm run build                  # Build Chrome extension
cd extensions/firefox && npm run build                 # Build Firefox extension
cd extensions/safari && npm run build                  # Build Safari extension
```

### Testing Commands
```bash
# Run WASM tests
cd wasm && cargo test --lib

# Run shared package tests
cd shared && npm test

# Run extension tests
cd extensions/chrome && npm test
cd extensions/firefox && npm test
cd extensions/safari && npm test

# Run E2E tests
cd tests && npm run test:e2e
```

### Linting and Formatting
```bash
# Lint and format shared package
cd shared && npm run lint && npm run format

# Lint and format extensions
cd extensions/chrome && npm run lint && npm run format
cd extensions/firefox && npm run lint && npm run format
cd extensions/safari && npm run lint && npm run format

# Type checking
cd shared && npm run type-check
cd extensions/chrome && npm run type-check
```

## CI/CD Local Testing

### Run CI Pipeline Locally
```bash
# Install dependencies
npm install

# Run full CI pipeline
cd wasm && cargo test --lib && cd ..
cd shared && npm run build && npm test && cd ..
cd extensions/chrome && npm run build && npm test && cd ../..
```

### Docker Development
```bash
# Build development container
docker build -f Dockerfile.dev -t squarex-dev .

# Run development environment
docker run -it --rm -v $(pwd):/app squarex-dev

# Run tests in container
docker run --rm -v $(pwd):/app squarex-dev npm test
```

## Project Structure

```
├── package.json              # Root workspace configuration
├── pnpm-workspace.yaml       # Workspace package definitions
├── wasm/                     # Rust WASM module for analysis
│   ├── Cargo.toml           # Rust package configuration
│   ├── src/lib.rs           # Main WASM bindings
│   ├── src/analysis/        # Analysis algorithms
│   └── pkg/                 # Generated WASM files
├── shared/                   # Shared TypeScript utilities
│   ├── package.json         # TypeScript package
│   ├── src/                 # Source code
│   └── dist/                # Compiled output
├── extensions/              # Browser extension implementations
│   ├── chrome/              # Chrome extension (Manifest V3)
│   │   ├── package.json     # Extension config
│   │   ├── webpack.config.js # Build config
│   │   ├── src/             # Extension source
│   │   └── dist/            # Built extension
│   ├── firefox/             # Firefox extension (WebExtensions)
│   └── safari/              # Safari extension (App Extensions)
├── tests/                   # Test suite and test files
├── test-page/               # Test page for demonstration
│   └── index.html           # Simple test interface
├── diagrams/                # Architecture and flow diagrams
│   ├── architecture-overview.md
│   ├── wasm-module-architecture.md
│   ├── extension-workflow.md
│   ├── build-pipeline.md
│   └── export-diagrams.sh
├── scripts/                 # Build and deployment scripts
└── docs/                    # Documentation
    ├── analysis.md          # Technical analysis and requirements
    ├── plan.md              # Project planning and architecture
    └── implementation-status.md # Current implementation status
```

## Architecture Diagrams

For visual understanding of the project architecture, see the [diagrams folder](diagrams/):

- **[Architecture Overview](diagrams/architecture-overview.md)** - High-level project structure and component relationships
- **[WASM Module Architecture](diagrams/wasm-module-architecture.md)** - Internal structure of the Rust analysis engine
- **[Browser Extension Workflow](diagrams/extension-workflow.md)** - File upload processing sequence
- **[Build Pipeline](diagrams/build-pipeline.md)** - Build process and dependency flow

Export diagrams to PNG/SVG: `./diagrams/export-diagrams.sh`

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
cd wasm && cargo clean
# Reinstall wasm-pack
cargo install wasm-pack --force
# Build WASM module
source "$HOME/.cargo/env" && wasm-pack build --target web
```

#### Extension Loading Issues
- Ensure manifest.json is valid for target browser
- Check browser console for errors
- Verify file permissions on extension directory

#### Test Failures
```bash
# Clear test cache
cd tests && npm run clean
# Reinstall Playwright browsers
npx playwright install
# Run WASM tests
cd ../wasm && cargo test --lib
```

### Getting Help
- Check [docs/analysis.md](docs/analysis.md) for technical details
- Review component-specific READMEs
- Open an issue with detailed error information

## Changelog

### [Unreleased]
- Safari extension implementation
- Performance optimizations
- Advanced analysis algorithms
- User interface enhancements

### [0.2.0] - 2025-08-11
- **Streaming Analysis Engine**: Complete WASM module with streaming analysis for large files
- **Comprehensive Test Suite**: 29 tests across all components (100% pass rate)
- **Firefox Extension**: Complete implementation with WebExtensions API
- **Interactive Test Page**: Browser-based testing environment for WASM module
- **API Documentation**: Complete reference with usage examples and TypeScript types
- **Configurable Analysis**: Runtime-configurable parameters (stopwords, thresholds, banned phrases)
- **Test Infrastructure**: Jest configurations with proper mocking for all packages

### [0.1.0] - 2025-08-10
- Initial project setup and monorepo structure
- WASM module architecture with core analysis algorithms
- Chrome extension implementation (Manifest V3)
- Cross-browser extension framework
- Build system configuration
- Architecture diagrams and documentation

## License

[License information to be added]
