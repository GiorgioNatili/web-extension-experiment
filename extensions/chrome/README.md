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
pnpm install

# Development build with watch mode
pnpm dev:ext:chrome

# Production build
pnpm build:ext:chrome

# Clean build artifacts
pnpm clean:ext:chrome

# Build with specific environment
pnpm build:ext:chrome:dev    # Development build
pnpm build:ext:chrome:prod   # Production build
pnpm build:ext:chrome:debug  # Debug build
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
4. Select the `dist/chrome` directory
5. The extension should appear in your extensions list

### Testing

```bash
# Run all tests
pnpm test:ext:chrome

# Run specific test suites
pnpm test:ext:chrome:unit      # Unit tests
pnpm test:ext:chrome:integration # Integration tests
pnpm test:ext:chrome:e2e       # End-to-end tests

# Test with Playwright
pnpm test:e2e:chrome

# Run tests in watch mode
pnpm test:ext:chrome:watch

# Test extension loading
pnpm test:ext:chrome:load
```

### Development Workflow

```bash
# Start development server
pnpm dev:ext:chrome

# Run tests in watch mode
pnpm test:ext:chrome:watch

# Check code quality
pnpm lint:ext:chrome
pnpm format:ext:chrome

# Type checking
pnpm type-check:ext:chrome

# Bundle analysis
pnpm analyze:ext:chrome
```

### Manual Testing

1. **Load Extension**:
   - Follow loading instructions above
   - Check extension appears in Chrome toolbar

2. **Test File Upload**:
   - Navigate to `http://localhost:8080/test_page.html`
   - Select a `.txt` file for upload
   - Verify analysis results appear

3. **Test Different File Types**:
   - Try various `.txt` files (small, large, with banned phrases, etc.)
   - Verify correct allow/block decisions

4. **Test Browser Integration**:
   - Check background service worker is running
   - Verify content scripts inject properly
   - Test popup functionality

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
pnpm validate:ext:chrome:manifest

# Clear Chrome extension cache
# Navigate to chrome://extensions/
# Click "Remove" and reload

# Check for build errors
pnpm build:ext:chrome:debug
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
