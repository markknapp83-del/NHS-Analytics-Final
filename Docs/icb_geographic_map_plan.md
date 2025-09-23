# ICB Geographic Analysis - UK Map Implementation Plan

## Project Overview
Transform the Geographic Analysis tab in the NHS Analytics dashboard to display an interactive UK map colored by ICB (Integrated Care Board) regions based on RTT performance. This will provide sales teams with immediate visual insights into regional NHS performance patterns.

## Current State
- **Tab**: Geographic Analysis (4th tab in ICB Analysis page)
- **Status**: Currently empty/placeholder content
- **URL**: `localhost:3002/dashboard/icb-analysis` (Geographic Analysis tab)
- **Data Available**: ICB codes, names, and trust-level RTT performance data

## Objective
Create an interactive UK map where:
- Each ICB region is colored based on aggregate RTT 18-week performance
- Users can hover for detailed performance metrics
- Users can click regions to see constituent trusts
- Performance legend shows color scale interpretation
- Time period selector allows historical comparison

## Technical Requirements

### Data Processing
- Calculate average RTT performance per ICB from trust-level data
- Handle missing ICB data gracefully
- Create performance rankings and percentile scores
- Support multiple time periods for comparison

### Mapping Technology
- **Primary Option**: D3.js with TopoJSON for precise ICB boundaries
- **Fallback Option**: Simplified SVG regions if boundary data unavailable
- **Integration**: React component with TypeScript support
- **Responsive**: Mobile-friendly with touch interactions

### Visual Design
- **Color Scale**: Red (poor) to Green (excellent) RTT performance
- **NHS Branding**: Consistent with existing dashboard design
- **Accessibility**: Proper contrast ratios and screen reader support
- **Legend**: Clear performance ranges and color meanings

## Implementation Phases

### Phase 1: Data Analysis and Preparation (2-3 hours)

#### Task 1.1: ICB Data Coverage Assessment
```bash
# Claude Code Task: Analyze ICB coverage in CSV dataset
# Action: Determine which ICBs have data and calculate coverage statistics
# Output: icb_coverage_report.md, icb_performance_summary.json
```

**Data Analysis Requirements:**
- Extract unique ICB codes and names from unified_monthly_data_enhanced.csv
- Calculate trust count per ICB
- Compute average RTT performance per ICB
- Identify ICBs with insufficient data (< 3 trusts)
- Create performance rankings and quartiles

**Expected ICB Coverage:**
```typescript
interface ICBAnalysis {
  icb_code: string;
  icb_name: string;
  trust_count: number;
  avg_rtt_performance: number;
  performance_quartile: 1 | 2 | 3 | 4;
  constituent_trusts: string[];
  data_completeness: number; // percentage
}
```

#### Task 1.2: Geographic Boundary Data Research
```bash
# Claude Code Task: Research and obtain UK ICB boundary data
# Action: Find official NHS ICB boundary files in GeoJSON/TopoJSON format
# Output: boundary_data_sources.md, icb_boundaries.json
```

**Boundary Data Sources:**
- **Primary**: NHS Digital Open Geography Portal
- **Secondary**: ONS (Office for National Statistics) boundary data
- **Format**: GeoJSON or TopoJSON for web compatibility
- **Resolution**: Simplified boundaries for web performance

**Validation Requirements:**
- Ensure ICB codes match your CSV data
- Verify boundary completeness (all 42 ICBs in England)
- Check coordinate system (WGS84 for web mapping)

### Phase 2: Map Component Development (4-5 hours)

#### Task 2.1: React Map Component Structure
```bash
# Claude Code Task: Create interactive UK ICB map component
# Action: Build React component with D3.js integration for geographic visualization
# Output: components/charts/icb-geographic-map.tsx
```

**Component Architecture:**
```typescript
// components/charts/icb-geographic-map.tsx
interface ICBGeographicMapProps {
  data: ICBAnalysis[];
  selectedPeriod: string;
  onICBClick?: (icb: ICBAnalysis) => void;
  height?: number;
  className?: string;
}

export function ICBGeographicMap({ 
  data, 
  selectedPeriod, 
  onICBClick, 
  height = 600 
}: ICBGeographicMapProps) {
  // D3.js map rendering logic
  // Color scaling based on RTT performance
  // Interactive hover and click handlers
  // Responsive sizing and mobile optimization
}
```

**Key Features:**
- **Color Scale**: 5-level color scheme (red → amber → yellow → light green → green)
- **Hover States**: Tooltip showing ICB name, performance %, trust count
- **Click Events**: Drill-down to trust-level detail
- **Loading States**: Skeleton while boundary data loads
- **Error Handling**: Fallback for missing boundary data

#### Task 2.2: Performance Color Scaling
```bash
# Claude Code Task: Implement performance-based color scaling system
# Action: Create color scale logic for RTT performance visualization
# Output: lib/map-color-utils.ts
```

