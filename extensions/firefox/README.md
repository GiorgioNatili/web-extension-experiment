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

## Build & Test

### Prerequisites

- **Firefox** 57+ (for WebExtensions support)
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
pnpm dev:ext:firefox

# Production build
pnpm build:ext:firefox

# Clean build artifacts
pnpm clean:ext:firefox

# Build with specific environment
pnpm build:ext:firefox:dev    # Development build
pnpm build:ext:firefox:prod   # Production build
pnpm build:ext:firefox:debug  # Debug build
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

### Loading in Firefox

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" tab
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from `dist/firefox`
5. The extension should appear in your add-ons list

### Testing

```bash
# Run all tests
pnpm test:ext:firefox

# Run specific test suites
pnpm test:ext:firefox:unit      # Unit tests
pnpm test:ext:firefox:integration # Integration tests
pnpm test:ext:firefox:e2e       # End-to-end tests

# Test with Playwright
pnpm test:e2e:firefox

# Run tests in watch mode
pnpm test:ext:firefox:watch

# Test extension loading
pnpm test:ext:firefox:load
```

### Development Workflow

```bash
# Start development server
pnpm dev:ext:firefox

# Run tests in watch mode
pnpm test:ext:firefox:watch

# Check code quality
pnpm lint:ext:firefox
pnpm format:ext:firefox

# Type checking
pnpm type-check:ext:firefox

# Bundle analysis
pnpm analyze:ext:firefox
```

### Manual Testing

1. **Load Extension**:
   - Follow loading instructions above
   - Check extension appears in Firefox toolbar

2. **Test File Upload**:
   - Navigate to `http://localhost:8080/test_page.html`
   - Select a `.txt` file for upload
   - Verify analysis results appear

3. **Test Different File Types**:
   - Try various `.txt` files (small, large, with banned phrases, etc.)
   - Verify correct allow/block decisions

4. **Test Browser Integration**:
   - Check background script is running
   - Verify content scripts inject properly
   - Test popup functionality

### Debugging

```bash
# Enable debug logging
pnpm debug:ext:firefox

# Open Firefox DevTools for extension
# Navigate to about:debugging
# Click "Inspect" for background script
# Or inspect popup/options pages

# Check extension logs
pnpm logs:ext:firefox
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

## Troubleshooting

### Common Issues

#### Extension Won't Load
```bash
# Check manifest.json syntax
pnpm validate:ext:firefox:manifest

# Clear Firefox add-on cache
# Navigate to about:debugging
# Click "Remove" and reload

# Check for build errors
pnpm build:ext:firefox:debug
```

#### Background Script Issues
```bash
# Check background script status
# Navigate to about:debugging
# Click "Inspect" for background script

# Restart background script
# Click "Reload" in about:debugging

# Check console for errors
pnpm logs:ext:firefox:background
```

#### Content Script Issues
```bash
# Verify content script injection
# Check browser console on test page

# Test content script manually
pnpm test:ext:firefox:content-script

# Check permissions
pnpm validate:ext:firefox:permissions
```

#### WASM Loading Issues
```bash
# Check WASM compatibility
pnpm test:ext:firefox:wasm

# Verify WASM module path
pnpm validate:ext:firefox:wasm-path

# Test WASM in Firefox
pnpm test:ext:firefox:wasm-compatibility
```

### Getting Help
- Check Firefox DevTools console for errors
- Review extension background script logs
- Verify WASM module loading
- Check [docs/analysis.md](../../docs/analysis.md) for technical details
