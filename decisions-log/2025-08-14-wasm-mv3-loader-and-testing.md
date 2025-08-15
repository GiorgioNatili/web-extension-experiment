# WASM MV3 Loader, Streaming API Refactor, and Testing Decisions

**Date**: August 14, 2025  
**Commit**: `9ed1787`  
**Scope**: Chrome MV3 WASM loading, shared streaming API, popup/testing UX

## Context

- The extension was falling back to error recovery due to WASM failing to load in the Chrome MV3 service worker.  
- The shared WASM loader used `eval` of glue code, which violates MV3 CSP.  
- Test pages could not message the background directly (Extension ID required), and result shapes between Rust glue and TS expectations were mismatched.

## Decisions

### 1) MV3‑safe WASM loading
**Decision**: Replace `eval` with dynamic ESM import of the wasm‑bindgen glue using URL and initialize with explicit `wasm_bg.wasm` URL.

**Rationale**:
- MV3 service workers disallow `eval`/`new Function`.  
- URL‐based dynamic import is CSP‑compatible and supported.  
- Keeps a single code path working across Chrome, Firefox, and Safari.

**Implementation**:
- `shared/src/wasm/loader.ts`: `import(/* webpackIgnore: true */ chrome.runtime.getURL('wasm.js'))` then `await wasmNs.default(chrome.runtime.getURL('wasm_bg.wasm'))`.
- Non‑extension env: `import('../../../wasm/pkg/wasm.js')` then `await default()`.

### 2) Stable streaming API handle
**Decision**: Expose a handle‑based API from the shared loader.

**Rationale**:
- Encapsulates the wasm module instance and analyzer together.  
- Clear cross‑browser contract for streaming.

**API**:
- `createStreamingAnalyzer(config?) -> handle`  
- `processChunk(handle, chunk)`  
- `finalizeStreaming(handle) -> normalized result`  
- `getStreamingStats(handle)`

### 3) Normalize finalize result shape
**Decision**: Map wasm snake_case fields to camelCase expected by UI.

**Rationale**:
- Avoids UI errors like reading `decision` on `undefined`.  
- Provides consistent output across environments.

**Fields**: `topWords`, `bannedPhrases`, `piiPatterns`, `entropy`, `isObfuscated`, `decision`, `reason`, `riskScore`.

### 4) Testing and diagnostics
**Decision**: Add popup "Test WASM" trigger and content‑script message bridge for test pages.

**Rationale**:
- Enables isolated WASM loading verification from UI.  
- Allows test pages to communicate without an Extension ID.

**Implementation**:
- Popup button -> `TEST_WASM_LOADING` background path.  
- Content script bridge: `window.postMessage` relay to `chrome.runtime.sendMessage`.

## Alternatives Considered
- Bundling wasm directly into the worker: increased bundle size and complexity.  
- Blob/`importScripts` approach: less ergonomic with ESM glue and cross‑browser variability.

## Impact
- Chrome MV3 compliant WASM loading.  
- Consistent streaming API across Chrome/Firefox/Safari.  
- Clearer errors and better observability in SW logs.  
- Test pages function without direct extension APIs.

## Follow‑ups
- Evaluate code splitting for wasm assets.  
- Consider richer health/status reporting from background for UI.  
- Expand E2E to exercise streaming paths in all supported browsers.

