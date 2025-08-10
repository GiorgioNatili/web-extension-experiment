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

### Purpose
The shared utilities package provides common code, types, and interfaces used across all browser extensions. It ensures consistency and reduces code duplication while providing cross-browser abstraction layers.

### File Layout
```
shared/
├── package.json            # Node.js package configuration
├── tsconfig.json           # TypeScript configuration
├── src/
│   ├── index.ts            # Main package exports
│   ├── types/              # TypeScript type definitions
│   │   ├── analysis.ts     # Analysis result types
│   │   ├── browser.ts      # Browser-specific types
│   │   └── common.ts       # Common interfaces
│   ├── wasm/               # WASM integration utilities
│   │   ├── interface.ts    # WASM module interface
│   │   └── loader.ts       # WASM loading utilities
│   ├── browser/            # Browser abstraction layer
│   │   ├── chrome.ts       # Chrome-specific implementations
│   │   ├── firefox.ts      # Firefox-specific implementations
│   │   └── safari.ts       # Safari-specific implementations
│   ├── utils/              # Utility functions
│   │   ├── file.ts         # File handling utilities
│   │   ├── ui.ts           # UI utilities
│   │   └── validation.ts   # Validation functions
│   └── constants/          # Shared constants
│       ├── config.ts       # Configuration constants
│       └── messages.ts     # Message constants
├── dist/                   # Compiled JavaScript output
└── tests/                  # Unit tests
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
npm install

# Development build with watch mode
npm run dev

# Production build
npm run build

# Clean build artifacts
npm run clean

# Type checking
npm run type-check
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
npm test

# Run specific test suites
npm run test:unit      # Unit tests
npm run test:integration # Integration tests
npm run test:types     # Type checking tests

# Run tests in watch mode
npm run test:watch

# Test browser compatibility
npm run test:browser-compat
```

### Development Workflow

```bash
# Start development server
npm run dev

# Run tests in watch mode
npm run test:watch

# Check code quality
npm run lint
npm run format

# Type checking
npm run type-check
```

### Manual Testing

1. **Type Checking**:
   ```bash
   # Verify TypeScript compilation
   npm run type-check
   
   # Check for type errors
   npm run test:types
   ```

2. **Unit Tests**:
   ```bash
   # Run utility function tests
   npm run test:unit
   
   # Test browser abstractions
   npm run test:browser
   ```

3. **Integration Tests**:
   ```bash
   # Test WASM interface
   npm run test:wasm
   
   # Test cross-browser compatibility
   npm run test:compatibility
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
npm run type-check

# Update type definitions
npm run build

# Check for breaking changes
npm test
```

#### Build Failures
```bash
# Clear build cache
npm run clean

# Check dependencies
npm install

# Reinstall dependencies
npm install --force
```

#### Browser Compatibility Issues
```bash
# Test browser abstractions
npm run test:browser-compat

# Check API differences
npm run build

# Update browser implementations
npm run build
```

### Getting Help
- Check TypeScript compiler output
- Review browser compatibility matrix
- Verify interface implementations
- Check [docs/analysis.md](../docs/analysis.md) for technical details

## Versioning

This module follows semantic versioning and should maintain backward compatibility across extension versions.
