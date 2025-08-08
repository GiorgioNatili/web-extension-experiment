# Shared Utilities

Common utilities, types, and interfaces shared across all browser extensions.

## Overview

This module contains shared code that is used by all browser extensions, providing a consistent interface and common functionality.

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

## Development

### Prerequisites

- TypeScript 5.0+
- Node.js 18+

### Build Commands

```bash
# Install dependencies
npm install

# Type checking
npm run type-check

# Build
npm run build

# Watch mode
npm run watch
```

### Testing

```bash
# Unit tests
npm test

# Type checking
npm run type-check
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

## Versioning

This module follows semantic versioning and should maintain backward compatibility across extension versions.
