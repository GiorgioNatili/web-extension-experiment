# Shared Utilities

Common utilities, types, interfaces, and schema definitions shared across all browser extensions.

## Overview

This module contains shared code that is used by all browser extensions, providing a consistent interface, common functionality, and comprehensive schema validation using Zod.

## Planned Role

### Core Responsibilities
- **Cross-browser Abstraction**: Provide consistent APIs across Chrome, Firefox, and Safari
- **Type Definitions**: Common TypeScript interfaces and types for all components
- **Schema Validation**: Comprehensive Zod schemas for runtime type safety
- **WASM Interface**: Standardized interface for WASM module interaction
- **Utility Functions**: Common helper functions and validation logic

### Technical Architecture
- **TypeScript Implementation**: Type-safe interfaces and utilities
- **Zod Schema Validation**: Runtime type safety and validation
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
- **Schema Validation**: Comprehensive Zod schemas for runtime validation
- **WASM Interface**: Standardized interface for WASM module interaction
- **Browser Abstractions**: Cross-browser compatibility layers
- **Utility Functions**: Common helper functions
- **Constants**: Shared configuration and constants

## Architecture

### Purpose
The shared utilities package provides common code, types, and interfaces used across all browser extensions. It ensures consistency and reduces code duplication while providing cross-browser abstraction layers.

For a visual representation of how shared utilities fit into the overall architecture, see the [Architecture Overview diagram](../../diagrams/architecture-overview.md).

## Schema Documentation

The shared package provides comprehensive schema definitions and validation using Zod for runtime type safety across all browser extensions.

### Core Analysis Schemas

#### `WasmAnalysisResult`
Complete analysis result from the WASM module with risk assessment and detailed findings.

```typescript
interface WasmAnalysisResult {
  risk_score: number;           // Overall risk score (0.0 - 1.0)
  decision: 'allow' | 'block';  // Final decision
  reasons: string[];            // List of reasons for the decision
  top_words: Array<[string, number]>;  // Word frequency analysis
  banned_phrases: BannedPhraseMatch[]; // Detected banned phrases
  pii_patterns: PIIPattern[];   // Detected PII patterns
  entropy: number;              // Calculated entropy value
  stats: ProcessingStats;       // Processing statistics
}
```

#### `BannedPhraseMatch`
Represents a detected banned phrase with context and severity information.

```typescript
interface BannedPhraseMatch {
  phrase: string;               // The banned phrase found
  position: number;             // Position in the text
  context: string;              // Context around the match
  severity: 'low' | 'medium' | 'high';  // Severity level
}
```

#### `PIIPattern`
Represents a detected Personally Identifiable Information pattern.

```typescript
interface PIIPattern {
  type: 'phone' | 'email' | 'ssn' | 'credit_card' | 'ip_address' | 'custom';
  pattern: string;              // The detected pattern
  position: number;             // Position in the text
  confidence: number;           // Confidence score (0.0 - 1.0)
  custom_regex?: string;        // Custom regex if applicable
}
```

### Configuration Schemas

#### `StreamingConfig`
Configuration for streaming analysis with customizable parameters.

```typescript
interface StreamingConfig {
  stopwords: string[];          // Words to exclude from analysis
  entropy_threshold: number;    // Obfuscation detection threshold
  risk_threshold: number;       // Blocking decision threshold
  max_words: number;            // Max words in frequency analysis
  banned_phrases: string[];     // Phrases to detect as banned
  custom_pii_patterns?: CustomPIIPattern[];  // Custom PII patterns
  chunk_size?: number;          // Processing chunk size
}
```

#### `CustomPIIPattern`
Custom PII detection pattern for extensible pattern matching.

```typescript
interface CustomPIIPattern {
  id: string;                   // Unique identifier
  name: string;                 // Human-readable name
  regex: string;                // Regular expression pattern
  type: 'phone' | 'email' | 'ssn' | 'credit_card' | 'ip_address' | 'custom';
  confidence: number;           // Confidence score
  enabled: boolean;             // Whether pattern is active
}
```

