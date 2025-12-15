const CryptoJS = require('crypto-js');

// 从环境变量获取加密密钥
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-please-change-this!!';

/**
 * 使用AES-256加密文本
 * @param {string} text - 要加密的文本
 * @returns {string} 加密后的文本
 */
function encrypt(text) {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

/**
 * 使用AES-256解密文本  
 * @param {string} encryptedText - 加密的文本
 * @returns {string} 解密后的文本
 */
function decrypt(encryptedText) {
  if (!encryptedText) return '';
  const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

module.exports = {
  encrypt,
  decrypt
};
