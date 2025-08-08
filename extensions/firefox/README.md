# Firefox Extension

Firefox browser extension implementation using WebExtensions API.

## Overview

This extension implements the SquareX file scanning functionality for Firefox browsers using the WebExtensions API.

## Features

- **WebExtensions API**: Firefox extension standard
- **Background Scripts**: Persistent background processing
- **Content Scripts**: Dynamic UI injection and file monitoring
- **WASM Integration**: WebAssembly module loading and execution
- **File Upload Interception**: Automatic file scanning on upload

## Architecture

```
src/
├── manifest.json       # Extension manifest (WebExtensions)
├── background/         # Background scripts
│   └── background.js
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

- Firefox 57+ (for WebExtensions support)
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

### Loading in Firefox

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from `dist/firefox`

### Testing

```bash
# Unit tests
npm test

# E2E tests with Playwright
npm run test:e2e
```

## Manifest Configuration

Key WebExtensions features used:
- Background scripts for persistent processing
- Content security policy for WASM
- Host permissions for file access
- Content scripts for page interaction

## Browser Compatibility

- Firefox 57+
- Firefox ESR

## Firefox-Specific Considerations

- Different API patterns compared to Chrome
- Background script persistence model
- WASM loading differences
- Permission model variations

## Integration

- Uses shared utilities from `/shared/`
- Consumes WASM module from `/wasm/`
- Follows common extension patterns defined in `/shared/`
