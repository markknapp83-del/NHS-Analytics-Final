# Community Health Frontend Integration Plan

## Project Overview
Integrate community health data into the NHS Analytics Dashboard frontend, creating a dedicated Community Health tab and enhancing the Overview tab with community health intelligence. Focus on presenting data meaningfully without prescribing interpretations - let salespeople draw their own conclusions.

## Project Context
- **Location**: `C:\Users\Mark\Projects\NHS Data Analytics v5`
- **Database**: Supabase with complete community health data (1,136 trust-month records)
- **Data Coverage**: 98 trusts × 12 months × 47 services (30 Adult + 17 CYP)
- **Current Stack**: Next.js 14, TypeScript, ShadCN/UI, Tailwind CSS, Recharts
- **Reference Design**: RTT Deep Dive tab structure and styling

## Design Philosophy
**"Present data, not prescriptions"**
- Show raw data and trends clearly
- Let users identify patterns and opportunities
- Minimal interpretation or scoring
- Focus on volume, wait times, and breach visibility
- Similar visual approach to successful RTT Deep Dive tab

## Phase I: Overview Tab Enhancements (2-3 hours)

### Task 1.1: Replace Capacity Utilization KPI Card
**Objective**: Remove capacity KPI, add Community Health KPI

**Current KPI to Remove:**
- Capacity Utilization card (Virtual Wards data - limited coverage)

**New Community Health KPI Card:**
```typescript
{
  title: "Community Services Total Waiting",
  value: community_data.metadata.total_waiting_all_services,
  previousValue: previous_month.metadata.total_waiting_all_services,
  trend: "% from last month",
  description: "Patients across all community services",
  icon: Users, // or appropriate icon
  format: "number"
}
```

**Implementation Requirements:**
- Fetch latest community_health_data from trust_metrics
- Calculate month-over-month change
- Match styling of existing KPI cards
- Show "No data" state if community_health_data is null
- Performance indicator: neutral (just show the numbers)

**File Location**: `src/components/dashboard/kpi-cards.tsx`

### Task 1.2: Replace Average Wait Time Chart
**Objective**: Remove RTT average wait chart, add community health visualization

**Current Chart to Remove:**
- "Average Wait Time" area chart (bottom-left position in 2×2 grid)

**New Community Health Chart Options (Choose Most Effective):**

**Option A: Community Services Waiting List Trends** (Recommended)
```typescript
// Line chart showing total community waiting list over time
// Multiple lines for key services: MSK, Podiatry, Physiotherapy, Audiology
{
  title: "Community Services Waiting Lists",
  description: "Total patients waiting by major service over 12 months",
  chartType: "line",
  data: {
    xAxis: period, // monthly
    series: [
      { name: "MSK Services", dataKey: "msk_total_waiting" },
      { name: "Podiatry", dataKey: "podiatry_total_waiting" },
      { name: "Physiotherapy", dataKey: "therapy_physiotherapy_total_waiting" },
      { name: "Audiology", dataKey: "audiology_total_waiting" }
    ]
  }
}
```

**Option B: Community Wait Time Distribution**
```typescript
// Stacked bar chart showing wait time bands
{
  title: "Community Wait Time Distribution",
  description: "Patient distribution across wait time bands",
  chartType: "stackedBar",
  data: {
    categories: ["0-4 weeks", "4-12 weeks", "12-18 weeks", "18-52 weeks", "52+ weeks"],
    // Aggregate across all services
  }
}
```

**Option C: Top Community Services by Volume**
```typescript
// Horizontal bar chart
{
  title: "Largest Community Service Waiting Lists",
  description: "Top 10 services by total patients waiting",
  chartType: "horizontalBar",
  data: {
    services: top_10_services_by_volume,
    values: total_waiting_per_service
  }
}
```

**Decision Criteria**: Option A (Service Trends) recommended as it:
- Shows volume patterns over time
- Highlights major service lines
- Provides comparative view
- Aligns with RTT visualization approach

**File Location**: `src/components/charts/community-trends-chart.tsx`

### Task 1.3: Critical Issues Table Enhancement
**Objective**: Add community health breaches to existing critical issues table

**Current Table Structure:**
```typescript
// Existing critical issues on Overview tab
interface CriticalIssue {
  specialty: string;
  metric: string;
  value: number;
  severity: 'critical' | 'warning';
  trend: number;
}
```