### Extension Communication Schemas

#### Message Types
All extension communication uses typed messages with validation:

```typescript
type MessageType = 
  | 'ANALYZE_FILE'           // File analysis request
  | 'ANALYSIS_PROGRESS'      // Progress update
  | 'ANALYSIS_COMPLETE'      // Analysis finished
  | 'ANALYSIS_ERROR'         // Error occurred
  | 'CONFIG_UPDATE'          // Configuration change
  | 'STATUS_REQUEST'         // Status inquiry
  | 'STATUS_RESPONSE';       // Status response
```

#### Base Message Interface
All messages extend this base interface:

```typescript
interface BaseMessage {
  id: string;                 // Unique message identifier
  type: MessageType;          // Message type
  timestamp: number;          // Creation timestamp
  source: string;             // Source extension ID
  target: string;             // Target extension ID
}
```

### Health and Status Schemas

#### `ExtensionHealth`
Comprehensive health monitoring for the extension.

```typescript
interface ExtensionHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  last_successful_analysis?: number;
  error_count_24h: number;
  wasm_status: 'loaded' | 'loading' | 'error';
  memory_usage_bytes: number;
  queue_length: number;
}
```

### Schema Usage Examples

#### Basic Validation
```typescript
import { validateWasmAnalysisResult, validateStreamingConfig } from '@shared/schema';

// Validate analysis result
const result = await wasmModule.analyzeFile(file);
const validatedResult = validateWasmAnalysisResult(result);

// Validate configuration
const config = { risk_threshold: 0.7, max_words: 50 };
const validatedConfig = validateStreamingConfig(config);
```

#### Message Validation
```typescript
import { validateAnalyzeFileMessage } from '@shared/schema';

// Validate incoming message
const message = { type: 'ANALYZE_FILE', file: fileInfo };
const validatedMessage = validateAnalyzeFileMessage(message);
```

#### Custom PII Pattern Creation
```typescript
import { validateCustomPIIPattern } from '@shared/schema';

const customPattern = {
  id: 'custom-phone',
  name: 'Custom Phone Format',
  regex: r'\\+1-\\d{3}-\\d{3}-\\d{4}',
  type: 'phone',
  confidence: 0.9,
  enabled: true
};

const validatedPattern = validateCustomPIIPattern(customPattern);
```

### Default Configurations

The schema provides sensible defaults for common use cases:

```typescript
// Default streaming configuration
const defaultConfig: StreamingConfig = {
  stopwords: ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of'],
  entropy_threshold: 4.0,
  risk_threshold: 0.6,
  max_words: 100,
  banned_phrases: ['confidential', 'secret', 'private', 'do not share'],
  chunk_size: 1024 * 1024 // 1MB
};

// Default PII patterns
const defaultPIIPatterns: CustomPIIPattern[] = [
  {
    id: 'us-phone',
    name: 'US Phone Number',
    regex: r'\\d{3}-\\d{3}-\\d{4}',
    type: 'phone',
    confidence: 0.9,
    enabled: true
  }
];
```

### Error Handling

All schema validations provide detailed error information:

```typescript
import { validateWasmAnalysisResult } from '@shared/schema';

try {
  const result = validateWasmAnalysisResult(data);
  // Use validated result
} catch (error) {
  if (error instanceof ZodError) {
    console.error('Validation failed:', error.errors);
    // Handle validation errors
  }
}
```

### File Layout
```
shared/
├── package.json            # Node.js package configuration
├── tsconfig.json           # TypeScript configuration
├── src/
│   ├── index.ts            # Main package exports
│   ├── schema.ts           # Comprehensive schema definitions and validators
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

# Run schema validation tests
npm test -- --testNamePattern="schema.test"

# Run protocol tests
npm test -- --testNamePattern="protocol.test"

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
   
   # Test schema validation
   npm test -- --testNamePattern="schema.test"
   ```

3. **Integration Tests**:
   ```bash
   # Test WASM interface
   npm run test:wasm
   
   # Test cross-browser compatibility
   npm run test:compatibility
   
   # Test protocol communication
   npm test -- --testNamePattern="protocol.test"
   ```

