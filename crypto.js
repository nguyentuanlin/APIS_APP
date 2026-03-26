import * as CryptoJS from 'crypto-js';
// console.log("CHECK CryptoJS:", CryptoJS);
export const AE = (text, key) => {
  let result = '';

  for (let i = 0; i < text.length; i++) {
    const xor =
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(xor);
  }

  return CryptoJS.enc.Base64.stringify(
    CryptoJS.enc.Utf8.parse(result)
  );
};

export const AD = (cipherText, key) => {
  const decoded = CryptoJS.enc.Base64.parse(cipherText).toString(
    CryptoJS.enc.Utf8
  );

  let result = '';

  for (let i = 0; i < decoded.length; i++) {
    const xor =
      decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(xor);
  }

  return result;
};