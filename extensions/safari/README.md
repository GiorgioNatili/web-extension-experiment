# Safari Extension

Safari browser extension implementation using App Extensions.

## Overview

This extension implements the SquareX file scanning functionality for Safari browsers using Apple's App Extensions framework.

## Features

- **App Extensions**: Safari extension standard
- **Content Scripts**: Dynamic UI injection and file monitoring
- **WASM Integration**: WebAssembly module loading and execution
- **File Upload Interception**: Automatic file scanning on upload
- **macOS Integration**: Native macOS app extension

## Architecture

```
src/
├── manifest.json       # Extension manifest (Safari App Extension)
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

- macOS 10.15+ (for Safari App Extensions)
- Safari 13+
- Xcode 12+
- Node.js 18+

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

### Loading in Safari

1. Build the extension using Xcode
2. Enable Safari App Extensions in Safari preferences
3. Install the extension from the macOS app
4. Enable the extension in Safari

### Testing

```bash
# Unit tests
npm test

# E2E tests with Playwright
npm run test:e2e
```

## Manifest Configuration

Key Safari App Extension features used:
- Content scripts for page interaction
- Content security policy for WASM
- Host permissions for file access
- Native macOS integration

## Browser Compatibility

- Safari 13+
- macOS 10.15+

## Safari-Specific Considerations

- Different extension model compared to Chrome/Firefox
- Requires macOS app wrapper
- WASM loading and security model differences
- Permission model variations
- App Store distribution requirements

## Integration

- Uses shared utilities from `/shared/`
- Consumes WASM module from `/wasm/`
- Follows common extension patterns defined in `/shared/`
