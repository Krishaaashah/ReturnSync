/**
 * ReturnSync Analytics Engine
 * Generates insights from normalized return data
 */

// ============================================
// 1. SERIAL RETURNER DETECTION
// ============================================

function detectSerialReturners(normalizedReturns, threshold = 3) {
  // Group returns by customer
  const customerReturns = {};
  
  normalizedReturns.forEach(ret => {
    const customerId = ret.customer_id;
    if (!customerReturns[customerId]) {
      customerReturns[customerId] = {
        customer_id: customerId,
        email: ret.customer_email,
        returns: [],
        total_returns: 0,
        total_refunded: 0,
        channels: new Set()
      };
    }
    
    customerReturns[customerId].returns.push(ret);
    customerReturns[customerId].total_returns++;
    customerReturns[customerId].total_refunded += ret.refund_amount;
    customerReturns[customerId].channels.add(ret.channel);
  });
  
  // Find serial returners (above threshold)
  const serialReturners = Object.values(customerReturns)
    .filter(customer => customer.total_returns >= threshold)
    .map(customer => ({
      ...customer,
      channels: Array.from(customer.channels),
      risk_level: customer.total_returns >= 5 ? 'High' : 'Medium',
      avg_return_value: customer.total_refunded / customer.total_returns
    }))
    .sort((a, b) => b.total_returns - a.total_returns);
  
  return serialReturners;
}

// ============================================
// 2. PRODUCT ANALYSIS
// ============================================

function analyzeProducts(normalizedReturns) {
  // Group returns by SKU
  const productReturns = {};
  
  normalizedReturns.forEach(ret => {
    const sku = ret.sku;
    if (!productReturns[sku]) {
      productReturns[sku] = {
        sku: sku,
        product_name: ret.product_name,
        returns: [],
        total_returns: 0,
        total_quantity: 0,
        total_refunded: 0,
        channels: new Set(),
        reasons: {}
      };
    }
    
    productReturns[sku].returns.push(ret);
    productReturns[sku].total_returns++;
    productReturns[sku].total_quantity += ret.quantity;
    productReturns[sku].total_refunded += ret.refund_amount;
    productReturns[sku].channels.add(ret.channel);
    
    // Count return reasons
    const reason = ret.return_reason;
    productReturns[sku].reasons[reason] = (productReturns[sku].reasons[reason] || 0) + 1;
  });
  
  // Calculate metrics and identify issues
  const products = Object.values(productReturns).map(product => {
    // Find dominant return reason
    const reasonEntries = Object.entries(product.reasons);
    const dominantReason = reasonEntries.length > 0 
      ? reasonEntries.sort((a, b) => b[1] - a[1])[0][0]
      : 'Unknown';
    const dominantReasonCount = product.reasons[dominantReason] || 0;
    const dominantReasonPercent = (dominantReasonCount / product.total_returns * 100).toFixed(1);
    
    // Estimated sales (assuming ~20% average return rate baseline)
    const estimatedSales = Math.round(product.total_returns / 0.20);
    const returnRate = ((product.total_returns / estimatedSales) * 100).toFixed(1);
    
    return {
      ...product,
      channels: Array.from(product.channels),
      dominant_reason: dominantReason,
      dominant_reason_percent: parseFloat(dominantReasonPercent),
      estimated_sales: estimatedSales,
      return_rate: parseFloat(returnRate),
      avg_refund: product.total_refunded / product.total_returns,
      issue_severity: parseFloat(returnRate) > 30 ? 'Critical' : 
                      parseFloat(returnRate) > 20 ? 'High' : 'Normal'
    };
  }).sort((a, b) => b.return_rate - a.return_rate);
  
  return products;
}

// ============================================
// 3. RETURN REASON ANALYSIS
// ============================================

function analyzeReturnReasons(normalizedReturns) {
  const reasonStats = {};
  
  normalizedReturns.forEach(ret => {
    const reason = ret.return_reason;
    if (!reasonStats[reason]) {
      reasonStats[reason] = {
        reason: reason,
        count: 0,
        total_cost: 0,
        products: new Set(),
        channels: new Set()
      };
    }
    
    reasonStats[reason].count++;
    reasonStats[reason].total_cost += ret.refund_amount + ret.shipping_cost;
    reasonStats[reason].products.add(ret.sku);
    reasonStats[reason].channels.add(ret.channel);
  });
  
  const totalReturns = normalizedReturns.length;
  
  return Object.values(reasonStats)
    .map(stat => ({
      ...stat,
      products: Array.from(stat.products),
      channels: Array.from(stat.channels),
      percentage: ((stat.count / totalReturns) * 100).toFixed(1),
      avg_cost: stat.total_cost / stat.count
    }))
    .sort((a, b) => b.count - a.count);
}