**Color Scale Logic:**
```typescript
// lib/map-color-utils.ts
export const getRTTPerformanceColor = (performancePercentage: number): string => {
  if (performancePercentage >= 85) return '#00a650'; // NHS Green - Excellent
  if (performancePercentage >= 75) return '#78be20'; // Light Green - Good
  if (performancePercentage >= 65) return '#ffb81c'; // NHS Amber - Concern
  if (performancePercentage >= 50) return '#ff7f00'; // Orange - Poor
  return '#da291c'; // NHS Red - Critical
}

export const getPerformanceLabel = (performancePercentage: number): string => {
  if (performancePercentage >= 85) return 'Excellent';
  if (performancePercentage >= 75) return 'Good';
  if (performancePercentage >= 65) return 'Needs Attention';
  if (performancePercentage >= 50) return 'Poor';
  return 'Critical';
}
```

#### Task 2.3: Interactive Features Implementation
```bash
# Claude Code Task: Add interactive features to map component
# Action: Implement hover tooltips, click handlers, and drill-down functionality
# Output: Enhanced ICB map with full interactivity
```

**Interactive Elements:**
- **Hover Tooltip**: ICB name, RTT performance, trust count, ranking
- **Click Handler**: Navigate to trust-level detail or open modal
- **Zoom/Pan**: Optional zoom functionality for detailed inspection
- **Responsive Touch**: Mobile-friendly touch interactions

### Phase 3: Dashboard Integration (2-3 hours)

#### Task 3.1: Geographic Analysis Tab Implementation
```bash
# Claude Code Task: Integrate ICB map into Geographic Analysis tab
# Action: Replace placeholder content with interactive ICB map
# Output: Updated Geographic Analysis tab with full functionality
```

**Tab Structure:**
```typescript
// app/dashboard/icb-analysis/page.tsx - Geographic Analysis Tab
export default function GeographicAnalysisTab() {
  const { getTrustData } = useNHSData();
  const [selectedTrust] = useTrustSelection();
  const [selectedPeriod, setSelectedPeriod] = useState('latest');
  
  return (
    <div className="space-y-6">
      {/* Performance Overview Cards */}
      <ICBPerformanceOverview data={icbData} />
      
      {/* Main Map Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>ICB RTT Performance Map</CardTitle>
          <CardDescription>
            Interactive map showing RTT 18-week performance across ICB regions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ICBGeographicMap 
            data={icbAnalysis} 
            selectedPeriod={selectedPeriod}
            onICBClick={handleICBClick}
          />
        </CardContent>
      </Card>
      
      {/* Performance Legend and Rankings */}
      <ICBPerformanceTable data={icbAnalysis} />
    </div>
  );
}
```

#### Task 3.2: Supporting Components
```bash
# Claude Code Task: Create supporting components for ICB analysis
# Action: Build performance overview cards, legend, and ranking table
# Output: Complete ICB analysis dashboard components
```

**Supporting Components:**

**1. ICB Performance Overview Cards:**
```typescript
// Key metrics across all ICBs
const overviewMetrics = [
  {
    title: "Best Performing ICB",
    value: topPerformingICB.name,
    performance: `${topPerformingICB.avg_rtt_performance}%`,
    trend: "+2.1% vs last month"
  },
  {
    title: "Worst Performing ICB", 
    value: worstPerformingICB.name,
    performance: `${worstPerformingICB.avg_rtt_performance}%`,
    trend: "-1.8% vs last month"
  },
  {
    title: "National Average",
    value: `${nationalAverage}%`,
    description: "Across all ICBs"
  },
  {
    title: "ICBs Below 62%",
    value: icbsBelowTarget.length,
    description: "Requiring urgent attention"
  }
];
```

**2. Interactive Legend:**
```typescript
// Color legend with performance ranges
const legendItems = [
  { color: '#00a650', label: 'Excellent (85%+)', range: '85-100%' },
  { color: '#78be20', label: 'Good (75-84%)', range: '75-84%' },
  { color: '#ffb81c', label: 'Needs Attention (65-74%)', range: '65-74%' },
  { color: '#ff7f00', label: 'Poor (50-64%)', range: '50-64%' },
  { color: '#da291c', label: 'Critical (<50%)', range: '0-49%' }
];
```

**3. ICB Rankings Table:**
```typescript
// Sortable table showing all ICBs with performance metrics
interface ICBRankingRow {
  rank: number;
  icb_name: string;
  avg_rtt_performance: number;
  trust_count: number;
  best_trust: string;
  worst_trust: string;
  trend: 'improving' | 'declining' | 'stable';
}
```

### Phase 4: Data Integration and Testing (1-2 hours)

#### Task 4.1: Performance Optimization
```bash
# Claude Code Task: Optimize map rendering and data processing
# Action: Ensure smooth performance with large boundary datasets
# Output: Optimized map component with lazy loading
```

