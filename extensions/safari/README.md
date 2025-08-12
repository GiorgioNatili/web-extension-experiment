# Safari Extension

Safari browser extension implementation using App Extensions.

## Overview

This extension implements the SquareX file scanning functionality for Safari browsers using Apple's App Extensions framework.

## Planned Role

### Core Responsibilities
- **File Upload Detection**: Monitor and intercept file upload events on web pages
- **UI Injection**: Dynamically inject analysis results into pages without modifying existing HTML
- **Background Processing**: Background scripts for file processing and WASM coordination
- **User Interaction**: Handle user feedback and extension controls

### Technical Architecture
- **App Extensions**: Safari extension standard with macOS app wrapper
- **Content Scripts**: Isolated content scripts for page interaction
- **Background Scripts**: Background processing (different model than Chrome/Firefox)
- **WASM Integration**: Load and manage WASM module lifecycle

### Browser-Specific Features
- **macOS Integration**: Native macOS app extension requirements
- **App Store Distribution**: App Store submission and review process
- **Safari Security Model**: Safari-specific security constraints
- **Background Processing**: Safari-specific background script limitations

## Features

- **App Extensions**: Safari extension standard
- **Content Scripts**: Dynamic UI injection and file monitoring
- **WASM Integration**: WebAssembly module loading and execution
- **File Upload Interception**: Automatic file scanning on upload
- **macOS Integration**: Native macOS app extension

## Architecture

### Purpose
The Safari extension implements the SquareX file scanning functionality using Apple's App Extensions framework, providing native macOS integration and App Store distribution capabilities while maintaining feature parity with other browser versions.

### File Layout
```
extensions/safari/
├── package.json            # Node.js package configuration
├── webpack.config.js       # Webpack build configuration
├── tsconfig.json           # TypeScript configuration
├── src/
│   ├── manifest.json       # Extension manifest (Safari App Extension)
│   ├── background/         # Background scripts
│   │   └── background.ts
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
└── tests/                 # Extension-specific tests
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
# From extension directory
cd extensions/safari

# Install dependencies
npm install

# Development build
npm run build:dev

# Production build
npm run build:prod

# Watch mode
npm run watch

# Bundle analysis
npm run analyze

# Clean build
npm run clean
```

### Build Output

After building, the extension files will be in:
- `extensions/safari/dist/` - Built extension files
- `extensions/safari/dist/manifest.json` - Extension manifest
- `extensions/safari/dist/background/` - Background scripts
- `extensions/safari/dist/content/` - Content scripts
- `extensions/safari/dist/popup/` - Popup interface
- `extensions/safari/dist/options/` - Options page

### Loading in Safari

#### Method 1: Development Loading (Recommended for Development)

1. **Build the Extension**:
   ```bash
   # Build the extension bundle
   pnpm build:ext:safari
   
   # Or from extension directory
   cd extensions/safari
   npm run build
   ```

2. **Enable Safari Developer Mode**:
   - Open Safari
   - Go to Safari > Settings > Advanced
   - Check "Show Develop menu in menu bar"

3. **Load the Extension**:
   - Go to Develop > Show Extension Builder
   - Click the "+" button to add a new extension
   - Select "Add Extension..."
   - Navigate to `extensions/safari/dist` and select the folder
   - Click "Select"

4. **Enable the Extension**:
   - In Extension Builder, click "Run" to load the extension
   - Go to Safari > Settings > Extensions
   - Find "SquareX File Scanner" and enable it

#### Method 2: Xcode Integration (For App Store Distribution)

1. **Create Xcode Project** (if not exists):
   ```bash
   # Create a new macOS app project in Xcode
   # Add Safari App Extension target
   # Point to the built extension files
   ```

2. **Build and Run**:
   - Open the Xcode project
   - Build and run the macOS app
   - The extension will be installed automatically

3. **Enable the Extension**:
   - Go to Safari > Settings > Extensions
   - Find your extension and enable it

#### Method 3: Manual Installation

1. **Build the Extension**:
   ```bash
   cd extensions/safari
   npm run build
   ```

2. **Package for Distribution**:
   ```bash
   # Create a .safariextz file (for older Safari versions)
   # Or use the built extension directly (Safari 13+)
   ```

3. **Install Extension**:
   - Double-click the `.safariextz` file, or
   - Drag the extension folder to Safari's Extensions preferences

### Verification

After loading, verify the extension is working:

1. **Check Extension Status**:
   - Go to Safari > Settings > Extensions
   - Ensure "SquareX File Scanner" is enabled
   - Check for any error messages

2. **Test Functionality**:
   - Navigate to a test page with file upload
   - Try uploading a file to test the extension
   - Check that the analysis UI appears

3. **Debug if Needed**:
   - Open Safari Web Inspector
   - Go to Develop > [Extension Name] > [Page]
   - Check console for any errors

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
