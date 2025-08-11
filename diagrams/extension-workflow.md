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
        Background->>WASM: Initialize WASM module
        WASM->>WASM: Load analysis algorithms
        
        par Analysis Processing
            WASM->>WASM: Word frequency analysis
            WASM->>WASM: Banned phrase detection
            WASM->>WASM: PII pattern detection
            WASM->>WASM: Entropy calculation
        end
        
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
- Background script initializes WASM module

### **4. Parallel Analysis**
- **Word Frequency**: Identify top words
- **Banned Phrases**: Detect prohibited content
- **PII Detection**: Find personal information
- **Entropy Calculation**: Measure text randomness

### **5. Results Processing**
- WASM returns structured analysis results
- Background script processes and formats results
- Results sent back to content script

### **6. UI Update**
- Content script injects results into page
- Display analysis summary to user
- Show allow/block decision with reasoning
