# Diagnostic Services & Operational Tab Redesign Plan

## Overview
Reorganize the Operational and Capacity tabs to better reflect business priorities and improve user experience. Move diagnostic data to the forefront as the primary actionable intelligence, and combine A&E data with capacity metrics for operational context.

## Strategic Rationale

### Business Logic for Changes
- **Diagnostic Services**: Direct insourcing opportunities with clear revenue potential
- **A&E Performance**: Contextual information showing overall hospital pressure
- **Capacity Intelligence**: Operational efficiency metrics that correlate with A&E performance
- **Combined A&E + Capacity**: Logical pairing of related operational stress indicators

## Tab Restructure Plan

### Current Structure Issues
```
Operational Tab:
├── A&E Performance (4 KPI cards + trend chart)
└── Diagnostic Services (cramped cards with poor layout)

Capacity Tab:
├── Blue info box (takes unnecessary space)
├── 3 Capacity KPI cards
└── Capacity visualization charts
```

### New Structure
```
Diagnostics Tab: (formerly Operational)
├── Enhanced diagnostic service analysis (full focus)
├── Improved card layout with clear metric hierarchy
├── Service opportunity scoring and ranking
└── Market intelligence features

Capacity & Flow Tab: (formerly Capacity)
├── Compact A&E KPI cards (4 cards in smaller format)
├── A&E performance trend chart
├── Capacity utilization metrics
├── Virtual ward analytics
└── Flow correlation analysis
```

## Implementation Plan

### Phase 1: Diagnostics Tab Enhancement (2-3 hours)

#### Task 1.1: Tab Rename and Structure
```typescript
// Update navigation in sidebar component
const navigation = [
  { name: 'Overview', href: '/dashboard', icon: BarChart3 },
  { name: 'RTT Deep Dive', href: '/dashboard/rtt-deep-dive', icon: TrendingUp },
  { name: 'Diagnostics', href: '/dashboard/diagnostics', icon: Activity }, // Renamed from Operational
  { name: 'Capacity & Flow', href: '/dashboard/capacity', icon: Building2 }, // Renamed from Capacity
  { name: 'ICB Analysis', href: '/dashboard/icb-analysis', icon: LineChart },
  { name: 'Custom Analytics', href: '/dashboard/custom-analytics', icon: Zap }
];
```

#### Task 1.2: Enhanced Diagnostic Cards Layout
Replace cramped diagnostic cards with clean grid layout:

```typescript
// components/charts/enhanced-diagnostic-card.tsx
export function EnhancedDiagnosticCard({ 
  service, 
  data 
}: { 
  service: DiagnosticService; 
  data: DiagnosticData; 
}) {
  const breachLevel = getBreachLevel(data.breachRate);
  const opportunityScore = calculateOpportunityScore(data.totalWaiting, data.breachRate);
  
  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="grid grid-cols-4 gap-4 items-center">
        {/* Service Info with Priority Badge */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{service.name}</h3>
          <div className="flex flex-col gap-1">
            <Badge variant={breachLevel.variant}>
              {breachLevel.label}
            </Badge>
            {opportunityScore > 50 && (
              <Badge variant="outline" className="text-xs">
                🎯 High Opportunity
              </Badge>
            )}
          </div>
        </div>
        
        {/* Total Waiting - Clear Visual Hierarchy */}
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-800">
            {data.totalWaiting.toLocaleString()}
          </div>
          <div className="text-sm text-slate-600">total waiting</div>
        </div>
        
        {/* 6+ Week Breaches - Warning Color */}
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {data.sixWeekBreaches.toLocaleString()}
          </div>
          <div className="text-sm text-slate-600">6+ week waits</div>
          <div className="text-xs text-slate-500">
            {((data.sixWeekBreaches / data.totalWaiting) * 100).toFixed(1)}% of total
          </div>
        </div>
        
        {/* Breach Rate - Primary Metric */}
        <div className="text-center">
          <div className={`text-3xl font-bold ${breachLevel.textColor}`}>
            {data.breachRate.toFixed(1)}%
          </div>
          <div className="text-sm text-slate-600">breach rate</div>
          <div className="text-xs text-slate-500">
            13+ weeks: {data.thirteenWeekBreaches}
          </div>
        </div>
      </div>
    </Card>
  );
}
```

