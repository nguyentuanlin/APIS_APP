// TypeScript declarations for CryptoJS
declare global {
  interface Window {
    CryptoJS: any;
  }
  
  var CryptoJS: {
    MD5: (message: string) => { toString: () => string };
    SHA1: (message: string) => { toString: () => string };
    SHA256: (message: string) => { toString: () => string };
    SHA512: (message: string) => { toString: () => string };
    SHA3: (message: string, config?: any) => { toString: () => string };
    RIPEMD160: (message: string) => { toString: () => string };
    
    HmacMD5: (message: string, key: string) => { toString: () => string };
    HmacSHA1: (message: string, key: string) => { toString: () => string };
    HmacSHA256: (message: string, key: string) => { toString: () => string };
    HmacSHA512: (message: string, key: string) => { toString: () => string };
    
    enc: {
      Hex: {
        stringify: (wordArray: any) => string;
        parse: (hexStr: string) => any;
      };
      Base64: {
        stringify: (wordArray: any) => string;
        parse: (base64Str: string) => any;
      };
      Base64url: {
        stringify: (wordArray: any, urlSafe?: boolean) => string;
        parse: (base64Str: string, urlSafe?: boolean) => any;
      };
      Utf8: {
        stringify: (wordArray: any) => string;
        parse: (utf8Str: string) => any;
      };
      Latin1: {
        stringify: (wordArray: any) => string;
        parse: (latin1Str: string) => any;
      };
    };
    
    lib: {
      WordArray: {
        create: (words?: number[], sigBytes?: number) => any;
        random: (nBytes: number) => any;
      };
    };
  };
}

export {};