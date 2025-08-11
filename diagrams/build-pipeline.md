# Build Pipeline

This diagram shows the build process for the SquareX browser extension project.

```mermaid
graph LR
    subgraph "Source Code"
        Rust[Rust Source<br/>wasm/src/]
        TS[TypeScript Source<br/>shared/src/]
        Ext[Extension Source<br/>extensions/*/src/]
    end

    subgraph "Build Tools"
        WasmPack[wasm-pack<br/>WASM Compilation]
        TSCompiler[TypeScript<br/>Compiler]
        Webpack[Webpack<br/>Extension Bundling]
    end

    subgraph "Build Outputs"
        WASMOut[WASM Package<br/>wasm/pkg/]
        SharedOut[Shared Package<br/>shared/dist/]
        ExtOut[Extension Builds<br/>extensions/*/dist/]
    end

    subgraph "Dependencies"
        WASMDeps[WASM Dependencies<br/>wasm/Cargo.toml]
        SharedDeps[Shared Dependencies<br/>shared/package.json]
        ExtDeps[Extension Dependencies<br/>extensions/*/package.json]
    end

    subgraph "Package Management"
        NPM[npm install<br/>Install Dependencies]
        Workspace[Workspace<br/>Management]
    end

    %% Build flow
    Rust --> WasmPack
    TS --> TSCompiler
    Ext --> Webpack

    %% Dependencies
    WASMDeps --> WasmPack
    SharedDeps --> TSCompiler
    ExtDeps --> Webpack

    %% Package management
    NPM --> WASMDeps
    NPM --> SharedDeps
    NPM --> ExtDeps
    Workspace --> NPM

    %% Outputs
    WasmPack --> WASMOut
    TSCompiler --> SharedOut
    Webpack --> ExtOut

    %% Dependencies between outputs
    SharedOut --> ExtOut
    WASMOut --> ExtOut

    classDef source fill:#e8f5e8
    classDef tool fill:#e3f2fd
    classDef output fill:#fff3e0
    classDef deps fill:#fce4ec
    classDef pkg fill:#e0f2f1

    class Rust,TS,Ext source
    class WasmPack,TSCompiler,Webpack tool
    class WASMOut,SharedOut,ExtOut output
    class WASMDeps,SharedDeps,ExtDeps deps
    class NPM,Workspace pkg
```

## Build Process

### **1. Dependency Installation**
```bash
npm install
```
- Install all workspace dependencies
- Resolve local package dependencies

### **2. WASM Module Build**
```bash
cd wasm && wasm-pack build --target web
```
- Compile Rust source to WebAssembly
- Generate TypeScript bindings
- Output: `wasm/pkg/` directory

### **3. Shared Package Build**
```bash
cd shared && npm run build
```
- Compile TypeScript source
- Generate type definitions
- Output: `shared/dist/` directory

### **4. Extension Builds**
```bash
cd extensions/chrome && npm run build
cd extensions/firefox && npm run build
cd extensions/safari && npm run build
```
- Bundle extension source with Webpack
- Include shared utilities and WASM module
- Output: `extensions/*/dist/` directories

### **5. Build Dependencies**
- Extensions depend on shared package
- Extensions depend on WASM module
- Shared package provides types and utilities
