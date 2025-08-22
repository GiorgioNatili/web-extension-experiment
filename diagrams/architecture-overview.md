# Architecture Overview

This diagram shows the high-level architecture of the SquareX browser extension project.

```mermaid
graph TB
    subgraph "Browser Extensions"
        Chrome[Chrome Extension<br/>Manifest V3]
        Firefox[Firefox Extension<br/>WebExtensions]
        Safari[Safari Extension<br/>Web Extensions]
    end

    subgraph "Core Components"
        WASM[Rust WASM Module<br/>Analysis Engine]
        Shared[Shared Utilities<br/>TypeScript]
        Tests[Test Suite<br/>Jest + Playwright]
    end

    subgraph "Build System"
        Webpack[Webpack<br/>Extension Bundling]
        WasmPack[wasm-pack<br/>WASM Compilation]
        TypeScript[TypeScript<br/>Type Checking]
    end

    subgraph "Development Tools"
        TestPage[Test Page<br/>Local Development]
        Docs[Documentation<br/>Project Docs]
        Decisions[Decisions Log<br/>Technical History]
    end

    %% Browser Extensions connect to Shared and WASM
    Chrome --> Shared
    Firefox --> Shared
    Safari --> Shared
    Chrome --> WASM
    Firefox --> WASM
    Safari --> WASM

    %% Build System connections
    Webpack --> Chrome
    Webpack --> Firefox
    Webpack --> Safari
    WasmPack --> WASM
    TypeScript --> Shared

    %% Development Tools
    TestPage --> Chrome
    TestPage --> Firefox
    TestPage --> Safari
    Docs --> Shared
    Decisions --> Shared

    %% Testing connections
    Tests --> Chrome
    Tests --> Firefox
    Tests --> Safari
    Tests --> WASM
    Tests --> Shared

    classDef extension fill:#e1f5fe
    classDef core fill:#f3e5f5
    classDef build fill:#e8f5e8
    classDef tools fill:#fff3e0

    class Chrome,Firefox,Safari extension
    class WASM,Shared,Tests core
    class Webpack,WasmPack,TypeScript build
    class TestPage,Docs,Decisions tools
```

## Component Relationships

- **Browser Extensions**: Platform-specific implementations using shared utilities and WASM module
- **Core Components**: Reusable code and analysis engine
- **Build System**: Tools for compiling and bundling the project
- **Development Tools**: Supporting infrastructure for development and documentation
