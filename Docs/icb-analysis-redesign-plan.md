# ICB Analysis Tab Redesign Plan

## Project Overview
Redesign the ICB Analysis tab to provide comprehensive Integrated Care Board performance analysis with three distinct sub-tabs. Fix current runtime error and create meaningful regional intelligence dashboard.

## Current Issues
- **Runtime Error**: `getTrustData is not defined` in `src/app/dashboard/icb-analysis/page.tsx`
- Current implementation doesn't effectively utilize ICB-trust relationships
- Limited functionality compared to trust-level analysis capabilities

## Data Analysis Results
- **38 unique ICBs** in the dataset
- **ICB-Trust relationships** fully mapped via `icb_code` and `icb_name` fields
- **Top ICBs by trust count**:
  - NHS North East and North Cumbria ICB (NOE): 11 trusts
  - NHS Cheshire and Merseyside ICB (CHA): 7 trusts  
  - NHS Greater Manchester ICB (GRM): 6 trusts
  - NHS West Yorkshire ICB (WEY): 6 trusts
- **Data consistency**: Each trust belongs to exactly one ICB across all time periods

## Three-Tab Architecture

### Tab 1: ICB Overview Dashboard
**Purpose**: ICB-focused version of the main overview page with aggregated metrics

#### Initial State (No ICB Selected)
- **Selection Interface**: Professional ICB selection screen
- **ICB Dropdown**: Searchable dropdown showing all 38 ICBs
- **ICB Preview Cards**: Brief summary metrics for each ICB in dropdown
- **Call-to-action**: Clear instruction to select an ICB for detailed analysis

#### Selected ICB State
**Header Section**:
- ICB name and code display
- Trust count indicator
- "Back to ICB Selection" button

**KPI Cards (4 cards matching overview page design)**:
1. **Average RTT Compliance**: Mean RTT performance across all trusts in ICB
2. **Total 52+ Week Waiters**: Sum of 52+ week breaches across all ICB trusts
3. **Total Waiting List**: Aggregated incomplete pathways across ICB
4. **Average A&E Performance**: Mean A&E 4-hour performance across ICB trusts

**Chart Grid (2x2 layout)**:
1. **ICB Performance vs 92% Target**: Line chart showing aggregated ICB RTT performance over time
2. **Total Patients Awaiting Treatment**: Bar chart of total waiting lists across ICB
3. **Average Wait Time**: Area chart of mean waiting times across ICB trusts
4. **Breach Breakdown**: Stacked bar chart of 52/65/78 week breaches (ICB totals)

#### Sub-tabs within ICB Overview
- **Performance Trends**: Focus on time-series charts and trend analysis
- **Trust Breakdown**: Detailed list of individual trusts within selected ICB
  - Trust performance cards
  - Click-through to individual trust analysis
  - Performance ranking within ICB

### Tab 2: ICB Performance Rankings
**Purpose**: Comprehensive league table of all ICBs ranked by performance metrics

#### Features
**Sortable Performance Table**:
- ICB Name & Code
- Number of Trusts
- Average RTT Compliance (%)
- Total 52+ Week Waiters (count)
- Average A&E Performance (%)
- Overall Performance Score (calculated composite metric)

**Interactive Elements**:
- **Click-to-drill-down**: Clicking any ICB row switches to Tab 1 with that ICB selected
- **Column sorting**: Sort by any metric column
- **Performance indicators**: Color-coded rows and performance badges
- **Search/filter**: Filter ICBs by name or performance thresholds

**Summary Statistics Panel**:
- Best performing ICB
- Worst performing ICB  
- National averages
- Performance distribution insights

### Tab 3: Regional Map (Coming Soon)
**Current Implementation**: Professional "Coming Soon" page with clear roadmap

#### Coming Soon Page Design
- **Hero section**: Large map placeholder graphic
- **Feature preview**: Description of planned interactive map functionality
- **Timeline**: Expected delivery information
- **Alternative actions**: Links to other analysis tabs

#### Future Vision (for reference)
- Interactive map of England showing ICB boundaries
- Color-coded regions based on performance metrics
- Click regions to drill down to ICB details
- Geographic performance pattern analysis
- Regional comparison tools

## Data Processing Strategy

