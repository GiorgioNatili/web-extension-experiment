# SquareX Browser Extension

A cross-browser extension for real-time file upload security scanning using WebAssembly.

## Project Overview

This project implements a browser extension that scans `.txt` files selected for upload and performs security analysis using WebAssembly (WASM). The extension supports Chrome, Firefox, and Safari with a modular architecture designed for extensibility.

For detailed technical analysis, requirements, and architecture decisions, see [docs/analysis.md](docs/analysis.md).

## Quick Start

```bash
# Install dependencies
npm install

# Build WASM module
npm run build:wasm

# Build extensions
npm run build:extensions

# Run tests
npm test
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

## License

[License information to be added]
