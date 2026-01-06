// VPA Validation
function validateVPA(vpa) {
  if (!vpa || typeof vpa !== 'string') {
    return false;
  }
  const vpaPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
  return vpaPattern.test(vpa);
}

// Luhn Algorithm for Card Validation
function validateCardNumber(cardNumber) {
  if (!cardNumber || typeof cardNumber !== 'string') {
    return false;
  }
  
  // Remove spaces and dashes
  const cleaned = cardNumber.replace(/[\s-]/g, '');
  
  // Check if only digits and length between 13 and 19
  if (!/^\d{13,19}$/.test(cleaned)) {
    return false;
  }
  
  // Apply Luhn algorithm
  let sum = 0;
  let isEven = false;
  
  // Start from rightmost digit
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

// Card Network Detection
function detectCardNetwork(cardNumber) {
  if (!cardNumber || typeof cardNumber !== 'string') {
    return 'unknown';
  }
  
  // Remove spaces and dashes
  const cleaned = cardNumber.replace(/[\s-]/g, '');
  
  // Check network based on starting digits
  if (cleaned.startsWith('4')) {
    return 'visa';
  }
  
  const firstTwo = cleaned.substring(0, 2);
  const firstTwoNum = parseInt(firstTwo, 10);
  
  // Mastercard: 51-55
  if (firstTwoNum >= 51 && firstTwoNum <= 55) {
    return 'mastercard';
  }
  
  // Amex: 34 or 37
  if (firstTwo === '34' || firstTwo === '37') {
    return 'amex';
  }
  
  // RuPay: 60, 65, or 81-89
  if (firstTwo === '60' || firstTwo === '65' || (firstTwoNum >= 81 && firstTwoNum <= 89)) {
    return 'rupay';
  }
  
  return 'unknown';
}

// Expiry Date Validation
function validateExpiry(expiryMonth, expiryYear) {
  // Parse month
  const month = parseInt(expiryMonth, 10);
  if (isNaN(month) || month < 1 || month > 12) {
    return false;
  }
  
  // Parse year
  let year = parseInt(expiryYear, 10);
  if (isNaN(year)) {
    return false;
  }
  
  // Handle 2-digit year format
  if (year < 100) {
    year += 2000;
  }
  
  // Get current date
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11
  
  // Compare expiry with current date
  if (year > currentYear) {
    return true;
  } else if (year === currentYear && month >= currentMonth) {
    return true;
  }
  
  return false;
}

// Generate Random ID
function generateId(prefix, length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = prefix;
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

module.exports = {
  validateVPA,
  validateCardNumber,
  detectCardNetwork,
  validateExpiry,
  generateId,
};