**Optimization Requirements:**
- **Lazy Loading**: Load boundary data only when tab is activated
- **Data Caching**: Cache processed ICB analysis data
- **Rendering**: Efficient SVG/Canvas rendering for smooth interactions
- **Mobile**: Optimized touch interactions and responsive design

#### Task 4.2: Error Handling and Fallbacks
```bash
# Claude Code Task: Implement robust error handling for map component
# Action: Create fallbacks for missing data or boundary issues
# Output: Resilient map component with graceful degradation
```

**Error Scenarios:**
- **Missing Boundary Data**: Show simplified regional breakdown
- **Insufficient ICB Data**: Display data availability warnings
- **Performance Issues**: Progressive loading with skeleton states
- **Browser Compatibility**: SVG fallback for older browsers

## Data Requirements

### CSV Data Utilization
From unified_monthly_data_enhanced.csv:
- **trust_code** - Link trusts to ICBs
- **trust_name** - Display constituent trusts
- **icb_code** - ICB identifier for mapping
- **icb_name** - ICB display names
- **trust_total_percent_within_18_weeks** - RTT performance metric
- **period** - Time series analysis

### External Data Sources
- **ICB Boundaries**: Official NHS Digital boundary files
- **Population Data**: Optional - for per-capita analysis
- **ICB Codes**: Validation against official NHS ICB list

## Business Value for Sales Teams

### Immediate Insights
- **Visual Performance Patterns**: Instantly identify underperforming regions
- **Geographic Context**: Understand regional healthcare challenges
- **Territory Planning**: Focus sales efforts on struggling ICBs
- **Competitive Intelligence**: Benchmark regions against each other

### Sales Conversation Starters
- "Your ICB is performing below the national average..."
- "Compared to neighboring regions, your area shows..."
- "The top-performing ICBs are achieving X% through..."
- "Regional patterns suggest opportunities for..."

## Success Criteria

### Functional Requirements
- [ ] Interactive UK map colored by ICB RTT performance
- [ ] Hover tooltips showing detailed ICB metrics
- [ ] Click-through to trust-level detail views
- [ ] Performance legend with clear color meanings
- [ ] Time period selection for historical comparison
- [ ] Mobile-responsive design with touch support

### Performance Requirements
- [ ] Map loads within 3 seconds on standard connection
- [ ] Smooth hover interactions (60fps)
- [ ] Efficient memory usage with large boundary datasets
- [ ] Graceful handling of missing or incomplete data

### Design Requirements
- [ ] Consistent with NHS Analytics dashboard branding
- [ ] Professional appearance suitable for client presentations
- [ ] Accessible design meeting WCAG guidelines
- [ ] Clear visual hierarchy and information organization

## Risk Mitigation

### Technical Risks
- **Boundary Data Availability**: Research multiple sources for ICB boundaries
- **Performance Issues**: Implement progressive loading and optimization
- **Browser Compatibility**: Test across major browsers and devices
- **Data Quality**: Validate ICB codes against official NHS sources

### Data Risks
- **Incomplete ICB Coverage**: Handle ICBs with insufficient trust data
- **Mismatched Codes**: Validate ICB codes between CSV and boundary data
- **Performance Calculation**: Ensure accurate aggregation of trust-level data
- **Time Series Gaps**: Handle missing data periods gracefully

## File Structure After Implementation

```
src/
├── app/
│   └── dashboard/
│       └── icb-analysis/
│           └── page.tsx (Geographic Analysis tab)
├── components/
│   ├── charts/
│   │   └── icb-geographic-map.tsx
│   └── dashboard/
│       ├── icb-performance-overview.tsx
│       ├── icb-performance-table.tsx
│       └── icb-legend.tsx
├── lib/
│   ├── map-color-utils.ts
│   ├── icb-data-processor.ts
│   └── boundary-data-loader.ts
├── hooks/
│   └── use-icb-analysis.ts
├── types/
│   └── icb-types.ts
└── data/
    └── icb-boundaries.json (or external API)
```

## Claude Code Execution Instructions

### Phase 1: Data Analysis
```bash
claude-code analyze --task="icb-data-coverage" 
--source="unified_monthly_data_enhanced.csv" --output="detailed"
```

### Phase 2: Component Development
```bash
claude-code develop --component="icb-geographic-map"
--framework="react-d3" --mapping="uk-icb-boundaries"
```

### Phase 3: Dashboard Integration
```bash
claude-code integrate --tab="geographic-analysis" 
--components="map,overview,table" --interactive=true
```

### Phase 4: Testing and Optimization
```bash
claude-code optimize --target="map-performance" 
--test-mobile=true --validate-data=true
```

This implementation will transform the Geographic Analysis tab from a placeholder into a powerful visual analytics tool that provides immediate geographic insights into NHS ICB performance patterns.