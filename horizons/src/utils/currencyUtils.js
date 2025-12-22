/**
 * Formats a number as a currency string (e.g., "1,234.56 ر.س")
 * @param {number|string} amount - The amount to format
 * @param {string} currency - The currency code (default: 'SAR')
 * @param {string} locale - The locale (default: 'ar-SA')
 * @returns {string} The formatted currency string
 */
export const formatCurrency = (amount, currency = 'SAR', locale = 'ar-SA') => {
  const num = parseFloat(amount);
  if (isNaN(num)) return '0.00 ' + (currency === 'SAR' ? 'ر.س' : currency);

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

/**
 * Formats a number with thousands separators (e.g., "1,234")
 * @param {number|string} number - The number to format
 * @param {string} locale - The locale (default: 'ar-SA')
 * @returns {string} The formatted number string
 */
export const formatNumber = (number, locale = 'ar-SA') => {
  const num = parseFloat(number);
  if (isNaN(num)) return '0';

  return new Intl.NumberFormat(locale).format(num);
};

/**
 * Formats an amount with specified decimals and optional prefix/suffix
 * @param {number|string} amount - The amount to format
 * @param {object} options - Formatting options { decimals, suffix, prefix }
 * @returns {string} The formatted amount string
 */
export const formatAmount = (amount, options = {}) => {
  const { decimals = 2, suffix = '', prefix = '' } = options;
  const num = parseFloat(amount);
  
  if (isNaN(num)) return `${prefix}0${suffix}`;

  const formatted = num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${prefix}${formatted}${suffix}`;
};