**Enhanced Table with Community Data:**
```typescript
interface CriticalIssue {
  category: 'RTT' | 'Community Health' | 'A&E'; // NEW
  service: string; // specialty or community service name
  metric: string;
  value: number;
  severity: 'critical' | 'warning';
  trend: number;
}

// Add community health issues to table
const communityIssues = [
  // Services with 52+ week breaches
  {
    category: 'Community Health',
    service: 'MSK Services',
    metric: '52+ week waiters',
    value: community_data.adult_services.msk_service.wait_52_plus_weeks,
    severity: value > 100 ? 'critical' : 'warning',
    trend: month_over_month_change
  },
  // Services with high volumes AND long waits
  {
    category: 'Community Health',
    service: 'Podiatry',
    metric: 'Total waiting >18 weeks',
    value: wait_18_52_weeks + wait_52_plus_weeks,
    severity: value > 500 ? 'critical' : 'warning',
    trend: month_over_month_change
  }
];
```

**Critical Issue Identification Logic:**
1. **52+ Week Breaches**: Any service with wait_52_plus_weeks > 0 (Critical)
2. **High Volume Long Waits**: Services with >200 patients waiting 18+ weeks (Warning)
3. **Growing Backlogs**: Services with >20% month-over-month increase (Warning)

**Display Rules:**
- Show top 5-7 community issues alongside RTT issues
- Sort by severity (Critical first) then by volume
- Add visual indicator for category (icon or badge)
- Maintain existing table styling

**File Location**: `src/components/dashboard/critical-issues-table.tsx`

## Phase II: Community Health Tab Structure (4-5 hours)

### Task 2.1: Tab Navigation Setup
**Objective**: Add Community Health tab to main navigation

**Tab Structure Update:**
```typescript
// Update navigation in dashboard layout
const tabs = [
  { name: 'Overview', href: '/dashboard', icon: BarChart3 },
  { name: 'RTT Deep Dive', href: '/dashboard/rtt-deep-dive', icon: TrendingUp },
  { name: 'Community Health', href: '/dashboard/community-health', icon: Users }, // NEW
  { name: 'Operational', href: '/dashboard/operational', icon: Activity },
  { name: 'Capacity', href: '/dashboard/capacity', icon: Building2 }
];
```

**File Location**: 
- `src/app/dashboard/layout.tsx` (navigation update)
- `src/app/dashboard/community-health/page.tsx` (new route)

### Task 2.2: Community Health KPI Cards
**Objective**: Create top-level metrics similar to RTT Deep Dive

**Four Primary KPI Cards:**

```typescript
// Card 1: Total Patients Waiting
{
  title: "Total Community Services Waiting List",
  value: metadata.total_waiting_all_services,
  previousValue: previous_month.metadata.total_waiting_all_services,
  trend: "% from last month",
  description: "All community health services combined",
  icon: Users
}

// Card 2: Services Reported
{
  title: "Active Services",
  value: metadata.services_reported,
  previousValue: previous_month.metadata.services_reported,
  trend: "count from last month",
  description: "Community services reporting data",
  icon: Stethoscope
}

// Card 3: 52+ Week Breaches
{
  title: "Services with 52+ Week Waits",
  value: metadata.services_with_52plus_breaches,
  previousValue: previous_month.metadata.services_with_52plus_breaches,
  trend: "count from last month",
  description: "Services exceeding 52-week threshold",
  icon: AlertTriangle
}

// Card 4: Average Wait (Calculated)
{
  title: "Estimated Average Wait",
  value: calculateWeightedAverageWait(community_data),
  previousValue: calculateWeightedAverageWait(previous_month),
  trend: "weeks from last month",
  description: "Across all community services",
  icon: Clock
}
```

