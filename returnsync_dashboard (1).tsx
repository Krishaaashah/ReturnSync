import React, { useState } from 'react';
import { Upload, Plus, AlertCircle, TrendingDown, Package, MapPin, Leaf, Truck, DollarSign, BarChart3, X } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// ============================================
// NORMALIZATION ENGINE
// ============================================

const REASON_MAPPING = {
  'too small': 'Size Issue', 'size too small': 'Size Issue', 'too large': 'Size Issue',
  'doesn\'t fit': 'Size Issue', 'wrong size': 'Size Issue', 'fit issues': 'Size Issue',
  'uncomfortable fit': 'Size Issue', 'defective': 'Defective', 'defective product': 'Defective',
  'poor quality': 'Quality Issue', 'quality': 'Quality Issue', 'wrong color': 'Wrong Item',
  'not as described': 'Not As Described', 'changed mind': 'Buyer Remorse',
  'no longer needed': 'Buyer Remorse', 'compatibility': 'Compatibility Issue'
};

const SKU_CATALOG = {
  'B08XYZ1234': 'SKU-8821', 'B07ABC5678': 'SKU-5523', 'B09DEF3456': 'SKU-3341',
  'B06GHI7890': 'SKU-7762', 'B05JKL2345': 'SKU-2234'
};

function detectPlatform(headers) {
  const headerStr = headers.join(',').toLowerCase();
  if (headerStr.includes('amazon order id') || headerStr.includes('asin')) return 'Amazon';
  if (headerStr.includes('order number') && headerStr.includes('return id')) return 'Shopify';
  if (headerStr.includes('orderref') || headerStr.includes('warehousecode')) return 'DTC';
  return 'Unknown';
}

function normalizeReturnReason(rawReason) {
  if (!rawReason) return 'Other';
  const lower = rawReason.toLowerCase().trim();
  for (const [key, normalized] of Object.entries(REASON_MAPPING)) {
    if (lower.includes(key)) return normalized;
  }
  return 'Other';
}

function normalizeSKU(skuField, asinField, productName) {
  if (skuField && skuField.startsWith('SKU-')) return skuField;
  if (asinField && SKU_CATALOG[asinField]) return SKU_CATALOG[asinField];
  if (productName) {
    const lower = productName.toLowerCase();
    const productMap = {
      'wireless headphones': 'SKU-8821', 'cotton t-shirt': 'SKU-5523',
      'running shoes': 'SKU-3341', 'laptop stand': 'SKU-7762', 'phone case': 'SKU-2234'
    };
    for (const [key, sku] of Object.entries(productMap)) {
      if (lower.includes(key)) return sku;
    }
  }
  return skuField || asinField || 'UNKNOWN-SKU';
}

function extractCity(warehouseLocation, channel) {
  const cityMap = {
    'CA': 'Los Angeles', 'California': 'Los Angeles',
    'NY': 'New York', 'New York': 'New York',
    'TX': 'Dallas', 'Texas': 'Dallas',
    'PHX5': 'Phoenix', 'DFW6': 'Dallas', 'ATL2': 'Atlanta',
    'WH-CA': 'Los Angeles', 'WH-NY': 'New York', 'WH-TX': 'Dallas'
  };
  return cityMap[warehouseLocation] || cityMap[channel] || 'Unknown';
}

