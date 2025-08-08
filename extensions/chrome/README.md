# Chrome Extension

Chrome browser extension implementation using Manifest V3.

## Overview

This extension implements the SquareX file scanning functionality for Chrome browsers using the latest Manifest V3 specification.

## Features

- **Manifest V3**: Latest Chrome extension manifest version
- **Service Workers**: Background processing with service workers
- **Content Scripts**: Dynamic UI injection and file monitoring
- **WASM Integration**: WebAssembly module loading and execution
- **File Upload Interception**: Automatic file scanning on upload

## Architecture

```
src/
├── manifest.json       # Extension manifest (Manifest V3)
├── background/         # Service worker background script
│   └── service-worker.js
├── content/           # Content scripts
│   ├── content.js     # Main content script
│   └── ui.js         # UI injection logic
├── popup/            # Extension popup
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── options/          # Options page
│   ├── options.html
│   ├── options.js
│   └── options.css
└── assets/           # Icons and other assets
```

## Development

### Prerequisites

- Chrome 88+ (for Manifest V3 support)
- Node.js 18+
- Webpack for bundling

### Build Commands

```bash
# Install dependencies
npm install

# Development build
npm run build:dev

# Production build
npm run build:prod

# Watch mode
npm run watch
```

### Loading in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/chrome` directory

### Testing

```bash
# Unit tests
npm test

# E2E tests with Playwright
npm run test:e2e
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