**Calculation for Average Wait:**
```typescript
function calculateWeightedAverageWait(communityData: CommunityHealthData): number {
  let totalPatients = 0;
  let weightedWeeks = 0;
  
  // Weight by midpoint of wait bands
  const bandWeights = {
    wait_0_1_weeks: 0.5,
    wait_1_2_weeks: 1.5,
    wait_2_4_weeks: 3,
    wait_4_12_weeks: 8,
    wait_12_18_weeks: 15,
    wait_18_52_weeks: 35,
    wait_52_plus_weeks: 65
  };
  
  // Aggregate across all services
  ['adult_services', 'cyp_services'].forEach(category => {
    Object.values(communityData[category] || {}).forEach(service => {
      Object.entries(bandWeights).forEach(([band, weeks]) => {
        const patients = service[band] || 0;
        totalPatients += patients;
        weightedWeeks += patients * weeks;
      });
    });
  });
  
  return totalPatients > 0 ? Math.round(weightedWeeks / totalPatients) : 0;
}
```

**File Location**: `src/components/dashboard/community-kpi-cards.tsx`

### Task 2.3: Service Performance Visualization
**Objective**: Display all services similar to RTT specialty heatmap

**Service List/Table with Key Metrics:**
```typescript
interface ServiceDisplay {
  category: 'Adult' | 'CYP';
  serviceName: string;
  totalWaiting: number;
  wait52PlusWeeks: number;
  percentOver18Weeks: number; // (18-52 weeks + 52+ weeks) / total
  monthlyChange: number;
  trend: 'up' | 'down' | 'stable';
}

// Display format: Grouped by Adult/CYP
<div className="space-y-6">
  <div>
    <h3>Adult Services (30 services)</h3>
    <ServicePerformanceTable 
      services={adultServices}
      sortBy="totalWaiting" // default sort
    />
  </div>
  
  <div>
    <h3>Children & Young People Services (17 services)</h3>
    <ServicePerformanceTable 
      services={cypServices}
      sortBy="totalWaiting"
    />
  </div>
</div>
```

**Table Columns:**
- Service Name
- Total Waiting (sortable)
- 52+ Week Waiters (sortable)
- % Waiting >18 Weeks (sortable)
- Monthly Trend (↑↓→)
- Quick Actions (drill-down icon)

**Visual Indicators:**
- Red highlight: 52+ week waiters > 50
- Amber highlight: >30% patients waiting >18 weeks
- Green: <20% waiting >18 weeks
- Gray: Service not reporting data

**File Location**: `src/components/community/service-performance-table.tsx`

### Task 2.4: Wait Time Distribution Charts
**Objective**: Visualize wait time bands similar to RTT breach breakdown

**Chart Grid (2×2 Layout):**

**Chart 1: Total Waiting List Trend (Top-Left)**
```typescript
{
  title: "Community Services Total Waiting List",
  description: "Combined patient volumes over 12 months",
  chartType: "area",
  data: {
    xAxis: period,
    series: [
      {
        name: "Total Waiting",
        dataKey: "total_waiting_all_services",
        color: "hsl(var(--chart-1))"
      }
    ]
  },
  features: [
    "Smooth curve",
    "Gradient fill",
    "Hover tooltips with exact values",
    "Month labels on x-axis"
  ]
}
```

**Chart 2: Wait Time Band Distribution (Top-Right)**
```typescript
{
  title: "Wait Time Band Breakdown",
  description: "Patient distribution across wait time bands (latest month)",
  chartType: "stackedBar",
  data: {
    categories: [
      "0-1 weeks", "1-2 weeks", "2-4 weeks", 
      "4-12 weeks", "12-18 weeks", "18-52 weeks", "52+ weeks"
    ],
    values: aggregated_across_all_services,
    colors: [
      "green", "green", "yellow", 
      "amber", "amber", "orange", "red"
    ]
  },
  features: [
    "Single stacked bar (horizontal)",
    "Percentage labels on segments",
    "Color coding by urgency",
    "Interactive hover with patient counts"
  ]
}
```

**Chart 3: Top Services by Volume (Bottom-Left)**
```typescript
{
  title: "Largest Service Waiting Lists",
  description: "Top 10 community services by patient volume",
  chartType: "horizontalBar",
  data: {
    services: [
      "MSK Services",
      "Podiatry", 
      "Physiotherapy",
      "Community Nursing",
      "Audiology",
      // ... top 10 by total_waiting
    ],
    values: total_waiting_per_service,
    colors: service_colors
  },
  features: [
    "Sorted by volume (highest to lowest)",
    "Value labels on bars",
    "Truncate service names if needed",
    "Click to filter/drill down"
  ]
}
```