function normalizeReturns(csvData, headers) {
  const platform = detectPlatform(headers);
  
  return csvData.map(row => {
    let normalized = {};
    
    if (platform === 'Shopify') {
      normalized = {
        return_id: row['Return ID'],
        brand: 'Brand ' + (row['Product SKU'] || '').split('-')[1]?.charAt(0) || 'A',
        order_id: row['Order Number'],
        product_category: (row['Product Title'] || '').includes('Headphones') ? 'Electronics' :
                         (row['Product Title'] || '').includes('Shirt') ? 'Apparel' :
                         (row['Product Title'] || '').includes('Shoes') ? 'Footwear' : 'Other',
        product_name: row['Product Title'],
        sku: row['Product SKU'],
        return_date: row['Return Date'],
        return_reason: normalizeReturnReason(row['Reason']),
        city: 'New York',
        channel: 'Shopify',
        refund_amount: parseFloat(row['Refund Total']) || 0,
        shipping_cost: parseFloat(row['Shipping Cost']) || 0,
        return_cost: (parseFloat(row['Refund Total']) || 0) + (parseFloat(row['Shipping Cost']) || 0)
      };
    } else if (platform === 'Amazon') {
      normalized = {
        return_id: row['Return Request ID'],
        brand: 'Brand ' + (row['ASIN'] || '').charAt(3) || 'B',
        order_id: row['Amazon Order ID'],
        product_category: (row['Product Name'] || '').includes('Headphones') ? 'Electronics' :
                         (row['Product Name'] || '').includes('Shirt') ? 'Apparel' :
                         (row['Product Name'] || '').includes('Shoes') ? 'Footwear' : 'Other',
        product_name: row['Product Name'],
        sku: normalizeSKU(null, row['ASIN'], row['Product Name']),
        return_date: row['Return Date'],
        return_reason: normalizeReturnReason(row['Return Reason Description']),
        city: extractCity(row['Fulfillment Center'], 'Amazon'),
        channel: 'Amazon',
        refund_amount: parseFloat(row['Item Price']) || 0,
        shipping_cost: 8.50,
        return_cost: (parseFloat(row['Item Price']) || 0) + 8.50
      };
    } else if (platform === 'DTC') {
      normalized = {
        return_id: row['ReturnID'],
        brand: 'Brand ' + (row['SKU'] || '').split('-')[1]?.charAt(0) || 'C',
        order_id: row['OrderRef'],
        product_category: (row['ItemName'] || '').includes('Headphones') ? 'Electronics' :
                         (row['ItemName'] || '').includes('Shirt') ? 'Apparel' :
                         (row['ItemName'] || '').includes('Shoes') ? 'Footwear' : 'Other',
        product_name: row['ItemName'],
        sku: row['SKU'],
        return_date: row['ProcessedDate'],
        return_reason: normalizeReturnReason(row['ReturnCategory'] + ' ' + row['Notes']),
        city: extractCity(row['WarehouseCode'], 'DTC'),
        channel: 'DTC Website',
        refund_amount: parseFloat(row['RefundIssued']) || 0,
        shipping_cost: parseFloat(row['ReturnShippingCost']) || 0,
        return_cost: (parseFloat(row['RefundIssued']) || 0) + (parseFloat(row['ReturnShippingCost']) || 0)
      };
    }
    
    return normalized;
  });
}

// ============================================
// CONSOLIDATION ENGINE (MOST IMPORTANT)
// ============================================

function detectConsolidationOpportunities(returns) {
  // Group returns by city and date
  const groups = {};
  
  returns.forEach(ret => {
    const key = `${ret.city}_${ret.return_date}`;
    if (!groups[key]) {
      groups[key] = {
        city: ret.city,
        date: ret.return_date,
        returns: [],
        brands: new Set(),
        total_cost: 0
      };
    }
    groups[key].returns.push(ret);
    groups[key].brands.add(ret.brand);
    groups[key].total_cost += ret.return_cost;
  });
  
  // Find consolidation opportunities (2+ brands same city/date)
  const opportunities = Object.values(groups)
    .filter(g => g.brands.size >= 2)
    .map(g => {
      const individualPickupCost = g.returns.length * 12; // $12 per pickup
      const consolidatedPickupCost = 25; // Single consolidated pickup
      const savings = individualPickupCost - consolidatedPickupCost;
      const co2Saved = g.returns.length * 2.5 - 2.5; // kg CO2
      
      return {
        ...g,
        brands: Array.from(g.brands),
        pickup_count: g.returns.length,
        individual_cost: individualPickupCost,
        consolidated_cost: consolidatedPickupCost,
        savings: savings,
        co2_saved: co2Saved,
        efficiency_gain: ((savings / individualPickupCost) * 100).toFixed(0)
      };
    })
    .sort((a, b) => b.savings - a.savings);
  
  return opportunities;
}

