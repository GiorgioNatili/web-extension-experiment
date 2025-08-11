// Firefox content script
// Firefox content script
// Note: Shared utilities would be imported here in a real implementation
declare const browser: any;

// Monitor file uploads
function monitorFileUploads() {
  const fileInputs = document.querySelectorAll('input[type="file"]');
  
  fileInputs.forEach(input => {
    input.addEventListener('change', async (event) => {
      const target = event.target as HTMLInputElement;
      const files = target.files;
      
      if (files && files.length > 0) {
        const file = files[0];
        
        // Only process .txt files for now
        if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
          console.log('Processing file:', file.name);
          
          try {
            const content = await file.text();
            
            // Send to background script for analysis
            const response = await browser.runtime.sendMessage({
              type: 'ANALYZE_FILE',
              data: {
                name: file.name,
                size: file.size,
                content: content
              }
            });
            
                         if (response.success) {
               console.log(`File ${file.name} analyzed successfully`);
             } else {
               console.error(`Failed to analyze ${file.name}`);
             }
                     } catch (error) {
             console.error('Error processing file:', error);
           }
        }
      }
    });
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', monitorFileUploads);
} else {
  monitorFileUploads();
}

// Monitor for dynamically added file inputs
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
                 if (element.querySelector && typeof element.querySelector === 'function') {
          const fileInputs = element.querySelectorAll('input[type="file"]');
          fileInputs.forEach(input => {
            input.addEventListener('change', async (event) => {
              const target = event.target as HTMLInputElement;
              const files = target.files;
              
              if (files && files.length > 0) {
                const file = files[0];
                if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                  console.log('Processing dynamically added file:', file.name);
                  // Handle file processing
                }
              }
            });
          });
        }
      }
    });
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