**Chart 4: 52+ Week Breach Trend (Bottom-Right)**
```typescript
{
  title: "Services with 52+ Week Breaches",
  description: "Count of services exceeding 52-week threshold over time",
  chartType: "line",
  data: {
    xAxis: period,
    series: [
      {
        name: "Services with Breaches",
        dataKey: "services_with_52plus_breaches",
        color: "red"
      }
    ]
  },
  features: [
    "Bold line (danger color)",
    "Data point markers",
    "Zero baseline emphasized",
    "Trend indicator"
  ]
}
```

**File Locations**: 
- `src/components/charts/community-waiting-list-chart.tsx`
- `src/components/charts/community-wait-bands-chart.tsx`
- `src/components/charts/community-top-services-chart.tsx`
- `src/components/charts/community-breaches-trend-chart.tsx`

## Phase III: Data Integration & State Management (2-3 hours)

### Task 3.1: Community Health Data Hook
**Objective**: Create reusable hook for community health data access

```typescript
// hooks/use-community-health-data.ts
export function useCommunityHealthData(trustCode: string) {
  const [data, setData] = useState<CommunityHealthData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCommunityData() {
      try {
        const { data: trustData, error } = await supabase
          .from('trust_metrics')
          .select('period, community_health_data')
          .eq('trust_code', trustCode)
          .not('community_health_data', 'is', null)
          .order('period', { ascending: true });

        if (error) throw error;

        const parsed = trustData.map(row => ({
          period: row.period,
          ...row.community_health_data
        }));

        setData(parsed);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    if (trustCode) {
      fetchCommunityData();
    }
  }, [trustCode]);

  return { data, isLoading, error };
}
```

**Helper Functions:**
```typescript
// Extract latest month data
export function getLatestCommunityData(data: CommunityHealthData[]) {
  return data[data.length - 1];
}

// Get previous month for comparison
export function getPreviousMonthData(data: CommunityHealthData[]) {
  return data[data.length - 2];
}

// Aggregate service totals
export function aggregateServiceData(communityData: CommunityHealthData) {
  const aggregated = {
    total_waiting: 0,
    wait_0_1_weeks: 0,
    wait_1_2_weeks: 0,
    wait_2_4_weeks: 0,
    wait_4_12_weeks: 0,
    wait_12_18_weeks: 0,
    wait_18_52_weeks: 0,
    wait_52_plus_weeks: 0
  };

  ['adult_services', 'cyp_services'].forEach(category => {
    Object.values(communityData[category] || {}).forEach(service => {
      Object.keys(aggregated).forEach(key => {
        aggregated[key] += service[key] || 0;
      });
    });
  });

  return aggregated;
}

// Get top services by volume
export function getTopServicesByVolume(
  communityData: CommunityHealthData, 
  limit: number = 10
) {
  const services = [];

  ['adult_services', 'cyp_services'].forEach(category => {
    Object.entries(communityData[category] || {}).forEach(([name, data]) => {
      services.push({
        name,
        category,
        total_waiting: data.total_waiting,
        wait_52_plus_weeks: data.wait_52_plus_weeks
      });
    });
  });

  return services
    .sort((a, b) => b.total_waiting - a.total_waiting)
    .slice(0, limit);
}
```

**File Location**: `src/hooks/use-community-health-data.ts`

### Task 3.2: TypeScript Interfaces
**Objective**: Define proper types for community health data

```typescript
// types/community-health.ts
export interface CommunityServiceData {
  total_waiting: number;
  wait_0_1_weeks: number;
  wait_1_2_weeks: number;
  wait_2_4_weeks: number;
  wait_4_12_weeks: number;
  wait_12_18_weeks: number;
  wait_18_52_weeks: number;
  wait_52_plus_weeks: number;
}

export interface CommunityHealthMetadata {
  last_updated: string;
  services_reported: number;
  total_waiting_all_services: number;
  services_with_52plus_breaches: number;
}

export interface CommunityHealthData {
  period?: string; // Added when fetching
  adult_services: Record<string, CommunityServiceData>;
  cyp_services: Record<string, CommunityServiceData>;
  metadata: CommunityHealthMetadata;
}

export interface ServiceDisplayRow {
  category: 'Adult' | 'CYP';
  serviceName: string;
  displayName: string; // Formatted for UI
  totalWaiting: number;
  wait52PlusWeeks: number;
  percentOver18Weeks: number;
  monthlyChange: number;
  trend: 'up' | 'down' | 'stable';
}

export interface CommunityHealthChartData {
  period: string;
  total_waiting: number;
  services_with_breaches: number;
  // ... other chart-specific fields
}
```

