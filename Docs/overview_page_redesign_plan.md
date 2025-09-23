# Performance Overview Page Redesign Plan

## Overview
Redesign the Performance Overview page to provide a comprehensive trust health dashboard with meaningful metrics across RTT, diagnostics, A&E, and capacity data. Remove sales intelligence focus and concentrate on pure analytics with critical issue identification.

## Current Problems to Address
- KPI cards are too RTT-focused (3 of 4 cards are RTT metrics)
- Waiting List Volume chart provides limited actionable insight
- Long Wait Breakdown chart duplicates RTT performance information
- Filters are unnecessary on an overview page
- No visibility of critical diagnostic issues
- Missing cross-system performance context

## Redesigned Layout Structure

### Top Section: Comprehensive KPI Cards (4 cards)
```
┌─ RTT Compliance ─┬─ Critical Diagnostics ─┬─ A&E Performance ─┬─ Capacity Status ─┐
│     68.5%        │      5 services        │     undefined%    │      112.9%       │
│   🔴 Critical    │    🔴 High Breach      │   🔴 No Data     │   🔴 Over Target   │
│  Target: 92%     │    Above 15% breach    │   Target: 95%    │   Target: 85%     │
└──────────────────┴────────────────────────┴──────────────────┴───────────────────┘
```

### Main Content Grid (2x2 Layout)
```
┌─ RTT Performance Trend ─────────┬─ Critical Issues Alert Panel ────────┐
│ 18-week compliance over time    │ 🔴 RTT specialties below 50%         │
│ with 92% NHS standard           │ 🔴 Diagnostic services above 15%     │
│ (UNCHANGED)                     │ 🔴 Capacity utilization concerns     │
│                                 │ 🔴 Emergency flow problems           │
└─────────────────────────────────┼───────────────────────────────────────┘
┌─ Average Wait Time ─────────────┬─ Diagnostic Breach Breakdown ────────┐
│ (UNCHANGED - median waiting     │ 6+ and 13+ week breaches across     │
│ time in weeks with trend)       │ diagnostic services (replaces        │
│                                 │ RTT long wait breakdown)             │
└─────────────────────────────────┴───────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: KPI Cards Enhancement (1-2 hours)

#### Task 1.1: Update KPI Card Configuration
```typescript
// components/dashboard/overview-kpi-cards.tsx
export function OverviewKPICards({ trustData }: { trustData: NHSTrustData[] }) {
  const latestData = trustData[trustData.length - 1];
  const previousData = trustData[trustData.length - 2];

  // Calculate critical diagnostic services count
  const criticalDiagnostics = useMemo(() => {
    return calculateCriticalDiagnosticServices(latestData);
  }, [latestData]);

  const kpiCards = [
    {
      title: "RTT 18-week Compliance",
      value: latestData.trust_total_percent_within_18_weeks,
      previousValue: previousData?.trust_total_percent_within_18_weeks,
      target: 92,
      format: "percentage",
      description: "Target: 92%",
      icon: Clock,
      getStatus: (value: number) => value >= 92 ? 'excellent' : value >= 75 ? 'good' : value >= 50 ? 'concern' : 'critical'
    },
    {
      title: "Critical Diagnostics",
      value: criticalDiagnostics.count,
      previousValue: null, // No trend for count
      target: 0,
      format: "number",
      description: `${criticalDiagnostics.count} services above 15% breach rate`,
      icon: AlertTriangle,
      getStatus: (value: number) => value === 0 ? 'excellent' : value <= 2 ? 'concern' : 'critical'
    },
    {
      title: "A&E 4-hour Performance",
      value: latestData.ae_4hr_performance_pct,
      previousValue: previousData?.ae_4hr_performance_pct,
      target: 95,
      format: "percentage",
      description: "Target: 95%",
      icon: Activity,
      getStatus: (value: number) => !value ? 'no-data' : value >= 95 ? 'excellent' : value >= 85 ? 'good' : value >= 70 ? 'concern' : 'critical'
    },
    {
      title: "Capacity Utilization",
      value: latestData.virtual_ward_occupancy_rate,
      previousValue: previousData?.virtual_ward_occupancy_rate,
      target: 85,
      format: "percentage",
      description: "Virtual Ward occupancy - Target: 85%",
      icon: Building2,
      getStatus: (value: number) => !value ? 'no-data' : value <= 90 && value >= 80 ? 'excellent' : value <= 95 ? 'good' : 'critical'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {kpiCards.map((kpi) => (
        <OverviewKPICard key={kpi.title} kpi={kpi} />
      ))}
    </div>
  );
}
```

#### Task 1.2: Critical Diagnostics Calculator
```typescript
// lib/critical-issues-calculator.ts
export interface CriticalDiagnosticService {
  name: string;
  type: string;
  breachRate: number;
  totalWaiting: number;
  sixWeekBreaches: number;
  thirteenWeekBreaches: number;
}

export function calculateCriticalDiagnosticServices(trustData: NHSTrustData): {
  count: number;
  services: CriticalDiagnosticService[];
} {
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

  const criticalServices: CriticalDiagnosticService[] = [];

  diagnosticTypes.forEach(type => {
    const totalWaiting = trustData[`diag_${type.key}_total_waiting`] as number;
    const sixWeekBreaches = trustData[`diag_${type.key}_6week_breaches`] as number;
    const thirteenWeekBreaches = trustData[`diag_${type.key}_13week_breaches`] as number;

    if (totalWaiting && totalWaiting > 0) {
      const breachRate = (sixWeekBreaches / totalWaiting) * 100;
      
      // Critical threshold: 15% breach rate
      if (breachRate >= 15) {
        criticalServices.push({
          name: type.name,
          type: type.key,
          breachRate,
          totalWaiting,
          sixWeekBreaches: sixWeekBreaches || 0,
          thirteenWeekBreaches: thirteenWeekBreaches || 0
        });
      }
    }
  });

  return {
    count: criticalServices.length,
    services: criticalServices.sort((a, b) => b.breachRate - a.breachRate) // Worst first
  };
}
```

### Phase 2: Critical Issues Alert Panel (2-3 hours)

#### Task 2.1: Critical Issues Component
```typescript
// components/dashboard/critical-issues-panel.tsx
export function CriticalIssuesPanel({ trustData }: { trustData: NHSTrustData[] }) {
  const latestData = trustData[trustData.length - 1];
  
  const criticalIssues = useMemo(() => {
    return identifyAllCriticalIssues(latestData);
  }, [latestData]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          Critical Issues Alert
        </CardTitle>
        <CardDescription>
          Performance areas requiring immediate attention
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {criticalIssues.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-700">All Systems Operating Well</h3>
            <p className="text-sm text-slate-600">No critical performance issues identified</p>
          </div>
        ) : (
          <div className="space-y-3">
            {criticalIssues.map((issue, index) => (
              <CriticalIssueCard key={index} issue={issue} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CriticalIssue {
  category: 'RTT' | 'Diagnostic' | 'A&E' | 'Capacity';
  severity: 'Critical' | 'High' | 'Moderate';
  title: string;
  description: string;
  metric: string;
  value: number;
  target?: number;
  icon: React.ComponentType<{ className?: string }>;
}

function CriticalIssueCard({ issue }: { issue: CriticalIssue }) {
  const severityConfig = {
    Critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'destructive' },
    High: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'secondary' },
    Moderate: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'outline' }
  };

  const config = severityConfig[issue.severity];

  return (
    <div className={`p-4 rounded-lg border ${config.bg} ${config.border}`}>
      <div className="flex items-start gap-3">
        <issue.icon className={`h-5 w-5 mt-0.5 ${config.text}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`font-semibold ${config.text}`}>{issue.title}</h4>
            <Badge variant={config.badge as any} className="text-xs">
              {issue.severity}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {issue.category}
            </Badge>
          </div>
          <p className="text-sm text-slate-600 mb-2">{issue.description}</p>
          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium">{issue.metric}: {issue.value}</span>
            {issue.target && (
              <span className="text-slate-500">Target: {issue.target}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### Task 2.2: Critical Issues Identification Logic
```typescript
// lib/critical-issues-identifier.ts
export function identifyAllCriticalIssues(trustData: NHSTrustData): CriticalIssue[] {
  const issues: CriticalIssue[] = [];

  // RTT Critical Issues
  const rttCompliance = trustData.trust_total_percent_within_18_weeks;
  if (rttCompliance && rttCompliance < 50) {
    issues.push({
      category: 'RTT',
      severity: 'Critical',
      title: 'RTT Compliance Below 50%',
      description: 'Trust-wide RTT performance is critically low',
      metric: 'Compliance',
      value: rttCompliance,
      target: 92,
      icon: Clock
    });
  }

  // Check individual specialties for critical RTT performance
  const criticalRTTSpecialties = identifyCriticalRTTSpecialties(trustData);
  criticalRTTSpecialties.forEach(specialty => {
    issues.push({
      category: 'RTT',
      severity: specialty.compliance < 30 ? 'Critical' : 'High',
      title: `${specialty.name} RTT Critical`,
      description: `Specialty performance significantly below target`,
      metric: 'Compliance',
      value: specialty.compliance,
      target: 92,
      icon: AlertTriangle
    });
  });

  // Diagnostic Critical Issues
  const criticalDiagnostics = calculateCriticalDiagnosticServices(trustData);
  criticalDiagnostics.services.forEach(service => {
    issues.push({
      category: 'Diagnostic',
      severity: service.breachRate > 25 ? 'Critical' : 'High',
      title: `${service.name} High Breach Rate`,
      description: `${service.breachRate.toFixed(1)}% of patients waiting over 6 weeks`,
      metric: 'Breach Rate',
      value: service.breachRate,
      target: 15,
      icon: Activity
    });
  });

  // A&E Critical Issues
  const aePerformance = trustData.ae_4hr_performance_pct;
  if (aePerformance && aePerformance < 70) {
    issues.push({
      category: 'A&E',
      severity: aePerformance < 50 ? 'Critical' : 'High',
      title: 'A&E 4-Hour Performance Critical',
      description: 'Emergency department performance significantly below target',
      metric: 'Performance',
      value: aePerformance,
      target: 95,
      icon: Ambulance
    });
  }

  // 12-hour wait issues
  const twelveHourWaits = trustData.ae_12hr_wait_admissions;
  if (twelveHourWaits && twelveHourWaits > 50) {
    issues.push({
      category: 'A&E',
      severity: twelveHourWaits > 100 ? 'Critical' : 'High',
      title: '12-Hour Emergency Waits',
      description: 'Excessive 12-hour waits indicate severe capacity issues',
      metric: '12-hour waits',
      value: twelveHourWaits,
      icon: Clock
    });
  }

  // Capacity Critical Issues
  const virtualWardOccupancy = trustData.virtual_ward_occupancy_rate;
  if (virtualWardOccupancy && virtualWardOccupancy > 95) {
    issues.push({
      category: 'Capacity',
      severity: 'High',
      title: 'Virtual Ward Over-Capacity',
      description: 'Virtual ward utilization exceeding safe operational limits',
      metric: 'Occupancy',
      value: virtualWardOccupancy,
      target: 85,
      icon: Building2
    });
  }

  // Sort by severity (Critical first, then High, then Moderate)
  return issues.sort((a, b) => {
    const severityOrder = { Critical: 0, High: 1, Moderate: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}
```

### Phase 3: Diagnostic Breach Breakdown Chart (2 hours)

#### Task 3.1: Diagnostic Breach Chart Component
```typescript
// components/charts/diagnostic-breach-breakdown-chart.tsx
export function DiagnosticBreachBreakdownChart({ data }: { data: NHSTrustData[] }) {
  const chartData = useMemo(() => {
    return data.map(monthData => {
      const diagnosticTypes = ['mri', 'ct', 'ultrasound', 'nuclear_medicine', 'dexa', 
                              'echocardiography', 'gastroscopy', 'colonoscopy'];
      
      let total6WeekBreaches = 0;
      let total13WeekBreaches = 0;
      let totalWaiting = 0;

      diagnosticTypes.forEach(type => {
        const waiting = monthData[`diag_${type}_total_waiting`] as number || 0;
        const sixWeek = monthData[`diag_${type}_6week_breaches`] as number || 0;
        const thirteenWeek = monthData[`diag_${type}_13week_breaches`] as number || 0;

        totalWaiting += waiting;
        total6WeekBreaches += sixWeek;
        total13WeekBreaches += thirteenWeek;
      });

      return {
        period: format(new Date(monthData.period), 'MMM yyyy'),
        month: monthData.period,
        '6+ weeks': total6WeekBreaches,
        '13+ weeks': total13WeekBreaches,
        'Within target': totalWaiting - total6WeekBreaches,
        totalWaiting
      };
    }).filter(item => item.totalWaiting > 0);
  }, [data]);

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="period" 
            fontSize={12}
            tick={{ fill: '#64748b' }}
          />
          <YAxis 
            fontSize={12}
            tick={{ fill: '#64748b' }}
            label={{ value: 'Patients', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e2e8f0',
              borderRadius: '6px'
            }}
            formatter={(value: number, name: string) => [
              value.toLocaleString(),
              name
            ]}
          />
          <Legend />
          <Bar 
            dataKey="Within target" 
            stackId="diagnostic" 
            fill="#10b981" 
            name="Within 6 weeks"
          />
          <Bar 
            dataKey="6+ weeks" 
            stackId="diagnostic" 
            fill="#f59e0b" 
            name="6-13 week waits"
          />
          <Bar 
            dataKey="13+ weeks" 
            stackId="diagnostic" 
            fill="#ef4444" 
            name="13+ week waits"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### Phase 4: Layout Integration and Filter Removal (1 hour)

#### Task 4.1: Update Overview Page Layout
```typescript
// app/dashboard/page.tsx (Overview Page)
export default function OverviewPage() {
  const { getTrustData } = useNHSData();
  const [selectedTrust] = useTrustSelection();
  const trustData = getTrustData(selectedTrust);

  if (!trustData.length) {
    return <div className="p-6">Loading trust data...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Updated KPI Cards */}
      <OverviewKPICards trustData={trustData} />
      
      {/* 2x2 Chart Grid - Updated Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Left: RTT Performance Trend (UNCHANGED) */}
        <Card>
          <CardHeader>
            <CardTitle>RTT Performance Trend</CardTitle>
            <CardDescription>18-week compliance over time with 92% NHS standard</CardDescription>
          </CardHeader>
          <CardContent>
            <RTTPerformanceChart data={trustData} />
          </CardContent>
        </Card>

        {/* Top Right: Critical Issues Alert Panel (NEW) */}
        <CriticalIssuesPanel trustData={trustData} />

        {/* Bottom Left: Average Wait Time (UNCHANGED) */}
        <Card>
          <CardHeader>
            <CardTitle>Average Wait Time</CardTitle>
            <CardDescription>Median waiting time in weeks with trend analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <AverageWaitChart data={trustData} />
          </CardContent>
        </Card>

        {/* Bottom Right: Diagnostic Breach Breakdown (NEW) */}
        <Card>
          <CardHeader>
            <CardTitle>Diagnostic Services Breakdown</CardTitle>
            <CardDescription>6+ and 13+ week breach categories across diagnostic services</CardDescription>
          </CardHeader>
          <CardContent>
            <DiagnosticBreachBreakdownChart data={trustData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

#### Task 4.2: Remove Filter Components
Remove the following from the overview page:
- Specialty filter dropdown
- Date range filter dropdown  
- Any filter-related state management
- Filter bar component entirely

## File Structure Updates

### Files to Modify
```
app/dashboard/page.tsx (main overview page)
components/dashboard/kpi-cards.tsx → overview-kpi-cards.tsx (rename and update)
```

### Files to Create
```
components/dashboard/
├── critical-issues-panel.tsx
├── overview-kpi-cards.tsx (updated from existing)
└── critical-issue-card.tsx

components/charts/
└── diagnostic-breach-breakdown-chart.tsx

lib/
├── critical-issues-calculator.ts
├── critical-issues-identifier.ts
└── specialty-critical-analyzer.ts
```

### Files to Remove/Update
```
- Remove filter components from overview page
- Update existing KPI cards component
- Replace waiting list volume chart
- Replace long wait breakdown chart
```

## Testing Checklist

### KPI Cards Testing
- [ ] RTT Compliance card shows correct percentage and status
- [ ] Critical Diagnostics card counts services above 15% breach rate
- [ ] A&E Performance handles undefined values gracefully
- [ ] Capacity Utilization card shows virtual ward occupancy correctly

### Critical Issues Panel Testing
- [ ] Identifies RTT specialties below performance thresholds
- [ ] Detects diagnostic services with high breach rates
- [ ] Shows A&E performance issues when present
- [ ] Displays capacity utilization concerns appropriately
- [ ] Shows "All Systems Operating Well" when no issues

### Diagnostic Breach Chart Testing
- [ ] Aggregates breach data across all diagnostic services correctly
- [ ] Shows 6+ week and 13+ week categories distinctly
- [ ] Displays monthly trends properly
- [ ] Handles missing diagnostic data gracefully

### Layout Integration Testing
- [ ] 2x2 grid layout maintains proper proportions
- [ ] All charts render correctly in their designated areas
- [ ] Filter components completely removed from overview
- [ ] Responsive design works on mobile/tablet
- [ ] Page loads efficiently with new components

## Success Criteria
- [ ] Comprehensive view of trust performance across all key areas
- [ ] Clear identification of critical performance issues
- [ ] Balanced representation of RTT, diagnostic, A&E, and capacity metrics
- [ ] Actionable intelligence without sales-focused features
- [ ] Clean, uncluttered overview suitable for strategic analysis
- [ ] Effective use of visual hierarchy to highlight urgent issues