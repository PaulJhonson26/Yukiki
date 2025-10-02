// API configuration and barcode lookup functionality
const API_KEY = 'c0y0t3bhpu1vwowheqsb7nn8gq7c1s';
const LOOKUP_API_URL = 'https://api.barcodelookup.com/v3/products';

// Format mapping for QuaggaJS to standard format names
const formatMap = {
    'ean_reader': 'ean_13',
    'ean_8_reader': 'ean_8',
    'upc_reader': 'upc_a',
    'upc_e_reader': 'upc_e',
    'code_128_reader': 'code_128',
    'code_39_reader': 'code_39',
    'unknown': 'unknown'
};

/**
 * Validate GTIN (EAN-13, UPC-A, EAN-8) format and checksum
 * @param {string} code - The barcode value
 * @param {string} format - The barcode format
 * @returns {Object} - Validation result with valid boolean and message
 */
function validateGTIN(code, format) {
    if (!code || !/^\d+$/.test(code)) {
        return { valid: false, message: 'Invalid: Non-numeric characters' };
    }

    const length = code.length;
    if (format === 'ean_13' && length !== 13) {
        return { valid: false, message: `Invalid EAN-13: Expected 13 digits, got ${length}` };
    }
    if (format === 'ean_8' && length !== 8) {
        return { valid: false, message: `Invalid EAN-8: Expected 8 digits, got ${length}` };
    }
    if (format === 'upc_a' && length !== 12) {
        return { valid: false, message: `Invalid UPC-A: Expected 12 digits, got ${length}` };
    }
    if (format === 'upc_e' && length !== 6) {
        return { valid: false, message: `Invalid UPC-E: Expected 6 digits, got ${length}` };
    }

    // Checksum validation for EAN-13 and UPC-A
    if (format === 'ean_13' || format === 'upc_a') {
        const digits = code.split('').map(Number);
        const checkDigit = digits.pop();
        let sum = 0;
        for (let i = 0; i < digits.length; i++) {
            sum += (i % 2 === 0 ? digits[i] * 1 : digits[i] * 3);
        }
        const calculatedCheckDigit = (10 - (sum % 10)) % 10;
        if (checkDigit !== calculatedCheckDigit) {
            return { valid: false, message: `Invalid checksum: Expected ${calculatedCheckDigit}, got ${checkDigit}` };
        }
    }

    // EAN-8 checksum
    if (format === 'ean_8') {
        const digits = code.split('').map(Number);
        const checkDigit = digits.pop();
        let sum = 0;
        for (let i = 0; i < digits.length; i++) {
            sum += (i % 2 === 0 ? digits[i] * 3 : digits[i] * 1);
        }
        const calculatedCheckDigit = (10 - (sum % 10)) % 10;
        if (checkDigit !== calculatedCheckDigit) {
            return { valid: false, message: `Invalid checksum: Expected ${calculatedCheckDigit}, got ${checkDigit}` };
        }
    }

    return { valid: true };
}

/**
 * Look up product information using barcode
 * @param {string} barcode - The barcode value
 * @returns {Promise<Object>} - Product information or error
 */
async function lookupProduct(barcode) {
    try {
        const response = await fetch(`${LOOKUP_API_URL}?barcode=${barcode}&formatted=y&key=${API_KEY}`);
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        const apiData = await response.json();
        
        if (apiData.products && apiData.products.length > 0) {
            const product = apiData.products[0];
            return {
                success: true,
                product: {
                    title: product.title || 'Unknown Product',
                    brand: product.brand || null,
                    images: product.images || [],
                    description: product.description || null,
                    category: product.category || null
                }
            };
        } else {
            return {
                success: false,
                message: 'No product data found'
            };
        }
    } catch (error) {
        return {
            success: false,
            message: `Lookup failed: ${error.message}`
        };
    }
}

// Export functions for use in other modules
window.BarcodeAPI = {
    validateGTIN,
    lookupProduct,
    formatMap
};
