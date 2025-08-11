# WASM Module Architecture

This diagram shows the internal architecture of the Rust WASM module for file analysis.

```mermaid
graph TB
    subgraph "WASM Module (Rust)"
        subgraph "Public Interface"
            WasmModule[WasmModule<br/>Main Entry Point]
        end

        subgraph "Analysis Algorithms"
            Frequency[Word Frequency<br/>Top N words]
            Phrases[Banned Phrases<br/>Pattern matching]
            PII[PII Detection<br/>Regex patterns]
            Entropy[Entropy Calculation<br/>Shannon entropy]
        end

        subgraph "Streaming Analysis"
            Streaming[StreamingAnalyzer<br/>State management]
            Config[StreamingConfig<br/>Runtime parameters]
            ChunkProcess[Chunk Processing<br/>Memory efficient]
        end

        subgraph "Utilities"
            TextUtils[Text Processing<br/>Normalization]
            StreamUtils[Streaming<br/>Chunk processing]
        end

        subgraph "Data Structures"
            Types[Shared Types<br/>AnalysisResult, etc.]
        end

        subgraph "WASM Bindings"
            Bindings[wasm-bindgen<br/>JavaScript Interface]
        end
    end

    subgraph "JavaScript Interface"
        JSModule[JavaScript Module<br/>WasmModule Instance]
        Methods[Public Methods<br/>analyze_file, etc.]
    end

    subgraph "Browser Extensions"
        Extensions[Chrome/Firefox/Safari<br/>Extension Code]
    end

    %% Internal connections
    WasmModule --> Frequency
    WasmModule --> Phrases
    WasmModule --> PII
    WasmModule --> Entropy
    WasmModule --> Streaming
    WasmModule --> Config
    WasmModule --> ChunkProcess
    WasmModule --> TextUtils
    WasmModule --> StreamUtils
    WasmModule --> Types

    %% Analysis algorithms use utilities
    Frequency --> TextUtils
    Phrases --> TextUtils
    PII --> TextUtils
    Entropy --> TextUtils
    Streaming --> TextUtils
    Streaming --> Config

    %% WASM bindings
    WasmModule --> Bindings
    Bindings --> JSModule
    JSModule --> Methods

    %% External usage
    Methods --> Extensions

    classDef interface fill:#e3f2fd
    classDef algorithm fill:#f1f8e9
    classDef utility fill:#fff8e1
    classDef data fill:#fce4ec
    classDef binding fill:#e8eaf6
    classDef external fill:#e0f2f1

    class WasmModule,JSModule,Methods interface
    class Frequency,Phrases,PII,Entropy,Streaming,Config,ChunkProcess algorithm
    class TextUtils,StreamUtils utility
    class Types data
    class Bindings binding
    class Extensions external
```

## Module Components

### **Public Interface**
- **WasmModule**: Main entry point with WASM bindings
- **JavaScript Interface**: Exposed methods for browser extensions

### **Analysis Algorithms**
- **Word Frequency**: Identifies most common words in text
- **Banned Phrases**: Detects prohibited content patterns
- **PII Detection**: Finds personal identifiable information
- **Entropy Calculation**: Measures text randomness/obfuscation

### **Streaming Analysis**
- **StreamingAnalyzer**: Stateful analyzer for large file processing
- **StreamingConfig**: Runtime-configurable parameters (stopwords, thresholds, banned phrases)
- **Chunk Processing**: Memory-efficient processing of large files in 1MB chunks

### **Utilities**
- **Text Processing**: Normalization and cleaning functions
- **Streaming**: Chunk-based processing for large files

### **Data Structures**
- **Shared Types**: Common data structures for analysis results