#### Task 1.3: Service Opportunity Scoring
Add business intelligence features to prioritize high-opportunity services:

```typescript
// lib/diagnostic-intelligence.ts
export function calculateOpportunityScore(waitingList: number, breachRate: number): number {
  // Higher score = better opportunity for insourcing
  const volumeScore = Math.min(waitingList / 100, 50); // Cap at 50 points
  const urgencyScore = breachRate; // Percentage as direct score
  return volumeScore + urgencyScore;
}

export function rankDiagnosticsByOpportunity(diagnostics: DiagnosticData[]): DiagnosticData[] {
  return diagnostics.sort((a, b) => {
    const scoreA = calculateOpportunityScore(a.totalWaiting, a.breachRate);
    const scoreB = calculateOpportunityScore(b.totalWaiting, b.breachRate);
    return scoreB - scoreA; // Highest opportunity first
  });
}

export function getBreachLevel(breachRate: number): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  textColor: string;
} {
  if (breachRate >= 15) return { 
    label: 'CRITICAL', 
    variant: 'destructive', 
    textColor: 'text-red-600' 
  };
  if (breachRate >= 10) return { 
    label: 'HIGH CONCERN', 
    variant: 'destructive', 
    textColor: 'text-red-500' 
  };
  if (breachRate >= 5) return { 
    label: 'MODERATE', 
    variant: 'secondary', 
    textColor: 'text-orange-600' 
  };
  return { 
    label: 'GOOD', 
    variant: 'default', 
    textColor: 'text-green-600' 
  };
}
```

