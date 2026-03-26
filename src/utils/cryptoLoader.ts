// Load and initialize CryptoJS
let CryptoJS: any = null;

// Function to load CryptoJS
const loadCryptoJS = () => {
  if (CryptoJS) return CryptoJS;
  
  try {
    // Import the crypto-js file
    CryptoJS = require('../../crypto-js.js');
    
    // Also set it globally for easier access
    (global as any).CryptoJS = CryptoJS;
    
    console.log('CryptoJS loaded successfully:', !!CryptoJS);
    return CryptoJS;
  } catch (error) {
    console.error('Failed to load CryptoJS:', error);
    
    // Try to get from global if it exists
    if ((global as any).CryptoJS) {
      CryptoJS = (global as any).CryptoJS;
      return CryptoJS;
    }
    
    return null;
  }
};

// Initialize CryptoJS
CryptoJS = loadCryptoJS();

export { CryptoJS };
export default CryptoJS;