// ============================================
// 4. FINANCIAL IMPACT ANALYSIS
// ============================================

function calculateFinancialImpact(normalizedReturns) {
  let totalRefunds = 0;
  let totalShippingCosts = 0;
  let totalRestockingFees = 0;
  
  normalizedReturns.forEach(ret => {
    totalRefunds += ret.refund_amount;
    totalShippingCosts += ret.shipping_cost;
    totalRestockingFees += ret.restocking_fee;
  });
  
  // Estimated additional costs (processing, inspection, etc.)
  const estimatedProcessingCost = normalizedReturns.length * 5; // $5 per return
  const estimatedLostInventoryValue = totalRefunds * 0.15; // 15% of items can't be resold
  
  const totalCost = totalRefunds + totalShippingCosts + totalRestockingFees + 
                    estimatedProcessingCost + estimatedLostInventoryValue;
  
  return {
    total_returns: normalizedReturns.length,
    total_refunds: totalRefunds,
    total_shipping_costs: totalShippingCosts,
    total_restocking_fees: totalRestockingFees,
    estimated_processing_cost: estimatedProcessingCost,
    estimated_lost_inventory: estimatedLostInventoryValue,
    total_cost: totalCost,
    avg_cost_per_return: totalCost / normalizedReturns.length
  };
}

// ============================================
// 5. CHANNEL COMPARISON
// ============================================

function compareChannels(normalizedReturns) {
  const channelStats = {};
  
  normalizedReturns.forEach(ret => {
    const channel = ret.channel;
    if (!channelStats[channel]) {
      channelStats[channel] = {
        channel: channel,
        total_returns: 0,
        total_refunds: 0,
        total_shipping: 0,
        reasons: {}
      };
    }
    
    channelStats[channel].total_returns++;
    channelStats[channel].total_refunds += ret.refund_amount;
    channelStats[channel].total_shipping += ret.shipping_cost;
    
    const reason = ret.return_reason;
    channelStats[channel].reasons[reason] = (channelStats[channel].reasons[reason] || 0) + 1;
  });
  
  return Object.values(channelStats).map(stat => {
    const topReason = Object.entries(stat.reasons)
      .sort((a, b) => b[1] - a[1])[0];
    
    return {
      ...stat,
      avg_refund: stat.total_refunds / stat.total_returns,
      avg_shipping: stat.total_shipping / stat.total_returns,
      top_reason: topReason ? topReason[0] : 'Unknown',
      top_reason_count: topReason ? topReason[1] : 0
    };
  }).sort((a, b) => b.total_returns - a.total_returns);
}

// ============================================
// 6. TIME SERIES ANALYSIS
// ============================================

