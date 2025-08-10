import { CONFIG, MESSAGES } from 'shared';

console.log('SquareX File Scanner Service Worker loaded');

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  
  switch (message.type) {
    case 'ANALYZE_FILE':
      handleFileAnalysis(message.data, sendResponse);
      return true; // Keep message channel open for async response
      
    case 'GET_STATUS':
      sendResponse({ status: 'ready' });
      break;
      
    default:
      console.warn('Unknown message type:', message.type);
  }
});

async function handleFileAnalysis(fileData: any, sendResponse: (response: any) => void) {
  try {
    console.log('Starting file analysis...');
    
    // Mock analysis for now
    const result = {
      topWords: [],
      bannedPhrases: [],
      piiPatterns: [],
      entropy: 3.5,
      isObfuscated: false,
      decision: 'allow' as const,
      reason: MESSAGES.REASON_SAFE,
      riskScore: 0.1
    };
    
    console.log('Analysis complete:', result);
    sendResponse({ success: true, result });
    
  } catch (error) {
    console.error('Analysis failed:', error);
    sendResponse({ 
      success: false, 
      error: MESSAGES.ANALYSIS_FAILED 
    });
  }
}
