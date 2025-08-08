# WASM Module

Rust-based WebAssembly module for file analysis and security scanning.

## Overview

This module implements the core analysis algorithms in Rust and compiles to WebAssembly for high-performance execution in the browser.

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

## Development

### Prerequisites

- Rust 1.70+
- wasm-pack
- Node.js 18+

### Build Commands

```bash
# Install wasm-pack
cargo install wasm-pack

# Build for web
wasm-pack build --target web

# Build for node (testing)
wasm-pack build --target nodejs

# Run tests
cargo test
```

### Testing

```bash
# Unit tests
cargo test

# WASM tests
wasm-pack test --headless --firefox
wasm-pack test --headless --chrome
```

## API Reference

[To be documented]

## Performance Considerations

- Memory-efficient streaming for large files
- Optimized algorithms for real-time analysis
- Minimal WASM bundle size

## Integration

This module is consumed by browser extensions through the shared interface defined in `/shared/`.