// ============================================
// ANALYTICS ENGINE
// ============================================

function generateCompleteAnalytics(returns) {
  // Brand Analysis
  const brandStats = {};
  returns.forEach(ret => {
    if (!brandStats[ret.brand]) {
      brandStats[ret.brand] = {
        brand: ret.brand,
        returns: 0,
        total_cost: 0,
        cities: new Set()
      };
    }
    brandStats[ret.brand].returns++;
    brandStats[ret.brand].total_cost += ret.return_cost;
    brandStats[ret.brand].cities.add(ret.city);
  });
  const brands = Object.values(brandStats)
    .map(b => ({ ...b, cities: Array.from(b.cities), avg_cost: b.total_cost / b.returns }))
    .sort((a, b) => b.total_cost - a.total_cost);
  
  // Category Analysis
  const categoryStats = {};
  returns.forEach(ret => {
    if (!categoryStats[ret.product_category]) {
      categoryStats[ret.product_category] = { category: ret.product_category, count: 0, cost: 0 };
    }
    categoryStats[ret.product_category].count++;
    categoryStats[ret.product_category].cost += ret.return_cost;
  });
  const categories = Object.values(categoryStats).sort((a, b) => b.count - a.count);
  
  // Reason Analysis
  const reasonStats = {};
  returns.forEach(ret => {
    reasonStats[ret.return_reason] = (reasonStats[ret.return_reason] || 0) + 1;
  });
  const reasons = Object.entries(reasonStats)
    .map(([reason, count]) => ({ reason, count, percentage: ((count / returns.length) * 100).toFixed(1) }))
    .sort((a, b) => b.count - a.count);
  
  // City Analysis
  const cityStats = {};
  returns.forEach(ret => {
    if (!cityStats[ret.city]) {
      cityStats[ret.city] = { city: ret.city, returns: 0, cost: 0, brands: new Set() };
    }
    cityStats[ret.city].returns++;
    cityStats[ret.city].cost += ret.return_cost;
    cityStats[ret.city].brands.add(ret.brand);
  });
  const cities = Object.values(cityStats)
    .map(c => ({ ...c, brands: Array.from(c.brands) }))
    .sort((a, b) => b.returns - a.returns);
  
  // Financial Summary
  const totalCost = returns.reduce((sum, r) => sum + r.return_cost, 0);
  const totalRefunds = returns.reduce((sum, r) => sum + r.refund_amount, 0);
  const totalShipping = returns.reduce((sum, r) => sum + r.shipping_cost, 0);
  
  // Consolidation Opportunities
  const consolidation = detectConsolidationOpportunities(returns);
  const totalSavings = consolidation.reduce((sum, opp) => sum + opp.savings, 0);
  const totalCO2Saved = consolidation.reduce((sum, opp) => sum + opp.co2_saved, 0);
  
  // Sustainability
  const currentCO2 = returns.length * 2.5;
  const optimizedCO2 = currentCO2 - totalCO2Saved;
  
  // Insights & Recommendations
  const insights = [];
  
  // High-cost brands
  const highCostBrand = brands[0];
  if (highCostBrand && highCostBrand.total_cost > totalCost * 0.3) {
    insights.push({
      type: 'cost_alert',
      priority: 'high',
      title: `High Return Cost: ${highCostBrand.brand}`,
      description: `${highCostBrand.brand} accounts for $${highCostBrand.total_cost.toFixed(2)} (${((highCostBrand.total_cost / totalCost) * 100).toFixed(0)}% of total)`,
      action: 'Review product quality or return policy'
    });
  }
  
  // Consolidation opportunities
  if (consolidation.length > 0) {
    insights.push({
      type: 'consolidation',
      priority: 'critical',
      title: `${consolidation.length} Consolidation Opportunities Found`,
      description: `Consolidating pickups could save $${totalSavings.toFixed(2)} and reduce ${totalCO2Saved.toFixed(1)}kg CO₂`,
      action: 'Enable shared pickup routes'
    });
    
    consolidation.slice(0, 2).forEach(opp => {
      insights.push({
        type: 'consolidation_detail',
        priority: 'medium',
        title: `Consolidate ${opp.city} on ${opp.date}`,
        description: `${opp.pickup_count} pickups from ${opp.brands.length} brands - Save $${opp.savings.toFixed(2)}`,
        action: 'Schedule consolidated pickup'
      });
    });
  }
  
  // High return category
  if (categories.length > 0 && categories[0].count > returns.length * 0.3) {
    insights.push({
      type: 'category_alert',
      priority: 'medium',
      title: `High Return Rate: ${categories[0].category}`,
      description: `${categories[0].count} returns (${((categories[0].count / returns.length) * 100).toFixed(0)}% of total)`,
      action: 'Investigate product issues or sizing'
    });
  }
  
  return {
    summary: {
      total_returns: returns.length,
      total_cost: totalCost,
      total_refunds: totalRefunds,
      total_shipping: totalShipping,
      potential_savings: totalSavings
    },
    brands,
    categories,
    reasons,
    cities,
    consolidation,
    sustainability: {
      current_co2_kg: currentCO2,
      optimized_co2_kg: optimizedCO2,
      co2_saved: totalCO2Saved,
      reduction_percent: ((totalCO2Saved / currentCO2) * 100).toFixed(1)
    },
    insights
  };
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ReturnSyncDashboard() {
  const [returns, setReturns] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCSVUpload = async (event) => {
    const files = Array.from(event.target.files);
    setLoading(true);
    
    try {
      const allData = [];
      for (const file of files) {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        const rows = lines.slice(1).map(line => {
          const values = line.split(',');
          const row = {};
          headers.forEach((header, i) => {
            row[header] = values[i]?.trim() || '';
          });
          return row;
        });
        const normalized = normalizeReturns(rows, headers);
        allData.push(...normalized);
      }
      
      const combined = [...returns, ...allData];
      setReturns(combined);
      setAnalytics(generateCompleteAnalytics(combined));
    } catch (error) {
      console.error('Error:', error);
      alert('Error processing CSV');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (formData) => {
    const newReturn = {
      return_id: `MAN-${Date.now()}`,
      brand: formData.brand,
      order_id: formData.orderId,
      product_category: formData.category,
      product_name: formData.product || 'Manual Entry',
      return_date: formData.date,
      return_reason: formData.reason,
      city: formData.city,
      channel: 'Manual Entry',
      refund_amount: parseFloat(formData.refund) || 0,
      shipping_cost: parseFloat(formData.shipping) || 0,
      return_cost: (parseFloat(formData.refund) || 0) + (parseFloat(formData.shipping) || 0)
    };
    
    const combined = [...returns, newReturn];
    setReturns(combined);
    setAnalytics(generateCompleteAnalytics(combined));
    setShowManualEntry(false);
  };

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-gray-900 mb-2">ReturnSync</h1>
            <p className="text-xl text-gray-600">Centralized Multi-Brand Return Intelligence</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-12">
            <h2 className="text-2xl font-semibold mb-8 text-center">Get Started</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition">
                <Upload className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Upload CSV Files</h3>
                <p className="text-gray-600 text-sm mb-4">Import returns from multiple brands/platforms</p>
                <label className="cursor-pointer">
                  <input type="file" multiple accept=".csv" onChange={handleCSVUpload} className="hidden" />
                  <div className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
                    {loading ? 'Processing...' : 'Select Files'}
                  </div>
                </label>
              </div>
              
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-green-500 transition">
                <Plus className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Manual Entry</h3>
                <p className="text-gray-600 text-sm mb-4">Add individual return records</p>
                <button 
                  onClick={() => setShowManualEntry(true)}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                >
                  Enter Return
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {showManualEntry && <ManualEntryModal onSubmit={handleManualSubmit} onClose={() => setShowManualEntry(false)} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ReturnSync Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Managing {analytics.summary.total_returns} returns across {analytics.brands.length} brands
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowManualEntry(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Return
            </button>
            <label className="cursor-pointer">
              <input type="file" multiple accept=".csv" onChange={handleCSVUpload} className="hidden" />
              <div className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Import CSV
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <Package className="w-8 h-8 text-blue-500" />
            <span className="text-2xl font-bold text-gray-900">{analytics.summary.total_returns}</span>
          </div>
          <p className="text-gray-600 text-sm">Total Returns</p>
        </div>
        
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-red-500" />
            <span className="text-2xl font-bold text-gray-900">${(analytics.summary.total_cost / 1000).toFixed(1)}K</span>
          </div>
          <p className="text-gray-600 text-sm">Return Costs</p>
        </div>
        
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <Truck className="w-8 h-8 text-orange-500" />
            <span className="text-2xl font-bold text-gray-900">{analytics.consolidation.length}</span>
          </div>
          <p className="text-gray-600 text-sm">Consolidation Opportunities</p>
        </div>
        
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingDown className="w-8 h-8 text-green-500" />
            <span className="text-2xl font-bold text-green-600">${analytics.summary.potential_savings.toFixed(0)}</span>
          </div>
          <p className="text-gray-600 text-sm">Potential Savings</p>
        </div>
        
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <Leaf className="w-8 h-8 text-green-600" />
            <span className="text-2xl font-bold text-gray-900">{analytics.sustainability.reduction_percent}%</span>
          </div>
          <p className="text-gray-600 text-sm">CO₂ Reduction</p>
        </div>
      </div>

      {/* Critical Insights */}
      {analytics.insights.length > 0 && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-3">🚨 Actionable Insights</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {analytics.insights.slice(0, 4).map((insight, i) => (
                    <div key={i} className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          insight.priority === 'critical' ? 'bg-red-500' :
                          insight.priority === 'high' ? 'bg-orange-500' : 'bg-yellow-500'
                        }`} />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 text-sm">{insight.title}</div>
                          <div className="text-gray-600 text-xs mt-1">{insight.description}</div>
                          <div className="text-blue-600 text-xs mt-2 font-medium">→ {insight.action}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Consolidation Opportunities (MOST IMPORTANT) */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              Pickup Consolidation Opportunities
            </h3>
            <div className="text-sm text-gray-600">
              Potential savings: <span className="font-bold text-green-600">${analytics.summary.potential_savings.toFixed(2)}</span>
            </div>
          </div>
          
          {analytics.consolidation.length > 0 ? (
            <div className="space-y-3">
              {analytics.consolidation.map((opp, i) => (
                <div key={i} className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <MapPin className="w-5 h-5 text-blue-600" />
                        <div className="font-semibold text-gray-900">{opp.city}</div>
                        <div className="text-sm text-gray-600">{opp.date}</div>
                        <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                          {opp.pickup_count} pickups
                        </div>
                      </div>
                      <div className="ml-8 text-sm text-gray-600 mb-2">
                        Brands: {opp.brands.join(', ')}
                      </div>
                      <div className="ml-8 grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Individual Cost:</span>
                          <span className="ml-2 font-semibold text-red-600">${opp.individual_cost}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Consolidated:</span>
                          <span className="ml-2 font-semibold text-green-600">${opp.consolidated_cost}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Savings:</span>
                          <span className="ml-2 font-semibold text-green-700">${opp.savings} ({opp.efficiency_gain}%)</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-600 mb-1">CO₂ Saved</div>
                      <div className="text-lg font-bold text-green-600">{opp.co2_saved.toFixed(1)}kg</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              No consolidation opportunities found. Add more returns to detect patterns.
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Brand Analysis */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Returns by Brand</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={analytics.brands}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="brand" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="returns" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {analytics.brands.slice(0, 3).map((brand, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="text-gray-700">{brand.brand}</span>
                <div className="flex gap-4">
                  <span className="text-gray-600">{brand.returns} returns</span>
                  <span className="font-semibold text-red-600">${brand.total_cost.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Returns by Category</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={analytics.categories}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={entry => entry.category}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {analytics.categories.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* City Hotspots */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Return Hotspots by City
          </h3>
          <div className="space-y-3">
            {analytics.cities.map((city, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold text-gray-900">{city.city}</div>
                    <div className="text-sm text-gray-600">{city.brands.length} brands</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{city.returns}</div>
                    <div className="text-xs text-gray-600">returns</div>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  Total cost: <span className="font-semibold text-red-600">${city.cost.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Return Reasons */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Top Return Reasons</h3>
          <div className="space-y-3">
            {analytics.reasons.map((reason, i) => (
              <div key={i}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-gray-700 text-sm">{reason.reason}</span>
                  <span className="text-sm font-semibold text-gray-900">{reason.count} ({reason.percentage}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${reason.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sustainability Impact */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow p-6 border border-green-200">
          <div className="flex items-center gap-3 mb-4">
            <Leaf className="w-6 h-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Sustainability Impact</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Current Emissions</div>
              <div className="text-2xl font-bold text-red-600">{analytics.sustainability.current_co2_kg.toFixed(1)} kg</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">After Consolidation</div>
              <div className="text-2xl font-bold text-green-600">{analytics.sustainability.optimized_co2_kg.toFixed(1)} kg</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">CO₂ Reduction</div>
              <div className="text-2xl font-bold text-green-700">{analytics.sustainability.reduction_percent}%</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Trees to Offset</div>
              <div className="text-2xl font-bold text-gray-900">{Math.round(analytics.sustainability.co2_saved / 21)}</div>
            </div>
          </div>
        </div>
      </div>
      
      {showManualEntry && <ManualEntryModal onSubmit={handleManualSubmit} onClose={() => setShowManualEntry(false)} />}
    </div>
  );
}

// ============================================
// MANUAL ENTRY MODAL
// ============================================

function ManualEntryModal({ onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    brand: '',
    orderId: '',
    category: '',
    reason: '',
    city: '',
    date: new Date().toISOString().split('T')[0],
    refund: '',
    shipping: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-8" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Add Return Manually</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand *</label>
              <input
                type="text"
                required
                value={formData.brand}
                onChange={e => setFormData({...formData, brand: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Brand A"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order ID *</label>
              <input
                type="text"
                required
                value={formData.orderId}
                onChange={e => setFormData({...formData, orderId: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., ORD-12345"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                required
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select category</option>
                <option value="Electronics">Electronics</option>
                <option value="Apparel">Apparel</option>
                <option value="Footwear">Footwear</option>
                <option value="Home & Kitchen">Home & Kitchen</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Return Reason *</label>
              <select
                required
                value={formData.reason}
                onChange={e => setFormData({...formData, reason: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select reason</option>
                <option value="Size Issue">Size Issue</option>
                <option value="Defective">Defective</option>
                <option value="Quality Issue">Quality Issue</option>
                <option value="Wrong Item">Wrong Item</option>
                <option value="Buyer Remorse">Buyer Remorse</option>
                <option value="Not As Described">Not As Described</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
              <select
                required
                value={formData.city}
                onChange={e => setFormData({...formData, city: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select city</option>
                <option value="New York">New York</option>
                <option value="Los Angeles">Los Angeles</option>
                <option value="Chicago">Chicago</option>
                <option value="Dallas">Dallas</option>
                <option value="Phoenix">Phoenix</option>
                <option value="Atlanta">Atlanta</option>
                <option value="San Francisco">San Francisco</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Return Date *</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Refund Amount ($) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.refund}
                onChange={e => setFormData({...formData, refund: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Cost ($) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.shipping}
                onChange={e => setFormData({...formData, shipping: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Add Return
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}