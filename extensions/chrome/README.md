# Chrome Extension

Chrome browser extension implementation using Manifest V3.

## Overview

This extension implements the SquareX file scanning functionality for Chrome browsers using the latest Manifest V3 specification.

## Planned Role

### Core Responsibilities
- **File Upload Detection**: Monitor and intercept file upload events on web pages
- **UI Injection**: Dynamically inject analysis results into pages without modifying existing HTML
- **Background Processing**: Service worker for file processing and WASM coordination
- **User Interaction**: Handle user feedback and extension controls

### Technical Architecture
- **Manifest V3**: Latest Chrome extension manifest with service workers
- **Content Scripts**: Isolated content scripts for page interaction
- **Service Workers**: Background processing and state management with streaming protocol
- **WASM Integration**: Load and manage WASM module lifecycle
- **Streaming Protocol**: INIT/CHUNK/FINALIZE with backpressure control

### Browser-Specific Features
- **Service Worker Persistence**: Persistent background processing
- **Declarative Content Scripts**: Automatic injection based on URL patterns
- **Chrome APIs**: Native Chrome extension APIs for file access
- **Security Model**: Manifest V3 security constraints and CSP

## Features

- **Manifest V3**: Latest Chrome extension manifest version
- **Service Workers**: Background processing with service workers
- **Content Scripts**: Dynamic UI injection and file monitoring
- **WASM Integration**: WebAssembly module loading and execution
- **File Upload Interception**: Automatic file scanning on upload
- **Streaming Analysis**: Large file processing with chunk-based streaming
- **Backpressure Control**: Automatic flow control to prevent memory issues
- **Performance Monitoring**: Real-time performance metrics and optimization

## Architecture

### Purpose
The Chrome extension implements the SquareX file scanning functionality using Manifest V3, providing a modern, secure, and performant browser extension that integrates seamlessly with Chrome's extension ecosystem.

For a visual representation of the extension workflow, see the [Browser Extension Workflow diagram](../../../diagrams/extension-workflow.md).

### Service Worker Lifecycle

The service worker implements a sophisticated streaming protocol for handling large file analysis:

#### Lifecycle Events
- **Installation**: Initializes storage with default settings and configuration
- **Startup**: Loads streaming operation manager and starts cleanup intervals
- **Update**: Handles extension updates and reloads service worker
- **Shutdown**: Cleans up resources and destroys operation managers

#### Streaming Protocol
The service worker implements the `INIT/CHUNK/FINALIZE` protocol:

1. **STREAM_INIT**: Initialize streaming operation with file metadata and configuration
2. **STREAM_CHUNK**: Process individual chunks with backpressure control
3. **STREAM_FINALIZE**: Complete analysis and return final results

#### Backpressure Control
- **Queue Management**: Limits concurrent operations (default: 3)
- **Memory Protection**: Pauses processing when memory usage is high
- **Timeout Handling**: 30-second timeout for chunk processing
- **Automatic Cleanup**: Removes stale operations every 5 minutes

#### Configuration
- **Max File Size**: 100MB limit for file processing
- **Chunk Size**: 1MB chunks for optimal memory usage
- **Timeout**: 30 seconds for operation completion
- **Concurrent Operations**: 3 simultaneous operations
- **Queue Size**: 10 operations in queue
- **Processing Rate**: 5 chunks per second

### File Layout
```
extensions/chrome/
├── package.json            # Node.js package configuration
├── webpack.config.js       # Webpack build configuration
├── tsconfig.json           # TypeScript configuration
├── src/
│   ├── manifest.json       # Extension manifest (Manifest V3)
│   ├── background/         # Service worker background script
│   │   └── service-worker.ts  # Streaming protocol implementation
│   ├── content/            # Content scripts
│   │   ├── content.ts      # Main content script
│   │   └── ui.ts          # UI injection logic
│   ├── popup/             # Extension popup
│   │   ├── popup.html
│   │   ├── popup.ts
│   │   └── popup.css
│   ├── options/           # Options page
│   │   ├── options.html
│   │   ├── options.ts
│   │   └── options.css
│   └── assets/            # Icons and other assets
├── dist/                  # Built extension files
├── __tests__/             # Extension-specific tests
│   ├── service-worker.test.ts  # Service worker streaming tests
│   └── content.test.ts    # Content script tests
└── tests/                 # Additional test files
```

