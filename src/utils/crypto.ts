// Crypto utility functions using CryptoJS
import CryptoJS from './cryptoLoader';

export class CryptoUtils {
  
  // Check if CryptoJS is loaded
  private static checkCryptoJS() {
    if (!CryptoJS) {
      throw new Error('CryptoJS is not loaded. Please ensure crypto-js.js is properly imported.');
    }
    return CryptoJS;
  }
  
  // Hash functions
  static md5(message: string): string {
    const crypto = this.checkCryptoJS();
    return crypto.MD5(message).toString();
  }
  
  static sha1(message: string): string {
    const crypto = this.checkCryptoJS();
    return crypto.SHA1(message).toString();
  }
  
  static sha256(message: string): string {
    const crypto = this.checkCryptoJS();
    return crypto.SHA256(message).toString();
  }
  
  static sha512(message: string): string {
    const crypto = this.checkCryptoJS();
    return crypto.SHA512(message).toString();
  }
  
  static sha3(message: string, outputLength: number = 512): string {
    const crypto = this.checkCryptoJS();
    return crypto.SHA3(message, { outputLength }).toString();
  }
  
  // HMAC functions
  static hmacSHA256(message: string, key: string): string {
    const crypto = this.checkCryptoJS();
    return crypto.HmacSHA256(message, key).toString();
  }
  
  static hmacSHA512(message: string, key: string): string {
    const crypto = this.checkCryptoJS();
    return crypto.HmacSHA512(message, key).toString();
  }
  
  // Encoding functions
  static base64Encode(message: string): string {
    const crypto = this.checkCryptoJS();
    const wordArray = crypto.enc.Utf8.parse(message);
    return crypto.enc.Base64.stringify(wordArray);
  }
  
  static base64Decode(base64String: string): string {
    const crypto = this.checkCryptoJS();
    const wordArray = crypto.enc.Base64.parse(base64String);
    return crypto.enc.Utf8.stringify(wordArray);
  }
  
  static base64UrlEncode(message: string): string {
    const crypto = this.checkCryptoJS();
    const wordArray = crypto.enc.Utf8.parse(message);
    return crypto.enc.Base64url.stringify(wordArray, true);
  }
  
  static base64UrlDecode(base64UrlString: string): string {
    const crypto = this.checkCryptoJS();
    const wordArray = crypto.enc.Base64url.parse(base64UrlString, true);
    return crypto.enc.Utf8.stringify(wordArray);
  }
  
  // Generate random values
  static generateRandomHex(bytes: number = 32): string {
    const crypto = this.checkCryptoJS();
    const randomWords = crypto.lib.WordArray.random(bytes);
    return crypto.enc.Hex.stringify(randomWords);
  }
  
  static generateRandomBase64(bytes: number = 32): string {
    const crypto = this.checkCryptoJS();
    const randomWords = crypto.lib.WordArray.random(bytes);
    return crypto.enc.Base64.stringify(randomWords);
  }
  
  // Utility functions for common use cases
  static hashPassword(password: string, salt?: string): string {
    const saltToUse = salt || this.generateRandomHex(16);
    return this.sha256(password + saltToUse);
  }
  
  static verifyPassword(password: string, hashedPassword: string, salt: string): boolean {
    const computedHash = this.sha256(password + salt);
    return computedHash === hashedPassword;
  }
  
  static generateApiSignature(data: string, secretKey: string): string {
    return this.hmacSHA256(data, secretKey);
  }
  
  static generateUUID(): string {
    // Simple UUID v4 generator using crypto random
    const randomHex = this.generateRandomHex(16);
    return [
      randomHex.substr(0, 8),
      randomHex.substr(8, 4),
      '4' + randomHex.substr(13, 3),
      ((parseInt(randomHex.substr(16, 1), 16) & 0x3) | 0x8).toString(16) + randomHex.substr(17, 3),
      randomHex.substr(20, 12)
    ].join('-');
  }
}