### ICB Aggregation Logic
**Metric Calculations**:
- **Averages**: RTT compliance, A&E performance (mean across trusts within ICB)
- **Sums**: Total waiting lists, breach counts (sum across all trusts in ICB)
- **Counts**: Number of trusts per ICB
- **Temporal**: Monthly ICB metrics calculated from monthly trust data

**Data Structure**:
```typescript
interface ICBMetrics {
  code: string;
  name: string;
  trustCount: number;
  avgRTTCompliance: number;
  totalWaitingList: number;
  total52WeekBreaches: number;
  avgAEPerformance: number;
  monthlyData: Array<{
    period: string;
    rttCompliance: number;
    waitingList: number;
    breaches52Week: number;
    aePerformance: number;
  }>;
  trusts: Array<{
    code: string;
    name: string;
    latestRTT: number;
    latestAE: number;
    waitingList: number;
  }>;
}
```

### Technical Implementation

**Hook Architecture**:
- Create `useICBData` hook for ICB-specific data processing
- Maintain existing `useNHSData` as base data source
- Cache processed ICB aggregations for performance

**Component Structure**:
```
/components/icb/
├── icb-overview-tab.tsx
├── icb-rankings-tab.tsx
├── icb-map-tab.tsx (coming soon)
├── icb-selector.tsx
├── icb-kpi-cards.tsx
├── icb-charts.tsx
└── trust-breakdown-panel.tsx
```

**Performance Considerations**:
- Pre-process ICB aggregations on initial data load
- Use efficient Map/Set data structures for ICB-trust lookups
- Lazy load charts until specific ICB is selected
- Implement proper loading states for data processing

## User Experience Flow

### Navigation Path
1. **Tab Selection**: User clicks "ICB Analysis" in main navigation
2. **Default View**: Overview tab with ICB selection interface
3. **ICB Selection**: User selects ICB from dropdown
4. **Dashboard Display**: Full ICB dashboard with KPIs and charts
5. **Sub-tab Navigation**: Switch between Performance Trends and Trust Breakdown
6. **Cross-tab Analysis**: Use Rankings tab to compare selected ICB with others
7. **Drill-down Options**: Click individual trusts to navigate to trust-specific analysis

### State Management
- **Selected ICB**: Shared state across all three tabs
- **Tab persistence**: Remember last selected tab and ICB
- **Deep linking**: Support URL-based ICB selection
- **Breadcrumb navigation**: Clear path back to ICB selection

## Error Handling & Data Validation

### Current Error Fixes
- Remove undefined `getTrustData` reference
- Implement proper data availability checks
- Add graceful fallbacks for missing ICB data

### Data Quality Considerations
- Handle trusts with missing ICB codes
- Validate ICB-trust relationships
- Provide clear messaging for incomplete data
- Graceful degradation for missing A&E or capacity data

## Success Criteria

### Functional Requirements
- [ ] All three tabs implemented and functional
- [ ] ICB selection interface working with all 38 ICBs
- [ ] KPI cards displaying accurate aggregated metrics
- [ ] Charts rendering with real ICB data
- [ ] Trust breakdown showing individual trust performance
- [ ] Rankings table with sortable columns and drill-down
- [ ] Professional "Coming Soon" page for map tab

### Performance Requirements
- [ ] ICB data processing completes within 2 seconds
- [ ] Smooth transitions between ICB selections
- [ ] Responsive design across desktop and tablet
- [ ] Efficient memory usage with large dataset

### User Experience Requirements
- [ ] Intuitive ICB selection process
- [ ] Clear visual hierarchy and navigation
- [ ] Consistent design with existing dashboard tabs
- [ ] Professional appearance suitable for NHS presentations
- [ ] Accessible design with proper ARIA labels

## File Structure
```
src/
├── app/dashboard/icb-analysis/page.tsx (main container)
├── components/icb/
│   ├── icb-overview-tab.tsx
│   ├── icb-rankings-tab.tsx  
│   ├── icb-map-tab.tsx
│   ├── icb-selector.tsx
│   ├── icb-kpi-cards.tsx
│   └── trust-breakdown.tsx
├── hooks/
│   └── useICBData.ts
└── types/
    └── icb-data.ts (extend existing types)
```

## Implementation Priority
1. **High Priority**: Fix current error and implement ICB Overview tab
2. **Medium Priority**: Build ICB Rankings table with sorting/filtering
3. **Low Priority**: Create professional "Coming Soon" page for map tab
4. **Future Enhancement**: Interactive regional map functionality