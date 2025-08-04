const CryptoJS = require('crypto-js');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-this-in-production!';

// Encrypt sensitive data
const encrypt = (text) => {
  if (!text || text === '') return '';
  try {
    return CryptoJS.AES.encrypt(text.toString(), ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('Encryption error:', error);
    return text; // Return original if encryption fails
  }
};

// Decrypt sensitive data
const decrypt = (encryptedText) => {
  if (!encryptedText || encryptedText === '') return '';
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedText; // Return original if decryption fails
  }
};

// Check if text is encrypted (basic check)
const isEncrypted = (text) => {
  if (!text) return false;
  // Basic check - encrypted text typically doesn't contain common readable patterns
  return !(/^[a-zA-Z0-9\s\-._@]+$/.test(text)) || text.length > 100;
};

// Mask sensitive information for display
const maskAccountNumber = (accountNumber) => {
  if (!accountNumber || accountNumber.length < 4) return '****';
  return '****' + accountNumber.slice(-4);
};

const maskRoutingNumber = (routingNumber) => {
  if (!routingNumber || routingNumber.length < 4) return '****';
  return '****' + routingNumber.slice(-4);
};

module.exports = { 
  encrypt, 
  decrypt, 
  isEncrypted, 
  maskAccountNumber, 
  maskRoutingNumber 
};