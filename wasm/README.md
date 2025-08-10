# WASM Module

Rust-based WebAssembly module for file analysis and security scanning.

## Overview

This module implements the core analysis algorithms in Rust and compiles to WebAssembly for high-performance execution in the browser.

## Planned Role

### Core Responsibilities
- **Analysis Engine**: Implement all security analysis algorithms (word frequency, banned phrases, PII detection, entropy calculation)
- **Performance Optimization**: High-performance processing for large files (up to several GB)
- **Memory Management**: Efficient streaming and chunked processing
- **Plugin Architecture**: Extensible plugin system for future analysis rules

### Technical Architecture
- **Rust Implementation**: Core algorithms written in Rust for performance
- **WASM Compilation**: Compiled to WebAssembly for browser execution
- **Streaming Processing**: Chunked file processing (1MB chunks)
- **Parallel Processing**: Web Workers integration for CPU-intensive tasks

### Integration Points
- **Extension Integration**: Consumed by all browser extensions via shared interface
- **Background Processing**: Handled by background service workers
- **Real-time Analysis**: Provides incremental results during processing
- **Decision Engine**: Risk scoring and allow/block decisions

## Features

- **Word Frequency Analysis**: Identify top 10 most frequent words
- **Banned Phrase Detection**: Scan for "confidential" and "do not share"
- **PII Pattern Detection**: Identify 9-12 digit numeric patterns
- **Entropy Calculation**: Shannon entropy analysis for obfuscation detection
- **Large File Processing**: Stream-based processing for multi-GB files

## Architecture

```
src/
├── lib.rs          # Main library entry point
├── analysis/       # Analysis algorithms
│   ├── frequency.rs # Word frequency analysis
│   ├── phrases.rs   # Banned phrase detection
│   ├── pii.rs       # PII pattern detection
│   └── entropy.rs   # Entropy calculation
├── utils/          # Utility functions
└── types.rs        # Shared types and structures
```

## Build & Test

### Prerequisites

- **Rust** 1.70+
  ```bash
  # Install Rust from https://rustup.rs/
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  source ~/.cargo/env
  ```

- **wasm-pack**
  ```bash
  # Install wasm-pack
  cargo install wasm-pack
  ```

- **Node.js** 18+ and **pnpm** 8+
  ```bash
  # Install Node.js from https://nodejs.org/
  npm install -g pnpm
  ```

### Build Commands

```bash
# Install dependencies
pnpm install

# Build for web (production)
pnpm build:wasm

# Build for testing (Node.js target)
pnpm build:wasm:test

# Development build with watch mode
pnpm dev:wasm

# Clean build artifacts
pnpm clean:wasm
```

### Manual Build Commands

```bash
# Build for web targets
wasm-pack build --target web

# Build for node (testing)
wasm-pack build --target nodejs

# Build with optimizations
wasm-pack build --target web --release

# Build with debug info
wasm-pack build --target web --dev
```

### Testing

```bash
# Run all tests
pnpm test:wasm

# Run Rust unit tests
cargo test

# Run WASM tests in browsers
wasm-pack test --headless --firefox
wasm-pack test --headless --chrome

# Run specific test suites
pnpm test:wasm:unit      # Unit tests only
pnpm test:wasm:integration # Integration tests
pnpm test:wasm:benchmark # Performance tests

# Test with specific browsers
pnpm test:wasm:firefox
pnpm test:wasm:chrome
pnpm test:wasm:safari
```

### Development Workflow

```bash
# Start development server
pnpm dev:wasm

# Run tests in watch mode
pnpm test:wasm:watch

# Check code quality
pnpm lint:wasm
pnpm format:wasm

# Type checking
pnpm type-check:wasm
```

### Performance Testing

```bash
# Run benchmarks
pnpm benchmark:wasm

# Profile WASM performance
pnpm profile:wasm

# Memory usage analysis
pnpm analyze:wasm
```

## API Reference

[To be documented]

## Performance Considerations

- Memory-efficient streaming for large files
- Optimized algorithms for real-time analysis
- Minimal WASM bundle size

## Integration

This module is consumed by browser extensions through the shared interface defined in `/shared/`.

### Usage in Extensions

```javascript
// Import WASM module
import init, { analyzeFile } from './pkg/wasm_module.js';

// Initialize WASM
await init();

// Analyze file content
const result = analyzeFile(fileContent);
console.log(result);
```

## Troubleshooting

### Common Build Issues

#### WASM Build Failures
```bash
# Clear Rust cache
cargo clean

# Reinstall wasm-pack
cargo install wasm-pack --force

# Check Rust toolchain
rustup show
rustup update
```

#### Memory Issues
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Check WASM memory usage
pnpm analyze:wasm:memory
```

#### Browser Compatibility
```bash
# Test WASM support
pnpm test:wasm:compatibility

# Check browser WASM features
pnpm check:wasm:features
```

### Getting Help
- Check browser console for WASM loading errors
- Verify WASM module integrity
- Review [docs/analysis.md](../docs/analysis.md) for technical details
