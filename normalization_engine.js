/**
 * ReturnSync Data Normalization Engine
 * Converts platform-specific return data into universal format
 */

// ============================================
// 1. PLATFORM DETECTION
// ============================================

function detectPlatform(headers) {
  const headerStr = headers.join(',').toLowerCase();
  
  if (headerStr.includes('amazon order id') || headerStr.includes('asin')) {
    return 'Amazon';
  }
  if (headerStr.includes('order number') && headerStr.includes('#')) {
    return 'Shopify';
  }
  if (headerStr.includes('orderref') || headerStr.includes('warehousecode')) {
    return 'DTC';
  }
  
  return 'Unknown';
}

// ============================================
// 2. RETURN REASON NORMALIZATION
// ============================================

const REASON_MAPPING = {
  // Size-related
  'too small': 'Size Issue',
  'size too small': 'Size Issue',
  'too large': 'Size Issue',
  'size too large': 'Size Issue',
  'doesn\'t fit': 'Size Issue',
  'wrong size': 'Size Issue',
  'fit issues': 'Size Issue',
  'uncomfortable fit': 'Size Issue',
  'too tight': 'Size Issue',
  'size runs small': 'Size Issue',
  
  // Defects
  'defective': 'Defective',
  'defective product': 'Defective',
  'defect': 'Defective',
  'poor quality': 'Quality Issue',
  'quality': 'Quality Issue',
  'doesn\'t work': 'Defective',
  'sole separation': 'Defective',
  
  // Color/Description
  'wrong color': 'Wrong Item',
  'color': 'Wrong Item',
  'color not as shown': 'Wrong Item',
  'wrong shade': 'Wrong Item',
  'not as described': 'Not As Described',
  
  // Buyer's remorse
  'changed mind': 'Buyer Remorse',
  'no longer needed': 'Buyer Remorse',
  'buyer remorse': 'Buyer Remorse',
  'changed setup': 'Buyer Remorse',
  
  // Other
  'compatibility': 'Compatibility Issue',
  'doesn\'t fit phone': 'Compatibility Issue'
};

function normalizeReturnReason(rawReason) {
  if (!rawReason) return 'Other';
  
  const lower = rawReason.toLowerCase().trim();
  
  for (const [key, normalized] of Object.entries(REASON_MAPPING)) {
    if (lower.includes(key)) {
      return normalized;
    }
  }
  
  return 'Other';
}

// ============================================
// 3. SKU MAPPING (for platforms using different identifiers)
// ============================================

const SKU_CATALOG = {
  // Amazon ASIN to SKU mapping
  'B08XYZ1234': 'SKU-8821',
  'B07ABC5678': 'SKU-5523',
  'B09DEF3456': 'SKU-3341',
  'B06GHI7890': 'SKU-7762',
  'B05JKL2345': 'SKU-2234',
  
  // Product names to SKU (fallback)
  'wireless headphones pro': 'SKU-8821',
  'cotton t-shirt blue': 'SKU-5523',
  'running shoes': 'SKU-3341',
  'laptop stand': 'SKU-7762',
  'phone case': 'SKU-2234',
  'backpack': 'SKU-9876',
  'yoga mat': 'SKU-4456',
  'water bottle': 'SKU-1123'
};

function normalizeSKU(skuField, asinField, productName) {
  // Try direct SKU first
  if (skuField && skuField.startsWith('SKU-')) {
    return skuField;
  }
  
  // Try ASIN mapping
  if (asinField && SKU_CATALOG[asinField]) {
    return SKU_CATALOG[asinField];
  }
  
  // Try product name mapping
  if (productName) {
    const lower = productName.toLowerCase();
    for (const [key, sku] of Object.entries(SKU_CATALOG)) {
      if (lower.includes(key)) {
        return sku;
      }
    }
  }
  
  return skuField || asinField || 'UNKNOWN-SKU';
}

// ============================================
// 4. CUSTOMER ID NORMALIZATION
// ============================================

function normalizeCustomerID(email, platformCustomerID, platform) {
  // Use email as primary identifier (hash it in production)
  if (email && !email.includes('@marketplace.amazon.com')) {
    // Create consistent customer ID from email
    return email.split('@')[0].toLowerCase();
  }
  
  // Fall back to platform customer ID
  if (platformCustomerID) {
    return platformCustomerID;
  }
  
  // Amazon marketplace emails are anonymous, use order-based ID
  if (email && email.includes('@marketplace.amazon.com')) {
    return `amazon_${email.split('@')[0]}`;
  }
  
  return 'UNKNOWN-CUSTOMER';
}

