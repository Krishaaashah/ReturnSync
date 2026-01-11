# ReturnSync

> Centralized Multi-Brand Return Intelligence & Pickup Consolidation Platform

ReturnSync is a hackathon prototype that solves the $550B e-commerce returns problem by centralizing return data across multiple brands and optimizing reverse logistics through intelligent pickup consolidation.

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [Solution](#solution)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Sample Data Format](#sample-data-format)
- [Technical Implementation](#technical-implementation)
---

## Problem Statement

E-commerce brands face massive inefficiencies in returns management:

- **Fragmented Data**: Returns scattered across Shopify, Amazon, DTC platforms—no unified view
- **Hidden Costs**: $550B annual loss globally; brands can't identify cost leakage patterns
- **Inefficient Logistics**: Each brand schedules separate pickups, even in the same city on the same day
- **No Visibility**: Can't detect serial returners, defective batches, or systemic product issues across channels
- **Environmental Impact**: Redundant pickup routes generate unnecessary CO₂ emissions

**Result**: Brands lose 15-30% on returns due to lack of centralized intelligence and logistics optimization.

---

## Solution

ReturnSync provides a unified platform that:

1. **Centralizes** return data from multiple platforms (Shopify, Amazon, DTC) into one dashboard
2. **Analyzes** patterns across brands, products, categories, and locations
3. **Detects** consolidation opportunities when multiple brands have pickups in the same city/date
4. **Calculates** exact cost savings and CO₂ reduction from shared logistics
5. **Generates** actionable insights and recommendations automatically

### Key Innovation: Multi-Brand Pickup Consolidation

When Brand A, Brand B, and Brand C all have returns in Los Angeles on the same day:

- **Before**: 3 separate courier pickups = $36 + 7.5kg CO₂
- **After**: 1 consolidated pickup = $25 + 2.5kg CO₂
- **Savings**: $11 (31%) + 5kg CO₂ reduction

ReturnSync automatically detects these opportunities and calculates real savings.

---

## Features

### 1. Centralized Return Intake

- **CSV Upload**: Import returns from Shopify, Amazon, DTC platforms
- **Manual Entry**: Add individual returns with complete tracking
- **Auto-Normalization**: Converts platform-specific formats into unified data model

### 2. Multi-Brand Dashboard

- Total returns across all brands
- Returns breakdown by brand, category, product
- Visual analytics (charts, graphs, heatmaps)
- Cross-channel visibility in one place

### 3. Cost Analytics & Leakage Detection

- Total return cost tracking (refunds + shipping + processing)
- High-cost brand identification
- Category-level cost analysis
- Automated alerts for cost anomalies

### 4. Pickup Consolidation Engine (Core Feature)

- Detects same city + same date patterns
- Identifies multi-brand consolidation opportunities
- Calculates:
  - Individual vs. consolidated pickup costs
  - Exact dollar savings per opportunity
  - Efficiency gain percentage
  - CO₂ emissions saved

### 5. Sustainability Impact Tracking

- Current CO₂ emissions from return logistics
- Optimized emissions after consolidation
- Reduction percentage and metrics
- Trees needed to offset (environmental context)

### 6. Intelligent Insights & Recommendations

**Automated Alerts:**
- "Brand X has 35% of total return costs"
- "6 consolidation opportunities found—save $98"
- "Electronics category has 40% return rate"

**Actionable Recommendations:**
- "Consolidate Los Angeles pickups on Dec 1st"
- "Review sizing for SKU-8821 (7 returns due to fit issues)"
- "Flag high-cost brands for policy review"

---

## Architecture

### Technology Stack

- **Frontend**: React 18 with Hooks
- **Charts**: Recharts (responsive data visualization)
- **Styling**: Tailwind CSS
- **Data Processing**: JavaScript (browser-based)
- **Deployment**: Static hosting (no backend required for prototype)

### System Flow

```
┌─────────────────────────────────────────────────────┐
│  DATA INPUT                                         │
│  • CSV Upload (Shopify/Amazon/DTC)                 │
│  • Manual Entry Form                               │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│  NORMALIZATION ENGINE                               │
│  • Platform detection (auto-identify source)        │
│  • Field mapping (standardize column names)         │
│  • Return reason normalization                      │
│  • SKU/ASIN mapping                                │
│  • City/location extraction                         │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│  ANALYTICS ENGINE                                   │
│  • Brand aggregation                               │
│  • Category breakdown                              │
│  • Cost calculation                                │
│  • Reason analysis                                 │
│  • Time series trends                              │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│  CONSOLIDATION ENGINE (CORE LOGIC)                  │
│  • Group by city + date                            │
│  • Detect multi-brand patterns                     │
│  • Calculate cost savings                          │
│  • Compute CO₂ reduction                           │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│  INSIGHTS GENERATOR                                 │
│  • Rule-based recommendations                       │
│  • Priority scoring                                │
│  • Action items                                    │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│  DASHBOARD UI                                       │
│  • Summary cards                                   │
│  • Interactive charts                              │
│  • Consolidation opportunities panel               │
│  • Sustainability metrics                          │
└─────────────────────────────────────────────────────┘
```

---

## Getting Started


https://github.com/user-attachments/assets/51fd5a59-1fbd-4ebf-afd8-e28f1d95999b


### Prerequisites

- Modern web browser (Chrome, Firefox, Safari)
- Node.js 16+ (for local development)
- Sample CSV files (provided)

### Quick Start

#### 1. Clone/Download the project files

```bash
git clone https://github.com/yourusername/returnsync.git
cd returnsync
```

#### 2. Open in browser

**Option A: Direct file open**
```bash
# Simply open index.html in your browser
open index.html
```

**Option B: Local server (recommended)**
```bash
# Using Python
python -m http.server 8000

# OR using Node.js
npx serve .

# Then navigate to http://localhost:8000
```

#### 3. Upload Sample Data

Use the 3 provided CSV files:
- `shopify_returns.csv` (15 returns)
- `amazon_returns.csv` (10 returns)
- `dtc_returns.csv` (10 returns)

Click "Select Files" and upload all 3 at once.

#### 4. Explore Dashboard

- View summary metrics
- Check consolidation opportunities
- Review insights and recommendations

### Manual Entry Demo

1. Click "Add Return" button
2. Fill in the form:
   - **Brand**: "Brand A"
   - **Order ID**: "ORD-9999"
   - **Category**: "Electronics"
   - **Return Reason**: "Size Issue"
   - **City**: "Los Angeles"
   - **Date**: (select same date as existing returns)
   - **Refund**: 79.99
   - **Shipping**: 8.50
3. Submit and watch new consolidation opportunity appear

---

## Sample Data Format

### Shopify CSV Format

```csv
Return ID,Order Number,Customer Email,Product SKU,Product Title,Quantity,Return Date,Reason,Refund Total,Shipping Cost,Status
RET-SHOP-001,#1001,customer@email.com,SKU-8821,Wireless Headphones Pro,1,2024-12-01,Too small,79.99,8.50,Completed
```

### Amazon CSV Format

```csv
Return Request ID,Amazon Order ID,ASIN,Product Name,Buyer Email,Return Reason Code,Return Reason Description,Qty,Item Price,Refund Amount,Return Date,Fulfillment Center
RMA-AMZ-2001,112-9876543-1234567,B08XYZ1234,Wireless Headphones Pro,buyer@marketplace.amazon.com,SIZE_TOO_SMALL,Customer says item too small,1,79.99,79.99,2024-12-01,PHX5
```

### DTC CSV Format

```csv
ReturnID,OrderRef,CustomerID,Email,SKU,ItemName,Units,PurchasePrice,RefundIssued,ShippingRefund,ReturnShippingCost,ProcessedDate,ReturnCategory,Notes,WarehouseCode
DTCRet-5001,WEB-8821-A,CUST-101,customer@email.com,SKU-8821,Wireless Headphones Pro,1,79.99,79.99,0,8.50,2024-12-02,Fit Issues,Customer stated too tight,WH-CA
```




## Technical Implementation

### Normalization Engine

**Platform Detection**: Regex pattern matching on CSV headers

**Return Reason Mapping**: 20+ variants → 7 standardized categories
- Size Issue
- Defective
- Quality Issue
- Wrong Item
- Buyer Remorse
- Not As Described
- Other

**SKU Normalization**: ASIN → SKU mapping, product name fallback

**City Extraction**: Warehouse code → city name mapping

### Consolidation Algorithm

```javascript
// Simplified logic
1. Group returns by: city + date
2. Filter groups with 2+ brands
3. Calculate savings:
   - Individual cost = returns_count × $12
   - Consolidated cost = $25 (fixed)
   - Savings = individual - consolidated
4. Calculate CO₂:
   - Individual emissions = returns_count × 2.5kg
   - Consolidated = 2.5kg (one trip)
   - Reduction = individual - consolidated
5. Sort by savings (descending)
```

### Data Model

```javascript
{
  return_id: string,
  brand: string,
  order_id: string,
  product_category: string,
  product_name: string,
  sku: string,
  return_date: string,
  return_reason: string,
  city: string,
  channel: string,
  refund_amount: number,
  shipping_cost: number,
  return_cost: number
}
```

---

## UI/UX Design

### Design Principles

- **Clean Dashboard**: Summary cards → Detailed views
- **Color Coding**: 
  - Red for costs/alerts
  - Green for savings/sustainability
  - Blue for neutral data
- **Interactive Charts**: Click products for deep-dive analysis
- **Priority Indicators**: Critical/High/Medium for insights
- **Responsive Design**: Works on desktop and tablet

### Component Structure

```
ReturnSyncDashboard
├── UploadSection
├── SummaryCards
│   ├── TotalReturns
│   ├── TotalCost
│   ├── ConsolidationOpportunities
│   ├── PotentialSavings
│   └── CO2Reduction
├── InsightsPanel
├── ConsolidationPanel (CORE FEATURE)
├── Analytics
│   ├── BrandAnalysis
│   ├── CategoryBreakdown
│   ├── CityHotspots
│   └── ReturnReasons
├── SustainabilityImpact
└── ManualEntryModal
```

---

## Project Structure

```
returnsync/
├── index.html
├── README.md
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx
│   │   ├── UploadSection.jsx
│   │   ├── ConsolidationPanel.jsx
│   │   └── ManualEntryModal.jsx
│   ├── engines/
│   │   ├── normalization.js
│   │   ├── analytics.js
│   │   └── consolidation.js
│   └── utils/
│       ├── csvParser.js
│       └── constants.js
├── data/
│   ├── shopify_returns.csv
│   ├── amazon_returns.csv
│   └── dtc_returns.csv
└── docs/
    ├── API.md
    └── ARCHITECTURE.md