**Service Name Display Mapping:**
```typescript
export const SERVICE_DISPLAY_NAMES: Record<string, string> = {
  // Adult services
  'msk_service': 'Musculoskeletal Services',
  'podiatry': 'Podiatry & Podiatric Surgery',
  'therapy_physiotherapy': 'Physiotherapy',
  'audiology': 'Audiology',
  'community_nursing': 'Community Nursing',
  'therapy_ot': 'Occupational Therapy',
  'therapy_speech_language': 'Speech & Language Therapy',
  'therapy_dietetics': 'Dietetics',
  'intermediate_care_reablement': 'Intermediate Care & Reablement',
  'urgent_community_response': 'Urgent Community Response',
  // ... all 47 services
  
  // CYP services
  'community_paediatrics': 'Community Paediatric Service',
  'therapy_speech_language': 'Speech & Language Therapy (CYP)',
  // ... all CYP services
};
```

**File Location**: `src/types/community-health.ts`

### Task 3.3: Data Transformers
**Objective**: Transform database JSONB to chart-ready formats

```typescript
// lib/community-data-transformers.ts

export function transformForWaitBandChart(
  communityData: CommunityHealthData
): ChartDataPoint[] {
  const aggregated = aggregateServiceData(communityData);
  
  return [
    { name: '0-1 weeks', value: aggregated.wait_0_1_weeks, fill: 'var(--color-green)' },
    { name: '1-2 weeks', value: aggregated.wait_1_2_weeks, fill: 'var(--color-green)' },
    { name: '2-4 weeks', value: aggregated.wait_2_4_weeks, fill: 'var(--color-yellow)' },
    { name: '4-12 weeks', value: aggregated.wait_4_12_weeks, fill: 'var(--color-amber)' },
    { name: '12-18 weeks', value: aggregated.wait_12_18_weeks, fill: 'var(--color-amber)' },
    { name: '18-52 weeks', value: aggregated.wait_18_52_weeks, fill: 'var(--color-orange)' },
    { name: '52+ weeks', value: aggregated.wait_52_plus_weeks, fill: 'var(--color-red)' }
  ];
}

export function transformForTrendChart(
  historicalData: CommunityHealthData[]
): ChartDataPoint[] {
  return historicalData.map(month => ({
    period: format(new Date(month.period), 'MMM yyyy'),
    total_waiting: month.metadata.total_waiting_all_services,
    services_with_breaches: month.metadata.services_with_52plus_breaches
  }));
}

export function transformForServiceTable(
  communityData: CommunityHealthData,
  previousData: CommunityHealthData | null
): ServiceDisplayRow[] {
  const rows: ServiceDisplayRow[] = [];

  // Process adult services
  Object.entries(communityData.adult_services || {}).forEach(([key, data]) => {
    const previousService = previousData?.adult_services?.[key];
    const monthlyChange = previousService 
      ? ((data.total_waiting - previousService.total_waiting) / previousService.total_waiting) * 100
      : 0;

    rows.push({
      category: 'Adult',
      serviceName: key,
      displayName: SERVICE_DISPLAY_NAMES[key] || key,
      totalWaiting: data.total_waiting,
      wait52PlusWeeks: data.wait_52_plus_weeks,
      percentOver18Weeks: ((data.wait_18_52_weeks + data.wait_52_plus_weeks) / data.total_waiting) * 100,
      monthlyChange,
      trend: monthlyChange > 5 ? 'up' : monthlyChange < -5 ? 'down' : 'stable'
    });
  });

  // Process CYP services
  Object.entries(communityData.cyp_services || {}).forEach(([key, data]) => {
    const previousService = previousData?.cyp_services?.[key];
    const monthlyChange = previousService 
      ? ((data.total_waiting - previousService.total_waiting) / previousService.total_waiting) * 100
      : 0;

    rows.push({
      category: 'CYP',
      serviceName: key,
      displayName: SERVICE_DISPLAY_NAMES[key] || key,
      totalWaiting: data.total_waiting,
      wait52PlusWeeks: data.wait_52_plus_weeks,
      percentOver18Weeks: ((data.wait_18_52_weeks + data.wait_52_plus_weeks) / data.total_waiting) * 100,
      monthlyChange,
      trend: monthlyChange > 5 ? 'up' : monthlyChange < -5 ? 'down' : 'stable'
    });
  });

  return rows;
}
```

