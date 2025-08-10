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

### Purpose
The WASM module serves as the core analysis engine for the browser extension, providing high-performance security scanning capabilities through WebAssembly. It implements all analysis algorithms in Rust for optimal performance and memory efficiency.

### File Layout
```
wasm/
├── Cargo.toml              # Rust package configuration
├── package.json            # Node.js package configuration
├── src/
│   ├── lib.rs              # Main library entry point and WASM bindings
│   ├── analysis/           # Analysis algorithms
│   │   ├── mod.rs          # Analysis module exports
│   │   ├── frequency.rs    # Word frequency analysis
│   │   ├── phrases.rs      # Banned phrase detection
│   │   ├── pii.rs          # PII pattern detection
│   │   └── entropy.rs      # Entropy calculation
│   ├── utils/              # Utility functions
│   │   ├── mod.rs          # Utils module exports
│   │   ├── text.rs         # Text processing utilities
│   │   └── stream.rs       # Streaming utilities
│   └── types.rs            # Shared types and structures
├── tests/                  # Rust unit tests
├── benches/                # Performance benchmarks
└── pkg/                    # Generated WASM package (build output)
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
npm install

# Build for web (production)
source "$HOME/.cargo/env" && wasm-pack build --target web

# Build for testing (Node.js target)
source "$HOME/.cargo/env" && wasm-pack build --target nodejs

# Development build with watch mode
source "$HOME/.cargo/env" && wasm-pack build --target web --dev --watch

# Clean build artifacts
cargo clean && rm -rf pkg/
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
cargo test --lib

# Run Rust unit tests
cargo test

# Run WASM tests in browsers
source "$HOME/.cargo/env" && wasm-pack test --headless --firefox
source "$HOME/.cargo/env" && wasm-pack test --headless --chrome

# Run specific test suites
cargo test --lib tests::test_entropy_calculation
cargo test --lib tests::test_banned_phrases
cargo test --lib tests::test_pii_detection
cargo test --lib tests::test_word_frequency
```

### Development Workflow

```bash
# Start development server
source "$HOME/.cargo/env" && wasm-pack build --target web --dev --watch

# Run tests in watch mode
cargo watch -x test

# Check code quality
cargo clippy
cargo fmt

# Type checking
cargo check
```

### Performance Testing

```bash
# Run benchmarks (when implemented)
cargo bench

# Profile WASM performance
cargo build --release && wasm-pack build --target web --release

# Memory usage analysis
cargo build --release && wasm-pack build --target web --release
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
import init, { WasmModule } from './pkg/wasm.js';

// Initialize WASM
await init();

// Create WASM module instance
const wasmModule = new WasmModule();

// Analyze file content
const result = wasmModule.analyze_file(fileContent);
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

# Build with verbose output
source "$HOME/.cargo/env" && wasm-pack build --target web --verbose
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
