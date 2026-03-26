// Crypto wrapper that works reliably in React Native
import { SimpleCrypto } from './simpleCrypto';

// Try to load CryptoJS if available
let CryptoJS: any = null;

try {
  // Try different ways to access CryptoJS
  if (typeof window !== 'undefined' && (window as any).CryptoJS) {
    CryptoJS = (window as any).CryptoJS;
  } else if (typeof global !== 'undefined' && (global as any).CryptoJS) {
    CryptoJS = (global as any).CryptoJS;
  } else {
    // Try to require it
    try {
      CryptoJS = require('../../crypto-js.js');
    } catch (e) {
      console.log('Could not require crypto-js.js:', e.message);
    }
  }
} catch (error) {
  console.log('CryptoJS not available, using fallback');
}

export class CryptoWrapper {
  
  // Check if CryptoJS is available
  static get hasCryptoJS(): boolean {
    return !!CryptoJS && typeof CryptoJS.MD5 === 'function';
  }
  
  // MD5 hash
  static md5(message: string): string {
    if (this.hasCryptoJS) {
      return CryptoJS.MD5(message).toString();
    }
    return SimpleCrypto.simpleHash(message);
  }
  
  // SHA256 hash
  static sha256(message: string): string {
    if (this.hasCryptoJS) {
      return CryptoJS.SHA256(message).toString();
    }
    return SimpleCrypto.simpleHash(message + '_sha256');
  }
  
  // SHA512 hash
  static sha512(message: string): string {
    if (this.hasCryptoJS) {
      return CryptoJS.SHA512(message).toString();
    }
    return SimpleCrypto.simpleHash(message + '_sha512');
  }
  
  // HMAC SHA256
  static hmacSHA256(message: string, key: string): string {
    if (this.hasCryptoJS) {
      return CryptoJS.HmacSHA256(message, key).toString();
    }
    return SimpleCrypto.simpleHash(message + key);
  }
  
  // Base64 encoding
  static base64Encode(message: string): string {
    if (this.hasCryptoJS) {
      const wordArray = CryptoJS.enc.Utf8.parse(message);
      return CryptoJS.enc.Base64.stringify(wordArray);
    }
    return SimpleCrypto.base64Encode(message);
  }
  
  // Base64 decoding
  static base64Decode(base64String: string): string {
    if (this.hasCryptoJS) {
      const wordArray = CryptoJS.enc.Base64.parse(base64String);
      return CryptoJS.enc.Utf8.stringify(wordArray);
    }
    return SimpleCrypto.base64Decode(base64String);
  }
  
  // Generate random hex
  static generateRandomHex(bytes: number = 32): string {
    if (this.hasCryptoJS) {
      const randomWords = CryptoJS.lib.WordArray.random(bytes);
      return CryptoJS.enc.Hex.stringify(randomWords);
    }
    return SimpleCrypto.generateRandomHex(bytes);
  }
  
  // Generate UUID
  static generateUUID(): string {
    return SimpleCrypto.generateUUID();
  }
  
  // Hash password with salt
  static hashPassword(password: string, salt?: string): string {
    const saltToUse = salt || this.generateRandomHex(16);
    return this.sha256(password + saltToUse);
  }
  
  // Verify password
  static verifyPassword(password: string, hashedPassword: string, salt: string): boolean {
    const computedHash = this.sha256(password + salt);
    return computedHash === hashedPassword;
  }
  
  // Generate API signature
  static generateApiSignature(data: string, secretKey: string): string {
    return this.hmacSHA256(data, secretKey);
  }
  
  // Get crypto info
  static getCryptoInfo(): { hasCryptoJS: boolean; fallback: string } {
    return {
      hasCryptoJS: this.hasCryptoJS,
      fallback: this.hasCryptoJS ? 'None' : 'SimpleCrypto'
    };
  }
}