**File Location**: `src/lib/community-data-transformers.ts`

## Phase IV: Styling & Polish (1-2 hours)

### Task 4.1: Consistent Component Styling
**Objective**: Match RTT Deep Dive visual design

**Color Palette (Reuse from RTT):**
```css
/* Wait time band colors */
--wait-band-0-1: hsl(142, 76%, 36%);    /* Green */
--wait-band-1-2: hsl(142, 76%, 36%);
--wait-band-2-4: hsl(48, 96%, 53%);     /* Yellow */
--wait-band-4-12: hsl(38, 92%, 50%);    /* Amber */
--wait-band-12-18: hsl(38, 92%, 50%);
--wait-band-18-52: hsl(25, 95%, 53%);   /* Orange */
--wait-band-52-plus: hsl(0, 84%, 60%);  /* Red */

/* Service category colors */
--adult-services: hsl(217, 91%, 60%);   /* Blue */
--cyp-services: hsl(280, 79%, 57%);     /* Purple */

/* Severity indicators */
--severity-critical: hsl(0, 84%, 60%);
--severity-warning: hsl(38, 92%, 50%);
--severity-good: hsl(142, 76%, 36%);
```

**Card Styling:**
```typescript
// Consistent card design across all community components
<Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
  <CardHeader className="pb-3">
    <CardTitle className="text-lg font-semibold text-slate-900">
      {title}
    </CardTitle>
    <CardDescription className="text-sm text-slate-600">
      {description}
    </CardDescription>
  </CardHeader>
  <CardContent>
    {content}
  </CardContent>
</Card>
```

**Typography:**
- Headers: `text-2xl font-bold text-slate-900`
- Subheaders: `text-lg font-semibold text-slate-800`
- Body: `text-sm text-slate-600`
- Metrics: `text-3xl font-bold text-slate-900`
- Labels: `text-xs uppercase tracking-wide text-slate-500`

### Task 4.2: Loading & Error States
**Objective**: Graceful handling of data states

**Loading State:**
```typescript
{isLoading && (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[1, 2, 3, 4].map(i => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
)}
```

**No Data State:**
```typescript
{!isLoading && !data && (
  <Card>
    <CardContent className="p-12 text-center">
      <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        No Community Health Data Available
      </h3>
      <p className="text-sm text-slate-600">
        This trust has not reported community health services data for the selected period.
      </p>
    </CardContent>
  </Card>
)}
```

**Error State:**
```typescript
{error && (
  <Card className="border-red-200 bg-red-50">
    <CardContent className="p-6">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600" />
        <div>
          <h3 className="font-semibold text-red-900">
            Failed to Load Community Health Data
          </h3>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

### Task 4.3: Responsive Design
**Objective**: Mobile and tablet optimization

**Breakpoint Strategy:**
- **Mobile (< 768px)**: Stack all components vertically, single column
- **Tablet (768px - 1024px)**: 2-column grid for KPIs, single column for charts
- **Desktop (> 1024px)**: Full 4-column KPI grid, 2×2 chart grid

**Implementation:**
```typescript
// KPI Cards
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {kpiCards}
</div>

// Charts
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {charts}
</div>

// Service Table
<div className="overflow-x-auto">
  <Table className="min-w-full">
    {serviceTable}
  </Table>
