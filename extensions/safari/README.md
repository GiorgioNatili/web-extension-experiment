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

## Build & Test

### Prerequisites

- **macOS** 10.15+ (for Safari App Extensions)
- **Safari** 13+
- **Xcode** 12+
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
pnpm dev:ext:safari

# Production build
pnpm build:ext:safari

# Clean build artifacts
pnpm clean:ext:safari

# Build with specific environment
pnpm build:ext:safari:dev    # Development build
pnpm build:ext:safari:prod   # Production build
pnpm build:ext:safari:debug  # Debug build
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

### Loading in Safari

1. **Build the Extension**:
   ```bash
   # Build the extension bundle
   pnpm build:ext:safari
   
   # Open Xcode project (if applicable)
   open safari-extension.xcodeproj
   ```

2. **Enable Safari App Extensions**:
   - Open Safari
   - Go to Safari > Preferences > Advanced
   - Check "Show Develop menu in menu bar"

3. **Install the Extension**:
   - Build and run the macOS app in Xcode
   - The extension will be installed automatically

4. **Enable the Extension**:
   - Go to Safari > Preferences > Extensions
   - Find your extension and enable it

### Testing

```bash
# Run all tests
pnpm test:ext:safari

# Run specific test suites
pnpm test:ext:safari:unit      # Unit tests
pnpm test:ext:safari:integration # Integration tests
pnpm test:ext:safari:e2e       # End-to-end tests

# Test with Playwright
pnpm test:e2e:safari

# Run tests in watch mode
pnpm test:ext:safari:watch

# Test extension loading
pnpm test:ext:safari:load
```

### Development Workflow

```bash
# Start development server
pnpm dev:ext:safari

# Run tests in watch mode
pnpm test:ext:safari:watch

# Check code quality
pnpm lint:ext:safari
pnpm format:ext:safari

# Type checking
pnpm type-check:ext:safari

# Bundle analysis
pnpm analyze:ext:safari
```

### Manual Testing

1. **Load Extension**:
   - Follow loading instructions above
   - Check extension appears in Safari toolbar

2. **Test File Upload**:
   - Navigate to `http://localhost:8080/test_page.html`
   - Select a `.txt` file for upload
   - Verify analysis results appear

3. **Test Different File Types**:
   - Try various `.txt` files (small, large, with banned phrases, etc.)
   - Verify correct allow/block decisions

4. **Test Browser Integration**:
   - Check content scripts inject properly
   - Test popup functionality
   - Verify WASM module loading

### Debugging

```bash
# Enable debug logging
pnpm debug:ext:safari

# Open Safari Web Inspector for extension
# Go to Develop > [Your Extension Name] > [Page Name]
# Or inspect popup/options pages

# Check extension logs
pnpm logs:ext:safari
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

## Troubleshooting

### Common Issues

#### Extension Won't Load
```bash
# Check manifest.json syntax
pnpm validate:ext:safari:manifest

# Clear Safari extension cache
# Go to Safari > Preferences > Extensions
# Remove and reinstall extension

# Check for build errors
pnpm build:ext:safari:debug
```

#### Xcode Build Issues
```bash
# Clean Xcode build
# Product > Clean Build Folder in Xcode

# Check Xcode project settings
pnpm validate:ext:safari:xcode

# Verify code signing
pnpm validate:ext:safari:signing
```

#### Content Script Issues
```bash
# Verify content script injection
# Check Safari Web Inspector console

# Test content script manually
pnpm test:ext:safari:content-script

# Check permissions
pnpm validate:ext:safari:permissions
```

#### WASM Loading Issues
```bash
# Check WASM compatibility
pnpm test:ext:safari:wasm

# Verify WASM module path
pnpm validate:ext:safari:wasm-path

# Test WASM in Safari
pnpm test:ext:safari:wasm-compatibility
```

#### App Store Distribution
```bash
# Check App Store requirements
pnpm validate:ext:safari:app-store

# Verify extension bundle
pnpm validate:ext:safari:bundle

# Test distribution build
pnpm build:ext:safari:dist
```

### Getting Help
- Check Safari Web Inspector console for errors
- Review Xcode build logs
- Verify WASM module loading
- Check [docs/analysis.md](../../docs/analysis.md) for technical details
