# Shared Utilities

Common utilities, types, and interfaces shared across all browser extensions.

## Overview

This module contains shared code that is used by all browser extensions, providing a consistent interface and common functionality.

## Planned Role

### Core Responsibilities
- **Cross-browser Abstraction**: Provide consistent APIs across Chrome, Firefox, and Safari
- **Type Definitions**: Common TypeScript interfaces and types for all components
- **WASM Interface**: Standardized interface for WASM module interaction
- **Utility Functions**: Common helper functions and validation logic

### Technical Architecture
- **TypeScript Implementation**: Type-safe interfaces and utilities
- **Browser Abstraction Layer**: Platform-specific implementations
- **Shared Constants**: Configuration and message constants
- **Validation Logic**: Common validation and error handling

### Integration Points
- **Extension Integration**: Used by all browser extensions
- **WASM Integration**: Provides interface for WASM module communication
- **UI Integration**: Shared UI utilities and components
- **Testing Integration**: Common test utilities and mocks

## Features

- **Type Definitions**: Common TypeScript interfaces and types
- **WASM Interface**: Standardized interface for WASM module interaction
- **Browser Abstractions**: Cross-browser compatibility layers
- **Utility Functions**: Common helper functions
- **Constants**: Shared configuration and constants

## Architecture

```
src/
├── types/           # TypeScript type definitions
│   ├── analysis.ts  # Analysis result types
│   ├── browser.ts   # Browser-specific types
│   └── common.ts    # Common interfaces
├── wasm/           # WASM integration utilities
│   ├── interface.ts # WASM module interface
│   └── loader.ts    # WASM loading utilities
├── browser/        # Browser abstraction layer
│   ├── chrome.ts   # Chrome-specific implementations
│   ├── firefox.ts  # Firefox-specific implementations
│   └── safari.ts   # Safari-specific implementations
├── utils/          # Utility functions
│   ├── file.ts     # File handling utilities
│   ├── ui.ts       # UI utilities
│   └── validation.ts # Validation functions
└── constants/      # Shared constants
    ├── config.ts   # Configuration constants
    └── messages.ts # Message constants
```

## Build & Test

### Prerequisites

- **TypeScript** 5.0+
- **Node.js** 18+ and **pnpm** 8+
  ```bash
  # Install Node.js from https://nodejs.org/
  npm install -g pnpm
  ```

### Build Commands

```bash
# Install dependencies
pnpm install

# Development build with watch mode
pnpm dev:shared

# Production build
pnpm build:shared

# Clean build artifacts
pnpm clean:shared

# Type checking
pnpm type-check:shared

# Build with specific environment
pnpm build:shared:dev    # Development build
pnpm build:shared:prod   # Production build
pnpm build:shared:debug  # Debug build
```

### Manual Build Commands

```bash
# Type checking
npm run type-check

# Build
npm run build

# Watch mode
npm run watch

# Bundle analysis
npm run analyze
```

### Testing

```bash
# Run all tests
pnpm test:shared

# Run specific test suites
pnpm test:shared:unit      # Unit tests
pnpm test:shared:integration # Integration tests
pnpm test:shared:types     # Type checking tests

# Run tests in watch mode
pnpm test:shared:watch

# Test browser compatibility
pnpm test:shared:browser-compat
```

### Development Workflow

```bash
# Start development server
pnpm dev:shared

# Run tests in watch mode
pnpm test:shared:watch

# Check code quality
pnpm lint:shared
pnpm format:shared

# Type checking
pnpm type-check:shared

# Bundle analysis
pnpm analyze:shared
```

### Manual Testing

1. **Type Checking**:
   ```bash
   # Verify TypeScript compilation
   pnpm type-check:shared
   
   # Check for type errors
   pnpm test:shared:types
   ```

2. **Unit Tests**:
   ```bash
   # Run utility function tests
   pnpm test:shared:unit
   
   # Test browser abstractions
   pnpm test:shared:browser
   ```

3. **Integration Tests**:
   ```bash
   # Test WASM interface
   pnpm test:shared:wasm
   
   # Test cross-browser compatibility
   pnpm test:shared:compatibility
   ```

## Key Interfaces

### Analysis Results

```typescript
interface AnalysisResult {
  topWords: Array<{ word: string; count: number }>;
  bannedPhrases: Array<{ phrase: string; count: number }>;
  piiPatterns: Array<{ pattern: string; count: number }>;
  entropy: number;
  isObfuscated: boolean;
  decision: 'allow' | 'block';
  reason: string;
}
```

### WASM Interface

```typescript
interface WASMModule {
  analyzeFile(content: string): AnalysisResult;
  calculateEntropy(text: string): number;
  findBannedPhrases(text: string): string[];
  findPIIPatterns(text: string): string[];
  getTopWords(text: string, count: number): Array<{ word: string; count: number }>;
}
```

## Browser Compatibility

Provides abstraction layers for:
- Chrome (Manifest V3)
- Firefox (WebExtensions)
- Safari (App Extensions)

## Integration

Used by all browser extensions:
- [Chrome Extension](extensions/chrome/README.md)
- [Firefox Extension](extensions/firefox/README.md)
- [Safari Extension](extensions/safari/README.md)

## Troubleshooting

### Common Issues

#### Type Errors
```bash
# Check TypeScript configuration
pnpm validate:shared:typescript

# Update type definitions
pnpm update:shared:types

# Check for breaking changes
pnpm test:shared:breaking-changes
```

#### Build Failures
```bash
# Clear build cache
pnpm clean:shared

# Check dependencies
pnpm validate:shared:dependencies

# Reinstall dependencies
pnpm install --force
```

#### Browser Compatibility Issues
```bash
# Test browser abstractions
pnpm test:shared:browser-compat

# Check API differences
pnpm validate:shared:api-compat

# Update browser implementations
pnpm update:shared:browser-apis
```

### Getting Help
- Check TypeScript compiler output
- Review browser compatibility matrix
- Verify interface implementations
- Check [docs/analysis.md](../docs/analysis.md) for technical details

## Versioning

This module follows semantic versioning and should maintain backward compatibility across extension versions.