</div>
```

## Phase V: Testing & Validation (1-2 hours)

### Task 5.1: Component Testing
**Test Cases:**

1. **Data Loading**
   - [ ] Community health data fetches correctly from Supabase
   - [ ] Loading states display properly
   - [ ] Error states handle failures gracefully
   - [ ] No data state shows when community_health_data is null

2. **KPI Cards**
   - [ ] All 4 KPI cards display correct values
   - [ ] Month-over-month trends calculate accurately
   - [ ] Trends show correct direction (up/down/stable)
   - [ ] Values format correctly (numbers with commas, percentages)

3. **Charts**
   - [ ] All 4 charts render with community data
   - [ ] Chart data matches database values
   - [ ] Tooltips display correct information
   - [ ] Legends and axes labeled properly
   - [ ] Colors match wait time band severity

4. **Service Table**
   - [ ] All services display (adult and CYP)
   - [ ] Sorting works on all columns
   - [ ] 52+ week breaches highlighted correctly
   - [ ] Trend indicators accurate
   - [ ] Service names display properly formatted

5. **Overview Tab Updates**
   - [ ] New community KPI card displays correctly
   - [ ] Community chart replaces average wait chart
   - [ ] Critical issues table includes community data
   - [ ] No conflicts with existing RTT data

### Task 5.2: Cross-Trust Validation
**Validation Steps:**

1. **Test with Multiple Trusts:**
   - Trust with full community data (e.g., Buckinghamshire RXQ)
   - Trust with partial community data
   - Trust with no community data
   - Trust with only adult services
   - Trust with both adult and CYP services

2. **Edge Cases:**
   - Trust with zero 52+ week breaches
   - Trust with very high breach counts
   - Trust with single service reported
   - Trust with all 47 services reported
   - Month with missing data

3. **Data Consistency:**
   - Verify totals match metadata.total_waiting_all_services
   - Confirm wait band sums equal total_waiting per service
   - Check trend calculations across different months
   - Validate sorting and filtering accuracy

### Task 5.3: Performance Testing
**Performance Targets:**

- [ ] Community Health tab loads in < 2 seconds
- [ ] Chart rendering < 500ms
- [ ] Trust switching < 1 second
- [ ] No layout shift during data loading
- [ ] Smooth scrolling with large service lists
- [ ] Responsive design works on mobile devices

## Technical Specifications

### Database Queries

**Fetch Community Health Data:**
```sql
SELECT 
  period,
  community_health_data
FROM trust_metrics
WHERE trust_code = 'RXQ'
  AND community_health_data IS NOT NULL
  AND period >= '2024-08-01'
ORDER BY period ASC;
```

**Fetch for Overview Tab (Latest Only):**
```sql
SELECT 
  community_health_data
FROM trust_metrics
WHERE trust_code = 'RXQ'
  AND community_health_data IS NOT NULL
ORDER BY period DESC
LIMIT 1;
```

**Aggregate Query for Critical Issues:**
```sql
SELECT 
  trust_code,
  period,
  community_health_data->'metadata'->>'services_with_52plus_breaches' as breach_count,
  community_health_data->'metadata'->>'total_waiting_all_services' as total_waiting
FROM trust_metrics
WHERE community_health_data IS NOT NULL
  AND (community_health_data->'metadata'->>'services_with_52plus_breaches')::int > 0
ORDER BY period DESC, breach_count DESC;
```

### File Structure

```
src/
├── app/
│   └── dashboard/
│       ├── community-health/
│       │   └── page.tsx                    # NEW - Main community health tab
│       └── page.tsx                        # MODIFIED - Overview tab updates
├── components/
│   ├── dashboard/
│   │   ├── kpi-cards.tsx                   # MODIFIED - Add community KPI
│   │   └── critical-issues-table.tsx       # MODIFIED - Add community issues
│   ├── community/
│   │   ├── community-kpi-cards.tsx         # NEW
│   │   ├── service-performance-table.tsx   # NEW
│   │   └── wait-time-summary.tsx           # NEW
│   └── charts/
│       ├── community-waiting-list-chart.tsx  # NEW
│       ├── community-wait-bands-chart.tsx    # NEW
│       ├── community-top-services-chart.tsx  # NEW
│       ├── community-breaches-trend-chart.tsx # NEW
│       └── community-trends-chart.tsx        # NEW (for Overview tab)
├── hooks/
│   └── use-community-health-data.ts        # NEW
├── lib/
│   └── community-data-transformers.ts      # NEW
└── types/
    └── community-health.ts                  # NEW