function analyzeTimeSeriesData(normalizedReturns) {
  const dailyStats = {};
  
  normalizedReturns.forEach(ret => {
    const date = ret.return_date;
    if (!dailyStats[date]) {
      dailyStats[date] = {
        date: date,
        returns: 0,
        refunds: 0,
        shipping_costs: 0
      };
    }
    
    dailyStats[date].returns++;
    dailyStats[date].refunds += ret.refund_amount;
    dailyStats[date].shipping_costs += ret.shipping_cost;
  });
  
  return Object.values(dailyStats)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

// ============================================
// 7. SUSTAINABILITY IMPACT
// ============================================

function calculateSustainabilityImpact(normalizedReturns) {
  // Average CO2 emissions per return shipment
  const CO2_PER_RETURN_KG = 2.5; // kg of CO2 per return shipment
  const PACKAGING_WASTE_PER_RETURN_KG = 0.3; // kg of packaging waste
  
  const totalReturns = normalizedReturns.length;
  const totalCO2 = totalReturns * CO2_PER_RETURN_KG;
  const totalPackagingWaste = totalReturns * PACKAGING_WASTE_PER_RETURN_KG;
  
  // Calculate miles driven equivalent (avg car emits 0.4kg CO2 per mile)
  const equivalentMilesDriven = totalCO2 / 0.4;
  
  return {
    total_returns: totalReturns,
    total_co2_kg: totalCO2,
    total_co2_tons: (totalCO2 / 1000).toFixed(2),
    total_packaging_waste_kg: totalPackagingWaste,
    equivalent_miles_driven: Math.round(equivalentMilesDriven),
    trees_needed_to_offset: Math.round(totalCO2 / 21) // One tree absorbs ~21kg CO2/year
  };
}

// ============================================
// 8. ACTIONABLE RECOMMENDATIONS ENGINE
// ============================================

function generateRecommendations(normalizedReturns) {
  const recommendations = [];
  
  // Analyze serial returners
  const serialReturners = detectSerialReturners(normalizedReturns, 3);
  if (serialReturners.length > 0) {
    const topReturner = serialReturners[0];
    recommendations.push({
      type: 'fraud_risk',
      priority: 'high',
      title: `Serial Returner Detected: ${topReturner.customer_id}`,
      description: `Customer has ${topReturner.total_returns} returns totaling $${topReturner.total_refunded.toFixed(2)}`,
      action: `Flag account for review or implement purchase restrictions`,
      potential_savings: topReturner.total_refunded * 0.5 // Could prevent 50% of future returns
    });
  }
  
  // Analyze problematic products
  const products = analyzeProducts(normalizedReturns);
  const highReturnProducts = products.filter(p => p.return_rate > 30);
  
  highReturnProducts.forEach(product => {
    if (product.dominant_reason === 'Size Issue') {
      recommendations.push({
        type: 'product_issue',
        priority: 'high',
        title: `Sizing Issue: ${product.product_name}`,
        description: `${product.return_rate}% return rate due to sizing (${product.dominant_reason_percent}% of returns)`,
        action: `Update size chart, add fit guide, or adjust sizing`,
        potential_savings: product.total_refunded * 0.7 // Could prevent 70% with better sizing info
      });
    } else if (product.dominant_reason === 'Defective' || product.dominant_reason === 'Quality Issue') {
      recommendations.push({
        type: 'quality_issue',
        priority: 'critical',
        title: `Quality Problem: ${product.product_name}`,
        description: `${product.return_rate}% return rate due to defects/quality`,
        action: `Contact supplier/manufacturer, inspect current inventory batch`,
        potential_savings: product.total_refunded
      });
    }
  });
  
  // Analyze shipping costs
  const financialImpact = calculateFinancialImpact(normalizedReturns);
  if (financialImpact.total_shipping_costs > financialImpact.total_refunds * 0.15) {
    recommendations.push({
      type: 'cost_optimization',
      priority: 'medium',
      title: `High Shipping Costs`,
      description: `Shipping costs are ${((financialImpact.total_shipping_costs / financialImpact.total_refunds) * 100).toFixed(1)}% of refund value`,
      action: `Implement regional return centers or negotiate better carrier rates`,
      potential_savings: financialImpact.total_shipping_costs * 0.3 // 30% reduction possible
    });
  }
  
  // Sort by potential savings
  return recommendations.sort((a, b) => b.potential_savings - a.potential_savings);
}

// ============================================
// 9. MASTER ANALYTICS FUNCTION
// ============================================

function generateCompleteAnalytics(normalizedReturns) {
  return {
    summary: {
      total_returns: normalizedReturns.length,
      date_range: {
        start: normalizedReturns[0]?.return_date || 'N/A',
        end: normalizedReturns[normalizedReturns.length - 1]?.return_date || 'N/A'
      }
    },
    serial_returners: detectSerialReturners(normalizedReturns),
    product_analysis: analyzeProducts(normalizedReturns),
    return_reasons: analyzeReturnReasons(normalizedReturns),
    financial_impact: calculateFinancialImpact(normalizedReturns),
    channel_comparison: compareChannels(normalizedReturns),
    time_series: analyzeTimeSeriesData(normalizedReturns),
    sustainability: calculateSustainabilityImpact(normalizedReturns),
    recommendations: generateRecommendations(normalizedReturns)
  };
}

// ============================================
// 10. EXPORT
// ============================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateCompleteAnalytics,
    detectSerialReturners,
    analyzeProducts,
    analyzeReturnReasons,
    calculateFinancialImpact,
    compareChannels,
    analyzeTimeSeriesData,
    calculateSustainabilityImpact,
    generateRecommendations
  };
}

// ============================================
// 11. USAGE EXAMPLE
// ============================================

/*
USAGE:

// After normalizing data from Step 2:
const normalizedReturns = normalizeReturns(csvData, headers);

// Generate all analytics:
const analytics = generateCompleteAnalytics(normalizedReturns);

console.log('Serial Returners:', analytics.serial_returners);
console.log('Top Return Reasons:', analytics.return_reasons);
console.log('Financial Impact:', analytics.financial_impact);
console.log('Recommendations:', analytics.recommendations);
*/