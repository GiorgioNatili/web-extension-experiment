# Browser Extension Workflow

This diagram shows the workflow of how the browser extension processes file uploads.

```mermaid
sequenceDiagram
    participant User as User
    participant Page as Web Page
    participant Content as Content Script
    participant Background as Background Script
    participant WASM as WASM Module
    participant UI as UI Injection

    User->>Page: Select .txt file for upload
    Page->>Content: File input change event
    Content->>Content: Validate file type & size
    
    alt Invalid file
        Content->>UI: Show error notification
        UI->>User: Display error message
    else Valid file
        Content->>Content: Read file content
        Content->>Background: Send analysis request
        Background->>WASM: Initialize streaming analyzer
        WASM->>WASM: Load analysis algorithms
        
        loop For each chunk (1MB)
            Content->>WASM: Process chunk
            WASM->>WASM: Accumulate word frequencies
            WASM->>WASM: Detect banned phrases
            WASM->>WASM: Find PII patterns
            WASM->>WASM: Calculate entropy
        end
        
        WASM->>WASM: Finalize analysis
        WASM->>Background: Return analysis results
        Background->>Content: Send results back
        
        Content->>UI: Inject results into page
        UI->>User: Display analysis results
        
        alt High risk detected
            UI->>User: Show warning/block message
        else Low risk
            UI->>User: Show allow message
        end
    end
```

## Workflow Steps

### **1. File Selection**
- User selects a `.txt` file for upload
- Content script detects file input change event

### **2. Validation**
- Check file type (must be `.txt`)
- Validate file size (max 100MB)
- Show error if validation fails

### **3. Analysis Request**
- Read file content as text
- Send analysis request to background script
- Background script initializes streaming analyzer

### **4. Streaming Analysis**
- **Chunk Processing**: Process file in 1MB chunks for memory efficiency
- **State Accumulation**: Maintain analysis state across chunks
- **Word Frequency**: Accumulate word counts across all chunks
- **Banned Phrases**: Detect prohibited content in each chunk
- **PII Detection**: Find personal information patterns
- **Entropy Calculation**: Measure text randomness/obfuscation
- **Final Aggregation**: Combine results from all chunks

### **5. Results Processing**
- WASM returns structured analysis results
- Background script processes and formats results
- Results sent back to content script

### **6. UI Update**
- Content script injects results into page
- Display analysis summary to user
- Show allow/block decision with reasoning

### **7. Safari-Specific Workflow**
- **Local Message Handling**: Safari content script handles messages locally
- **Limited API Support**: Uses only `browser.runtime` API
- **No Background Script**: WASM operations performed in content script
- **Multiple Detection**: Aggressive ready signal broadcasting for test page detection
