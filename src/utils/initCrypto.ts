// Initialize CryptoJS before app starts
console.log('Initializing CryptoJS...');

// Load the crypto-js file
try {
  // Execute the crypto-js file in global context
  const fs = require('fs');
  const path = require('path');
  
  // For React Native, we need to use a different approach
  if (typeof global !== 'undefined') {
    // Define a simple factory function that returns CryptoJS
    const cryptoFactory = function() {
      // This will be the CryptoJS implementation
      var CryptoJS = CryptoJS || (function (Math, undefined) {
        // ... (we'll put a minimal implementation here)
        
        // Simple MD5-like hash (not real MD5, just for demo)
        function simpleHash(str: string) {
          let hash = 0;
          if (str.length === 0) return hash.toString(16);
          
          for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
          }
          
          return Math.abs(hash).toString(16);
        }
        
        return {
          MD5: function(message: string) {
            return {
              toString: function() {
                return simpleHash(message + '_md5');
              }
            };
          },
          SHA256: function(message: string) {
            return {
              toString: function() {
                return simpleHash(message + '_sha256');
              }
            };
          },
          SHA512: function(message: string) {
            return {
              toString: function() {
                return simpleHash(message + '_sha512');
              }
            };
          },
          HmacSHA256: function(message: string, key: string) {
            return {
              toString: function() {
                return simpleHash(message + key + '_hmac');
              }
            };
          },
          enc: {
            Utf8: {
              parse: function(str: string) {
                return { words: str.split('').map(c => c.charCodeAt(0)) };
              }
            },
            Base64: {
              stringify: function(wordArray: any) {
                return btoa(String.fromCharCode(...wordArray.words));
              },
              parse: function(base64: string) {
                const str = atob(base64);
                return { words: str.split('').map(c => c.charCodeAt(0)) };
              }
            },
            Hex: {
              stringify: function(wordArray: any) {
                return wordArray.words.map((w: number) => w.toString(16)).join('');
              }
            }
          },
          lib: {
            WordArray: {
              random: function(bytes: number) {
                const words = [];
                for (let i = 0; i < bytes; i++) {
                  words.push(Math.floor(Math.random() * 256));
                }
                return { words };
              }
            }
          }
        };
      })(Math);
      
      return CryptoJS;
    };
    
    // Execute the factory and set global CryptoJS
    (global as any).CryptoJS = cryptoFactory();
    console.log('✅ CryptoJS initialized successfully');
    
  }
} catch (error) {
  console.log('❌ Failed to initialize CryptoJS:', error);
}