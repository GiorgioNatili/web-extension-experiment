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
# Navigate to the repository root and start a local server
python3 -m http.server 8080
```

The server will start on `http://localhost:8080`

### 3. Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top right)
3. Click "Load unpacked"
4. Select the `extensions/chrome/dist` folder
5. The extension should appear in your extensions list

### 4. Test the Extension

1. Navigate to `http://localhost:8080/tests/test-page.html`
2. The test page should load with a file upload interface
3. Optionally open the popup and try "Test WASM"
4. Select a file to upload and test the scanning functionality

## Expected Behavior

### Extension Status
- **WASM Loaded**: The popup or test page should indicate WASM is loaded
- **Extension Detected**: The test page detects the extension and shows active status

### File Scanning
- **File Selection**: Shows file details (name, size, type)
- **Scanning Process**: Progress and results appear
- **Results Display**: Decision (allow/block), reason, risk score, and metrics

### Risk Assessment Consistency
- **Cross-Browser Consistency**: Chrome and Firefox should return identical risk scores for the same content
- **HR/Performance Content**: Content with "development plan", "performance reviews", "self-evaluate" should trigger ~17% risk score
- **Risk Indicators**: Content with "gaps across people", "level up the whole team" should be detected as HR/performance content

## Troubleshooting

### "WASM Not Loaded" Error
1. Ensure `extensions/chrome/dist/wasm_bg.wasm` and `wasm.js` exist
2. Rebuild: `pnpm --filter wasm build && pnpm --filter extensions-chrome build`
3. Reload the extension in `chrome://extensions/`
4. Check the service worker console for errors

### Extension Not Detected / Upload Not Working
1. Ensure you are on `http://localhost:8080/*`
2. Check host permissions in manifest
3. Confirm content script is injected (console logs)

### Risk Assessment Inconsistency
1. **Different Risk Scores**: If Chrome and Firefox return different risk scores for the same content
   - Check that both extensions use the same normalization logic
   - Verify WASM result handling is consistent
   - Run risk assessment consistency tests: `pnpm --filter extensions-chrome test` and `pnpm --filter extensions-firefox test`
2. **Missing Risk Detection**: If HR/performance content isn't detected
   - Verify content contains expected keywords: "development plan", "performance reviews", "self-evaluate"
   - Check that WASM module is properly analyzing content
   - Ensure result normalization preserves risk_score field

---

# Firefox Extension Testing Guide

## Prerequisites
- **Firefox** installed
- **Node.js / Python** to serve test pages
- Built artifacts for Firefox

## Build
```bash
# From repo root
pnpm --filter wasm build
pnpm --filter extensions-firefox build
```

This produces `extensions/firefox/dist/` with:
- `background.js`, `content.js`, `popup.js`, `options.js`
- `manifest.json`
- `wasm_bg.wasm`, `wasm.js`

## Start test server
```bash
# From repo root
python3 -m http.server 8080
```
Test pages:
- `http://localhost:8080/tests/test-page.html`
- `http://localhost:8080/tests/test-wasm-loading.html`

## Load the extension
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on…"
3. Select `extensions/firefox/dist/manifest.json`
4. Verify it loads without errors

## Validate functionality
- Open the popup and click "Test WASM" to verify background WASM loading.
- Open the background console from `about:debugging` → Inspect to see logs.
- On the test page, select a `.txt` file; you should see progress and results. The content script bridge enables the isolation page to message the background.

## Run tests for Firefox
```bash
# Unit tests
pnpm --filter extensions-firefox test

# Risk assessment consistency tests
pnpm --filter extensions-firefox test --testNamePattern="Risk Assessment Consistency"

# E2E (Firefox only)
pnpm -C tests exec playwright test --project=firefox

# All E2E
pnpm --filter tests run test:e2e

# Show last report
pnpm -C tests exec playwright show-report
```

## Troubleshooting
- If popup "Test WASM" fails, check the background console for `[WASM]` logs.
- Ensure `wasm_bg.wasm` and `wasm.js` exist in `extensions/firefox/dist/`.
- Ensure test pages are served from `http://localhost:8080/*` so content scripts match the manifest.
- If test pages need to call the background, use the window.postMessage bridge (built into the content script).
- **Risk Assessment Issues**: If Firefox returns different risk scores than Chrome, check that the direct WASM interface is being used and result normalization is consistent.
