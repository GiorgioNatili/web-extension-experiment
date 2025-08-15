# Chrome Extension Testing Guide

This guide explains how to test the SquareX Chrome extension with the provided test page.

## Prerequisites

1. **Chrome Browser** - Make sure you have Chrome installed
2. **Node.js** - For running the test server
3. **Built Extension** - The extension should be built with `pnpm --filter extensions-chrome build`

## Setup Instructions

### 1. Build the Extension

```bash
# Build the WASM module
pnpm --filter wasm build

# Build the Chrome extension
pnpm --filter extensions-chrome build
```

### 2. Start the Test Server

```bash
# Navigate to the tests directory
cd tests

# Start the test server
node serve-test.js
```

The server will start on `http://localhost:8080`

### 3. Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top right)
3. Click "Load unpacked"
4. Select the `extensions/chrome/dist` folder
5. The extension should appear in your extensions list

### 4. Test the Extension

1. Navigate to `http://localhost:8080/extension-test.html`
2. The test page should load with a file upload interface
3. Click "Check Extension Status" to verify the extension is loaded
4. Select a file to upload and test the scanning functionality

## Expected Behavior

### Extension Status
- **WASM Loaded**: The extension should show "WASM Loaded" when the WebAssembly module is successfully loaded
- **Extension Detected**: The test page should detect the extension and show "Extension detected and active!"

### File Scanning
- **File Selection**: When you select a file, it should show file details (name, size, type)
- **Scanning Process**: The extension should process the file and display results
- **Results Display**: Results should include:
  - File information
  - Threat detection
  - Warnings
  - Risk assessment

## Troubleshooting

### "WASM Not Loaded" Error

If you see "WASM Not Loaded":

1. **Check Extension Build**: Make sure the extension was built successfully
2. **Check WASM Files**: Verify that `wasm_bg.wasm` and `wasm.js` are in the `extensions/chrome/dist` folder
3. **Check Console**: Open Chrome DevTools (F12) and check the console for error messages
4. **Reload Extension**: Try reloading the extension in `chrome://extensions/`

### Extension Not Detected

If the test page doesn't detect the extension:

1. **Check Permissions**: Make sure the extension has permission to access `http://localhost:8080/*`
2. **Check Manifest**: Verify the manifest.json includes the correct host permissions
3. **Check Content Script**: Ensure the content script is running on the test page

### File Upload Not Working

If file upload doesn't trigger the extension:

1. **Check Content Script**: Verify the content script is injected on the page
2. **Check File Input**: Make sure the file input has the correct event listeners
3. **Check Console**: Look for JavaScript errors in the browser console

## Test Files

The following files are used for testing:

- `extension-test.html` - The main test page with file upload interface
- `serve-test.js` - Simple HTTP server to serve the test page
- `EXTENSION_TESTING.md` - This documentation

**Note**: These test files are excluded from git commits via `.gitignore` to keep them local to your development environment.

## Development Notes

- The extension uses a real WASM module for file analysis
- If WASM loading fails, it falls back to a mock implementation
- The test page simulates file scanning for demonstration purposes
- Real file analysis results will depend on the actual WASM module implementation