// ============================================
// 5. PLATFORM-SPECIFIC NORMALIZERS
// ============================================

function normalizeShopifyReturn(row) {
  return {
    return_id: row['Return ID'],
    order_id: row['Order Number'],
    customer_id: normalizeCustomerID(row['Customer Email'], null, 'Shopify'),
    customer_email: row['Customer Email'],
    
    sku: row['Product SKU'],
    product_name: row['Product Title'],
    quantity: parseInt(row['Quantity']) || 1,
    
    return_date: row['Return Date'],
    return_reason: normalizeReturnReason(row['Reason']),
    return_reason_raw: row['Reason'],
    
    channel: 'Shopify',
    
    item_price: parseFloat(row['Refund Total']) || 0,
    refund_amount: parseFloat(row['Refund Total']) || 0,
    shipping_cost: parseFloat(row['Shipping Cost']) || 0,
    restocking_fee: 0,
    
    return_status: row['Status'],
    warehouse_location: 'US-DEFAULT',
    return_method: 'Prepaid Label'
  };
}

function normalizeAmazonReturn(row) {
  return {
    return_id: row['Return Request ID'],
    order_id: row['Amazon Order ID'],
    customer_id: normalizeCustomerID(row['Buyer Email'], null, 'Amazon'),
    customer_email: row['Buyer Email'],
    
    sku: normalizeSKU(null, row['ASIN'], row['Product Name']),
    product_name: row['Product Name'],
    quantity: parseInt(row['Qty']) || 1,
    
    return_date: row['Return Date'],
    return_reason: normalizeReturnReason(row['Return Reason Description']),
    return_reason_raw: row['Return Reason Description'],
    
    channel: 'Amazon',
    
    item_price: parseFloat(row['Item Price']) || 0,
    refund_amount: parseFloat(row['Refund Amount']) || 0,
    shipping_cost: 8.50, // Amazon standard
    restocking_fee: 0,
    
    return_status: 'Completed',
    warehouse_location: row['Fulfillment Center'],
    return_method: 'Amazon Return Center'
  };
}

function normalizeDTCReturn(row) {
  // Map warehouse codes to locations
  const warehouseMap = {
    'WH-CA': 'California',
    'WH-NY': 'New York',
    'WH-TX': 'Texas'
  };
  
  return {
    return_id: row['ReturnID'],
    order_id: row['OrderRef'],
    customer_id: row['CustomerID'],
    customer_email: row['Email'],
    
    sku: row['SKU'],
    product_name: row['ItemName'],
    quantity: parseInt(row['Units']) || 1,
    
    return_date: row['ProcessedDate'],
    return_reason: normalizeReturnReason(row['ReturnCategory'] + ' ' + row['Notes']),
    return_reason_raw: row['ReturnCategory'] + ' - ' + row['Notes'],
    
    channel: 'DTC Website',
    
    item_price: parseFloat(row['PurchasePrice']) || 0,
    refund_amount: parseFloat(row['RefundIssued']) || 0,
    shipping_cost: parseFloat(row['ReturnShippingCost']) || 0,
    restocking_fee: 0,
    
    return_status: 'Completed',
    warehouse_location: warehouseMap[row['WarehouseCode']] || row['WarehouseCode'],
    return_method: 'Prepaid Label'
  };
}

// ============================================
// 6. MAIN NORMALIZATION FUNCTION
// ============================================

function normalizeReturns(csvData, headers) {
  const platform = detectPlatform(headers);
  
  console.log(`Detected platform: ${platform}`);
  
  let normalizer;
  switch(platform) {
    case 'Shopify':
      normalizer = normalizeShopifyReturn;
      break;
    case 'Amazon':
      normalizer = normalizeAmazonReturn;
      break;
    case 'DTC':
      normalizer = normalizeDTCReturn;
      break;
    default:
      throw new Error('Unknown platform format');
  }
  
  return csvData.map(row => normalizer(row));
}

// ============================================
// 7. EXPORT FOR USE
// ============================================

// For use in browser/Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    normalizeReturns,
    detectPlatform,
    normalizeReturnReason,
    normalizeSKU
  };
}

// ============================================
// 8. EXAMPLE USAGE & TESTING
// ============================================

/* 
USAGE EXAMPLE:

const Papa = require('papaparse');

// Parse CSV
Papa.parse(csvFile, {
  header: true,
  complete: function(results) {
    const headers = results.meta.fields;
    const normalizedData = normalizeReturns(results.data, headers);
    console.log(normalizedData);
  }
});
*/