#### Task 1.4: Full-Width Diagnostics Layout
```typescript
// app/dashboard/diagnostics/page.tsx
export default function DiagnosticsPage() {
  const { getTrustData } = useNHSData();
  const [selectedTrust] = useTrustSelection();
  const trustData = getTrustData(selectedTrust);
  const latestData = trustData[trustData.length - 1];

  const diagnosticServices = useMemo(() => {
    const services = extractDiagnosticData(latestData);
    return rankDiagnosticsByOpportunity(services);
  }, [latestData]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Diagnostic Services Performance</h1>
          <p className="text-slate-600">
            Waiting times and breach analysis across all diagnostic modalities - ranked by insourcing opportunity
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {diagnosticServices.length} diagnostic services monitored
        </Badge>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-slate-800">
              {diagnosticServices.reduce((sum, s) => sum + s.totalWaiting, 0).toLocaleString()}
            </div>
            <div className="text-sm text-slate-600">Total Patients Waiting</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {diagnosticServices.reduce((sum, s) => sum + s.sixWeekBreaches, 0).toLocaleString()}
            </div>
            <div className="text-sm text-slate-600">6+ Week Breaches</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-red-600">
              {diagnosticServices.reduce((sum, s) => sum + s.thirteenWeekBreaches, 0).toLocaleString()}
            </div>
            <div className="text-sm text-slate-600">13+ Week Breaches</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {diagnosticServices.filter(s => s.breachRate >= 10).length}
            </div>
            <div className="text-sm text-slate-600">High-Opportunity Services</div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Diagnostic Services */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Diagnostic Service Analysis</h3>
          <Badge variant="secondary" className="text-xs">
            Ranked by insourcing opportunity
          </Badge>
        </div>
        
        <div className="space-y-3">
          {diagnosticServices.map((service) => (
            <EnhancedDiagnosticCard
              key={service.type}
              service={service}
              data={service}
            />
          ))}
        </div>
      </div>

      {/* Additional Analysis Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Breach Rate Comparison</CardTitle>
            <CardDescription>6+ week breach rates across all diagnostic services</CardDescription>
          </CardHeader>
          <CardContent>
            <DiagnosticBreachChart data={diagnosticServices} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Volume vs. Performance</CardTitle>
            <CardDescription>Waiting list size vs. breach rate analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <DiagnosticScatterChart data={diagnosticServices} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### Phase 2: Capacity & Flow Tab Integration (2-3 hours)

#### Task 2.1: Remove Blue Info Box and Compact A&E Cards
```typescript
// app/dashboard/capacity/page.tsx
export default function CapacityFlowPage() {
  const { getTrustData } = useNHSData();
  const [selectedTrust] = useTrustSelection();
  const trustData = getTrustData(selectedTrust);
  const latestData = trustData[trustData.length - 1];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Capacity & Flow Intelligence</h1>
          <p className="text-slate-600">
            Emergency department performance, virtual ward utilization, and patient flow analytics
          </p>
        </div>
      </div>

      {/* Combined KPI Cards - A&E + Capacity */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {/* A&E Performance Cards - Compact */}
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold text-red-600">
              {latestData.ae_4hr_performance_pct?.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-600">4-Hour Performance</div>
            <div className="text-xs text-slate-500">Target: 95%</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold">
              {latestData.ae_attendances_total?.toLocaleString()}
            </div>
            <div className="text-xs text-slate-600">Total Attendances</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold text-orange-600">
              {latestData.ae_over_4hrs_total?.toLocaleString()}
            </div>
            <div className="text-xs text-slate-600">Over 4 Hours</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold text-red-600">
              {latestData.ae_12hr_wait_admissions?.toLocaleString()}
            </div>
            <div className="text-xs text-slate-600">12-Hour Waits</div>
          </CardContent>
        </Card>

        {/* Capacity Cards */}
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold">
              {latestData.virtual_ward_capacity || 'N/A'}
            </div>
            <div className="text-xs text-slate-600">Virtual Ward Beds</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold text-blue-600">
              {latestData.virtual_ward_occupancy_rate?.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-600">VW Occupancy</div>
            <div className="text-xs text-slate-500">Target: 85%</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold">
              {latestData.avg_daily_discharges?.toFixed(0)}
            </div>
            <div className="text-xs text-slate-600">Daily Discharges</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* A&E Performance Trend */}
        <Card>
          <CardHeader>
            <CardTitle>A&E Performance Trend</CardTitle>
            <CardDescription>4-hour performance over time with 95% NHS standard</CardDescription>
          </CardHeader>
          <CardContent>
            <AEPerformanceTrendChart data={trustData} />
          </CardContent>
        </Card>

        {/* Virtual Ward Utilization */}
        <Card>
          <CardHeader>
            <CardTitle>Virtual Ward Utilization</CardTitle>
            <CardDescription>Occupancy rate and efficiency metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <VirtualWardChart data={trustData} />
          </CardContent>
        </Card>

        {/* Flow Correlation Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency Flow Impact</CardTitle>
            <CardDescription>Correlation between A&E pressure and capacity utilization</CardDescription>
          </CardHeader>
          <CardContent>
            <FlowCorrelationChart data={trustData} />
          </CardContent>
        </Card>

        {/* Discharge Patterns */}
        <Card>
          <CardHeader>
            <CardTitle>Discharge Efficiency</CardTitle>
            <CardDescription>Daily discharge patterns and capacity turnover</CardDescription>
          </CardHeader>
          <CardContent>
            <DischargePatternChart data={trustData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### Phase 3: Data Processing Updates (1 hour)

#### Task 3.1: Diagnostic Data Extraction
```typescript
// lib/diagnostic-data-processor.ts
export interface DiagnosticService {
  type: string;
  name: string;
  totalWaiting: number;
  sixWeekBreaches: number;
  thirteenWeekBreaches: number;
  breachRate: number;
  plannedTests: number;
  unscheduledTests: number;
}

export function extractDiagnosticData(trustData: NHSTrustData): DiagnosticService[] {
  const diagnosticTypes = [
    { key: 'mri', name: 'MRI Scans' },
    { key: 'ct', name: 'CT Scans' },
    { key: 'ultrasound', name: 'Ultrasound' },
    { key: 'nuclear_medicine', name: 'Nuclear Medicine' },
    { key: 'dexa', name: 'DEXA Scans' },
    { key: 'echocardiography', name: 'Echocardiography' },
    { key: 'electrophysiology', name: 'Electrophysiology' },
    { key: 'neurophysiology', name: 'Neurophysiology' },
    { key: 'audiology', name: 'Audiology' },
    { key: 'gastroscopy', name: 'Gastroscopy' },
    { key: 'colonoscopy', name: 'Colonoscopy' },
    { key: 'sigmoidoscopy', name: 'Sigmoidoscopy' },
    { key: 'cystoscopy', name: 'Cystoscopy' },
    { key: 'urodynamics', name: 'Urodynamics' },
    { key: 'sleep_studies', name: 'Sleep Studies' }
  ];

  return diagnosticTypes.map(type => {
    const totalWaiting = trustData[`diag_${type.key}_total_waiting`] as number || 0;
    const sixWeekBreaches = trustData[`diag_${type.key}_6week_breaches`] as number || 0;
    const thirteenWeekBreaches = trustData[`diag_${type.key}_13week_breaches`] as number || 0;
    const plannedTests = trustData[`diag_${type.key}_planned_tests`] as number || 0;
    const unscheduledTests = trustData[`diag_${type.key}_unscheduled_tests`] as number || 0;

    return {
      type: type.key,
      name: type.name,
      totalWaiting,
      sixWeekBreaches,
      thirteenWeekBreaches,
      breachRate: totalWaiting > 0 ? (sixWeekBreaches / totalWaiting) * 100 : 0,
      plannedTests,
      unscheduledTests
    };
  }).filter(service => service.totalWaiting > 0); // Only show services with data
}
```

## File Structure Updates

### Files to Modify
```
app/dashboard/
├── diagnostics/page.tsx (renamed from operational/page.tsx)
└── capacity/page.tsx (enhanced with A&E data)

components/dashboard/
├── enhanced-diagnostic-card.tsx (new)
├── compact-ae-cards.tsx (new)
└── sidebar.tsx (update navigation)

components/charts/
├── diagnostic-breach-chart.tsx (new)
├── diagnostic-scatter-chart.tsx (new)
├── ae-performance-trend-chart.tsx (moved from operational)
└── flow-correlation-chart.tsx (new)

lib/
├── diagnostic-intelligence.ts (new)
└── diagnostic-data-processor.ts (new)
```

### New TypeScript Interfaces
```typescript
// types/nhs-data.ts - Add these interfaces
export interface DiagnosticService {
  type: string;
  name: string;
  totalWaiting: number;
  sixWeekBreaches: number;
  thirteenWeekBreaches: number;
  breachRate: number;
  plannedTests: number;
  unscheduledTests: number;
}

export interface BreachLevel {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  textColor: string;
}
```

## Testing Checklist

### Diagnostics Tab Testing
- [ ] Enhanced diagnostic cards display correctly with proper spacing
- [ ] Service opportunity scoring ranks services appropriately
- [ ] Breach rate calculations are accurate
- [ ] Summary statistics aggregate correctly
- [ ] Charts render properly with diagnostic data

### Capacity & Flow Tab Testing
- [ ] Compact A&E KPI cards fit properly in smaller format
- [ ] A&E trend chart displays correctly in new location
- [ ] Capacity metrics maintain functionality
- [ ] Blue info box is successfully removed
- [ ] Grid layout adapts responsively

### Navigation Testing
- [ ] Tab names updated in sidebar navigation
- [ ] Routes work correctly (/dashboard/diagnostics, /dashboard/capacity)
- [ ] Tab switching maintains state
- [ ] Mobile navigation still functional

## Success Criteria
- [ ] Diagnostic services get prominent, clear visual treatment
- [ ] High-opportunity services are immediately identifiable
- [ ] A&E data integrated logically with capacity metrics
- [ ] Overall information hierarchy improved
- [ ] Business intelligence focus enhanced