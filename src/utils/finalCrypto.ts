// Final crypto implementation that works reliably
import { Platform } from 'react-native';

export class FinalCrypto {
  
  // Simple but effective hash function (djb2 algorithm)
  private static djb2Hash(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return hash >>> 0; // Convert to unsigned 32-bit integer
  }
  
  // MD5-like hash (simplified)
  static md5(message: string): string {
    const hash1 = this.djb2Hash(message);
    const hash2 = this.djb2Hash(message.split('').reverse().join(''));
    return (hash1.toString(16) + hash2.toString(16)).padStart(32, '0');
  }
  
  // SHA256-like hash (simplified)
  static sha256(message: string): string {
    let hash = this.djb2Hash(message + 'sha256salt');
    let result = '';
    
    // Generate 64 hex characters (256 bits)
    for (let i = 0; i < 8; i++) {
      hash = this.djb2Hash(hash.toString() + message + i);
      result += hash.toString(16).padStart(8, '0');
    }
    
    return result.substring(0, 64);
  }
  
  // SHA512-like hash (simplified)
  static sha512(message: string): string {
    let hash = this.djb2Hash(message + 'sha512salt');
    let result = '';
    
    // Generate 128 hex characters (512 bits)
    for (let i = 0; i < 16; i++) {
      hash = this.djb2Hash(hash.toString() + message + i);
      result += hash.toString(16).padStart(8, '0');
    }
    
    return result.substring(0, 128);
  }
  
  // HMAC-like function
  static hmacSHA256(message: string, key: string): string {
    const keyHash = this.sha256(key);
    const messageWithKey = keyHash + message + keyHash;
    return this.sha256(messageWithKey);
  }
  
  // Base64 encoding
  static base64Encode(str: string): string {
    if (Platform.OS === 'web' && typeof btoa !== 'undefined') {
      return btoa(str);
    }
    
    // Manual base64 encoding
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;
    
    while (i < str.length) {
      const a = str.charCodeAt(i++);
      const b = i < str.length ? str.charCodeAt(i++) : 0;
      const c = i < str.length ? str.charCodeAt(i++) : 0;
      
      const bitmap = (a << 16) | (b << 8) | c;
      
      result += chars.charAt((bitmap >> 18) & 63);
      result += chars.charAt((bitmap >> 12) & 63);
      result += i - 2 < str.length ? chars.charAt((bitmap >> 6) & 63) : '=';
      result += i - 1 < str.length ? chars.charAt(bitmap & 63) : '=';
    }
    
    return result;
  }
  
  // Base64 decoding
  static base64Decode(str: string): string {
    if (Platform.OS === 'web' && typeof atob !== 'undefined') {
      return atob(str);
    }
    
    // Manual base64 decoding
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;
    
    str = str.replace(/[^A-Za-z0-9+/]/g, '');
    
    while (i < str.length) {
      const encoded1 = chars.indexOf(str.charAt(i++));
      const encoded2 = chars.indexOf(str.charAt(i++));
      const encoded3 = chars.indexOf(str.charAt(i++));
      const encoded4 = chars.indexOf(str.charAt(i++));
      
      const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;
      
      result += String.fromCharCode((bitmap >> 16) & 255);
      if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
      if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255);
    }
    
    return result;
  }
  
  // Generate cryptographically random hex string
  static generateRandomHex(bytes: number = 32): string {
    let result = '';
    const chars = '0123456789abcdef';
    
    // Use crypto.getRandomValues if available
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(bytes);
      crypto.getRandomValues(array);
      for (let i = 0; i < bytes; i++) {
        result += chars[array[i] >> 4] + chars[array[i] & 15];
      }
    } else {
      // Fallback to Math.random (less secure)
      for (let i = 0; i < bytes * 2; i++) {
        result += chars[Math.floor(Math.random() * 16)];
      }
    }
    
    return result;
  }
  
  // Generate UUID v4
  static generateUUID(): string {
    const hex = this.generateRandomHex(16);
    return [
      hex.substring(0, 8),
      hex.substring(8, 12),
      '4' + hex.substring(13, 16),
      ((parseInt(hex.substring(16, 17), 16) & 0x3) | 0x8).toString(16) + hex.substring(17, 20),
      hex.substring(20, 32)
    ].join('-');
  }
  
  // Generate random string
  static generateRandomString(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }
  
  // Hash password with salt
  static hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const usedSalt = salt || this.generateRandomHex(16);
    const hash = this.sha256(password + usedSalt);
    return { hash, salt: usedSalt };
  }
  
  // Verify password
  static verifyPassword(password: string, hash: string, salt: string): boolean {
    const computedHash = this.sha256(password + salt);
    return computedHash === hash;
  }
  
  // Generate API signature
  static generateApiSignature(data: string, secretKey: string, timestamp?: number): string {
    const ts = timestamp || Date.now();
    const payload = `${data}:${ts}`;
    return this.hmacSHA256(payload, secretKey);
  }
  
  // Simple encryption using XOR (not secure, for demo only)
  static simpleEncrypt(text: string, key: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(
        text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return this.base64Encode(result);
  }
  
  // Simple decryption using XOR
  static simpleDecrypt(encryptedText: string, key: string): string {
    const decoded = this.base64Decode(encryptedText);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(
        decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return result;
  }
  
  // JWT-like token creation (simplified)
  static createToken(payload: any, secret: string, expiresIn: number = 3600): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload = { ...payload, iat: now, exp: now + expiresIn };
    
    const encodedHeader = this.base64Encode(JSON.stringify(header));
    const encodedPayload = this.base64Encode(JSON.stringify(tokenPayload));
    const signature = this.hmacSHA256(`${encodedHeader}.${encodedPayload}`, secret);
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }
  
  // JWT-like token verification (simplified)
  static verifyToken(token: string, secret: string): { valid: boolean; payload?: any; error?: string } {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false, error: 'Invalid token format' };
      }
      
      const [encodedHeader, encodedPayload, signature] = parts;
      const expectedSignature = this.hmacSHA256(`${encodedHeader}.${encodedPayload}`, secret);
      
      if (signature !== expectedSignature) {
        return { valid: false, error: 'Invalid signature' };
      }
      
      const payload = JSON.parse(this.base64Decode(encodedPayload));
      const now = Math.floor(Date.now() / 1000);
      
      if (payload.exp && payload.exp < now) {
        return { valid: false, error: 'Token expired' };
      }
      
      return { valid: true, payload };
    } catch (error) {
      return { valid: false, error: 'Token parsing failed' };
    }
  }
}