4. **Schema Validation Tests**:
   ```bash
   # Test all schema validations
   npm test -- --testNamePattern="schema"
   
   # Test specific schema types
   npm test -- --testNamePattern="WasmAnalysisResult"
   npm test -- --testNamePattern="StreamingConfig"
   npm test -- --testNamePattern="MessageTypes"
   ```

## Key Interfaces

### Analysis Results

```typescript
interface WasmAnalysisResult {
  risk_score: number;           // Overall risk score (0.0 - 1.0)
  decision: 'allow' | 'block';  // Final decision
  reasons: string[];            // List of reasons for the decision
  top_words: Array<[string, number]>;  // Word frequency analysis
  banned_phrases: BannedPhraseMatch[]; // Detected banned phrases
  pii_patterns: PIIPattern[];   // Detected PII patterns
  entropy: number;              // Calculated entropy value
  stats: ProcessingStats;       // Processing statistics
}
```

### WASM Interface

```typescript
interface WASMModule {
  analyzeFile(content: string): WasmAnalysisResult;
  calculateEntropy(text: string): number;
  findBannedPhrases(text: string): BannedPhraseMatch[];
  findPIIPatterns(text: string): PIIPattern[];
  getTopWords(text: string, count: number): Array<[string, number]>;
  
  // Streaming analysis
  initStreaming(): StreamingAnalyzer;
  processChunk(chunk: string): void;
  finalizeStreaming(): WasmAnalysisResult;
}
```

### Message Interface

```typescript
interface BaseMessage {
  id: string;                 // Unique message identifier
  type: MessageType;          // Message type
  timestamp: number;          // Creation timestamp
  source: string;             // Source extension ID
  target: string;             // Target extension ID
}
```

## Browser Compatibility

Provides abstraction layers for:
- Chrome (Manifest V3)
- Firefox (WebExtensions)
- Safari (App Extensions)

## Troubleshooting

### Schema Validation Issues

#### Common Validation Errors
```typescript
// Error: Invalid risk score
// Solution: Ensure risk_score is between 0.0 and 1.0
const result = { risk_score: 1.5 }; // ❌ Invalid
const result = { risk_score: 0.8 }; // ✅ Valid

// Error: Missing required fields
// Solution: Ensure all required fields are present
const message = { type: 'ANALYZE_FILE' }; // ❌ Missing id, timestamp, etc.
const message = { 
  id: 'msg-1', 
  type: 'ANALYZE_FILE', 
  timestamp: Date.now(),
  source: 'content-script',
  target: 'background'
}; // ✅ Valid
```

#### Debugging Schema Issues
```typescript
import { validateWasmAnalysisResult } from '@shared/schema';

try {
  const result = validateWasmAnalysisResult(data);
} catch (error) {
  if (error instanceof ZodError) {
    // Log detailed validation errors
    console.error('Validation failed:', error.errors);
    
    // Check specific field errors
    error.errors.forEach(err => {
      console.error(`Field: ${err.path.join('.')}`);
      console.error(`Error: ${err.message}`);
      console.error(`Received: ${err.received}`);
    });
  }
}
```

### Performance Issues

#### Large File Processing
- **Issue**: Schema validation slow for large files
- **Solution**: Use streaming validation for large datasets
- **Best Practice**: Validate chunks rather than entire files

#### Memory Usage
- **Issue**: High memory usage during validation
- **Solution**: Use lazy validation and cleanup
- **Best Practice**: Validate only when necessary

### Type Safety

#### TypeScript Integration
```typescript
// Ensure proper type inference
import type { WasmAnalysisResult, StreamingConfig } from '@shared/schema';

// Use type guards for runtime safety
import { isWasmAnalysisResult, isStreamingConfig } from '@shared/schema';

if (isWasmAnalysisResult(data)) {
  // TypeScript knows data is WasmAnalysisResult
  console.log(data.risk_score);
}
```

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