## Build & Test

### Prerequisites

- **Chrome** 88+ (for Manifest V3 support)
- **Node.js** 18+ and **pnpm** 8+
  ```bash
  # Install Node.js from https://nodejs.org/
  npm install -g pnpm
  ```

- **Webpack** and build tools
  ```bash
  # Install project dependencies
  pnpm install
  ```

### Build Commands

```bash
# Install dependencies
npm install

# Development build with watch mode
npm run build:watch

# Production build
npm run build

# Clean build artifacts
npm run clean

# Build with specific environment
npm run build:dev    # Development build
npm run build        # Production build
```

### Manual Build Commands

```bash
# Development build
npm run build:dev

# Production build
npm run build:prod

# Watch mode
npm run watch

# Bundle analysis
npm run analyze
```

### Loading in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extensions/chrome/dist/` directory
5. The extension should appear in your extensions list

### Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit      # Unit tests
npm run test:integration # Integration tests
npm run test:e2e       # End-to-end tests

# Test with Playwright
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Test extension loading
npm run test:load
```

### Development Workflow

```bash
# Start development server
npm run build:watch

# Run tests in watch mode
npm run test:watch

# Check code quality
npm run lint
npm run format

# Type checking
npm run type-check
```

### Manual Testing

1. **Load Extension**:
   - Follow loading instructions above
   - Check extension appears in Chrome toolbar

2. **Test File Upload**:
   - Navigate to `http://localhost:8080`
   - Select a `.txt` file for upload
   - Verify analysis results appear

3. **Test Different File Types**:
   - Try various `.txt` files (small, large, with banned phrases, etc.)
   - Verify correct allow/block decisions

4. **Test Browser Integration**:
   - Check background service worker is running
   - Verify content scripts inject properly
   - Test popup functionality

5. **Test Streaming Protocol**:
   - Upload large files (>10MB) to test streaming
   - Monitor service worker logs for chunk processing
   - Verify backpressure control with multiple concurrent uploads
   - Check timeout handling with slow processing

6. **Test Performance**:
   - Monitor memory usage during large file processing
   - Verify cleanup of completed operations
   - Test concurrent operation limits

### Debugging

```bash
# Enable debug logging
pnpm debug:ext:chrome

# Open Chrome DevTools for extension
# Navigate to chrome://extensions/
# Click "service worker" link for background script
# Or inspect popup/options pages

# Check extension logs
pnpm logs:ext:chrome
```

## Manifest Configuration

Key Manifest V3 features used:
- Service workers for background processing
- Content security policy for WASM
- Host permissions for file access
- Declarative content scripts

## Browser Compatibility

- Chrome 88+
- Edge 88+ (Chromium-based)

## Integration

- Uses shared utilities from `/shared/`
- Consumes WASM module from `/wasm/`
- Follows common extension patterns defined in `/shared/`

## Troubleshooting

### Common Issues

#### Extension Won't Load
```bash
# Check manifest.json syntax
npm run build

# Clear Chrome extension cache
# Navigate to chrome://extensions/
# Click "Remove" and reload

# Check for build errors
npm run build
```

#### Service Worker Issues
```bash
# Check service worker status
# Navigate to chrome://extensions/
# Click "service worker" link

# Restart service worker
# Click "Update" in chrome://extensions/

# Check console for errors
pnpm logs:ext:chrome:service-worker
```

#### Content Script Issues
```bash
# Verify content script injection
# Check browser console on test page

# Test content script manually
pnpm test:ext:chrome:content-script

# Check permissions
pnpm validate:ext:chrome:permissions
```

### Getting Help
- Check Chrome DevTools console for errors
- Review extension background page logs
- Verify WASM module loading
- Check [docs/analysis.md](../../docs/analysis.md) for technical details