```

## Success Criteria

### Functional Requirements
- [ ] Community Health tab fully functional with all components
- [ ] Overview tab enhanced with community data (1 KPI, 1 chart)
- [ ] Critical issues table includes community health breaches
- [ ] All charts display accurate data from database
- [ ] Service table shows all 47 services with proper categorization
- [ ] Trust selection updates all community health displays

### Design Requirements
- [ ] Visual consistency with RTT Deep Dive tab
- [ ] Professional NHS color scheme maintained
- [ ] Responsive design works on all devices
- [ ] Loading states smooth and professional
- [ ] Error states informative and helpful

### Data Requirements
- [ ] All 1,136 trust-month records accessible
- [ ] 98 unique trusts display community data
- [ ] 47 services properly categorized (30 Adult + 17 CYP)
- [ ] 8 wait time bands accurately represented
- [ ] Metadata calculations correct

### Performance Requirements
- [ ] Page load < 2 seconds
- [ ] Chart rendering < 500ms
- [ ] No layout shifts during loading
- [ ] Smooth interactions and transitions

## Risk Mitigation

### Data Availability
- **Risk**: Some trusts have no community data
- **Mitigation**: Clear "no data" states, don't hide the tab

### Visual Complexity
- **Risk**: 47 services could overwhelm the UI
- **Mitigation**: Grouping (Adult/CYP), sorting, optional filtering

### Performance
- **Risk**: Large JSONB data could slow rendering
- **Mitigation**: Efficient transformers, memoization, lazy loading

### User Understanding
- **Risk**: Community health metrics unfamiliar to users
- **Mitigation**: Clear labels, tooltips, consistent with RTT patterns

## Implementation Order

### Week 1: Core Infrastructure
1. ✅ Data already integrated in database
2. Create community health data hook
3. Define TypeScript interfaces
4. Build data transformers

### Week 2: Community Health Tab
1. Set up tab route and navigation
2. Build KPI cards component
3. Create service performance table
4. Implement 4 visualization charts

### Week 3: Overview Tab Updates
1. Replace capacity KPI with community KPI
2. Replace average wait chart with community chart
3. Enhance critical issues table
4. Integration testing

### Week 4: Polish & Testing
1. Styling consistency pass
2. Responsive design testing
3. Cross-trust validation
4. Performance optimization
5. Final QA and deployment

## Claude Code Execution Commands

```bash
# Phase I: Overview Tab Enhancements
claude-code execute --phase="overview-enhancements" 
  --task="replace-kpi-card,replace-chart,update-critical-issues"
  --context="community-health-data-integration"

# Phase II: Community Health Tab
claude-code execute --phase="community-health-tab" 
  --task="create-tab-structure,build-kpi-cards,create-visualizations"
  --reference="rtt-deep-dive-design"

# Phase III: Data Integration
claude-code execute --phase="data-integration" 
  --task="create-hooks,define-types,build-transformers"
  --data-source="supabase-community-health"

# Phase IV: Styling & Polish
claude-code execute --phase="styling-polish" 
  --task="consistent-styling,responsive-design,loading-states"
  --match-design="rtt-deep-dive"

# Phase V: Testing & Validation
claude-code execute --phase="testing" 
  --task="component-tests,cross-trust-validation,performance-check"
  --coverage="comprehensive"
```

## Post-Implementation

### Future Enhancements (Not in This Phase)
- Advanced filtering (by service category, wait band, breach status)
- Service-specific drill-down pages
- Export functionality for community health reports
- Automated alerts for breach thresholds
- Historical trend analysis (beyond 12 months)
- Cross-trust benchmarking for community services

### Monthly Maintenance
- Community health data updates automatically via established ETL
- No code changes required for monthly data refresh
- Monitor for new services added to NHS reporting
- Track any schema changes in community health data structure

---

## Summary

This plan provides a comprehensive approach to integrating community health data into the frontend while maintaining design consistency with the proven RTT Deep Dive structure. The focus is on presenting data clearly without over-interpretation, allowing sales teams to identify opportunities based on visible patterns in volumes, wait times, and breaches.

**Key Deliverables:**
1. Enhanced Overview tab with community health KPI and chart
2. New Community Health tab mirroring RTT Deep Dive layout
3. Critical issues integration across both tabs
4. Consistent visual design and user experience
5. Complete data integration for 98 trusts × 12 months

The implementation prioritizes clarity, consistency, and performance, ensuring the community health intelligence is as accessible and actionable as the existing RTT analytics.