# NHS Analytics v5 - Complete Development Plan

## Project Overview
Build a comprehensive NHS trust analytics dashboard using CSV data integration. Focus on recreating the proven dashboard design with real data from day one. **NO SAMPLE DATA** - all visualizations must use authentic NHS data from unified_monthly_data_enhanced.csv.

## Project Context
- **Location**: `C:\Users\Mark\Projects\NHS Data Analytics v5`
- **Data Source**: `data/unified_monthly_data_enhanced.csv` (271 columns, 1,816 records)
- **Coverage**: 151 NHS trusts × 12 months (Aug 2024 - July 2025)
- **Technology Stack**: Next.js 14, TypeScript, ShadCN/UI, Tailwind CSS, Recharts, Papa Parse
- **Design Reference**: Provided dashboard images showing desired layout and functionality

## Design Requirements

### Core Design Principles
- **Exact Layout Recreation**: Match provided dashboard images precisely
- **Trust Selector Location**: Main content header (NOT sidebar) - dropdown showing trust name
- **Sidebar Design**: Slim navigation with settings at bottom
- **Tab Navigation**: 6 tabs - Overview, RTT Deep Dive, Operational, Capacity, ICB Analysis, Custom Analytics
- **Real Data Integration**: CSV data loaded on app initialization, no fallbacks
- **Professional Aesthetics**: NHS color scheme, clean typography, suitable for client presentations

### Layout Structure
```
├── Slim Sidebar (left)
│   ├── NHS Analytics branding
│   ├── Navigation icons (6 tabs)
│   ├── Recent/Favorites (if applicable)
│   └── Settings (bottom)
├── Main Content Area
│   ├── Trust Selector (header dropdown)
│   ├── Tab-specific filters (horizontal bar)
│   └── Dashboard content (tab-dependent)
```

## Data Analysis Results

### Available Data Coverage
- **Total Records**: 1,816 trust-month observations
- **NHS Trusts**: 151 trusts with real NHS codes (R0A, R0B, RGT, etc.)
- **Time Coverage**: 12 months (2024-08-01 to 2025-07-01)
- **Geographic**: ICB codes available for regional analysis
- **Demo Trust**: Cambridge University Hospitals NHS FT (RGT)

### Data Categories Available
```
Basic Info (5 columns):
- trust_code, trust_name, period, icb_code, icb_name

RTT Metrics (168 columns):
- 20 medical specialties × 8 metrics each
- Trust-level aggregates (8 columns)
- Specialty examples: General Surgery, Urology, Trauma & Orthopaedics, ENT, Ophthalmology

A&E Metrics (5 columns):
- ae_attendances_total, ae_over_4hrs_total, ae_4hr_performance_pct
- ae_emergency_admissions_total, ae_12hr_wait_admissions

Diagnostics (90 columns):
- 15 test types: MRI, CT, Ultrasound, Endoscopy types, etc.
- 6 metrics per test: waiting lists, breaches, planned procedures

Capacity (3 columns):
- virtual_ward_capacity, virtual_ward_occupancy_rate, avg_daily_discharges
- Data Coverage: ~25% of records (sufficient for basic capacity tab)
```

## Development Phases

### Phase 1: Project Foundation (2-3 hours)

#### Task 1.1: Next.js Project Setup
```bash
# Initialize project with required dependencies
npx create-next-app@latest nhs-analytics-v5 --typescript --tailwind --app
cd nhs-analytics-v5
npm install papaparse @types/papaparse recharts lucide-react
npx shadcn-ui@latest init
npx shadcn-ui@latest add sidebar tabs card button select dropdown-menu badge
```

#### Task 1.2: Project Structure Creation
```
src/
├── app/
│   ├── layout.tsx (root layout with fonts, global styles)
│   ├── page.tsx (landing/welcome page)
│   └── dashboard/
│       ├── layout.tsx (dashboard shell with sidebar + main content)
│       ├── page.tsx (overview tab - default route)
│       ├── rtt-deep-dive/page.tsx
│       ├── operational/page.tsx  
│       ├── capacity/page.tsx
│       ├── icb-analysis/page.tsx
│       └── custom-analytics/page.tsx
├── components/
│   ├── ui/ (ShadCN components)
│   ├── dashboard/
│   │   ├── sidebar.tsx
│   │   ├── trust-selector.tsx
│   │   ├── tab-navigation.tsx
│   │   ├── kpi-cards.tsx
│   │   └── filters-bar.tsx
│   └── charts/
│       ├── rtt-performance-chart.tsx
│       ├── specialty-heatmap.tsx
│       ├── breach-analysis-chart.tsx
│       ├── ae-performance-chart.tsx
│       └── diagnostics-chart.tsx
├── lib/
│   ├── csv-data.ts (CSV loading and caching)
│   ├── data-transformers.ts (data processing utilities)
│   ├── chart-utils.ts (chart formatting helpers)
│   └── utils.ts (general utilities)
├── hooks/
│   ├── use-nhs-data.ts (main data access hook)
│   ├── use-trust-selection.ts (trust selection state)
│   └── use-data-filters.ts (filtering logic)
├── types/
│   └── nhs-data.ts (TypeScript interfaces for CSV structure)
└── data/ (or public/data/)
    └── unified_monthly_data_enhanced.csv
```

#### Task 1.3: CSV Data Integration System
```typescript
// types/nhs-data.ts
export interface NHSTrustData {
  // Basic Information
  trust_code: string;
  trust_name: string;
  period: string; // YYYY-MM-DD format
  icb_code: string;
  icb_name: string;
  
  // RTT Metrics (Trust Level)
  trust_total_percent_within_18_weeks: number;
  trust_total_total_incomplete_pathways: number;
  trust_total_total_52_plus_weeks: number;
  trust_total_total_65_plus_weeks: number;
  trust_total_total_78_plus_weeks: number;
  trust_total_median_wait_weeks: number;
  
  // A&E Metrics
  ae_4hr_performance_pct: number;
  ae_attendances_total: number;
  ae_over_4hrs_total: number;
  ae_emergency_admissions_total: number;
  ae_12hr_wait_admissions: number;
  
  // Specialty RTT (20 specialties × 8 metrics = 160 columns)
  rtt_general_surgery_percent_within_18_weeks: number;
  rtt_urology_percent_within_18_weeks: number;
  // ... all specialty combinations
  
  // Diagnostics (15 types × 6 metrics = 90 columns)  
  diag_mri_total_waiting: number;
  diag_mri_6week_breaches: number;
  diag_mri_13week_breaches: number;
  // ... all diagnostic combinations
  
  // Capacity
  virtual_ward_capacity?: number;
  virtual_ward_occupancy_rate?: number;
  avg_daily_discharges?: number;
}

// lib/csv-data.ts
import Papa from 'papaparse';

let cachedData: NHSTrustData[] | null = null;

export async function loadNHSData(): Promise<NHSTrustData[]> {
  if (cachedData) return cachedData;
  
  try {
    const response = await fetch('/data/unified_monthly_data_enhanced.csv');
    const csvText = await response.text();
    
    const result = Papa.parse<NHSTrustData>(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim()
    });
    
    if (result.errors.length > 0) {
      console.error('CSV parsing errors:', result.errors);
    }
    
    cachedData = result.data.filter(row => row.trust_code && row.trust_name);
    return cachedData;
  } catch (error) {
    console.error('Failed to load NHS data:', error);
    return [];
  }
}

export function getTrustData(trustCode: string): NHSTrustData[] {
  if (!cachedData) return [];
  return cachedData.filter(row => row.trust_code === trustCode).sort((a, b) => a.period.localeCompare(b.period));
}

export function getAllTrusts(): Array<{code: string, name: string, icb: string}> {
  if (!cachedData) return [];
  const trusts = new Map();
  cachedData.forEach(row => {
    if (!trusts.has(row.trust_code)) {
      trusts.set(row.trust_code, {
        code: row.trust_code,
        name: row.trust_name,
        icb: row.icb_name || 'Unknown ICB'
      });
    }
  });
  return Array.from(trusts.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// hooks/use-nhs-data.ts
import { useState, useEffect } from 'react';
import { loadNHSData, getTrustData, getAllTrusts, type NHSTrustData } from '@/lib/csv-data';

export function useNHSData() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trusts, setTrusts] = useState<Array<{code: string, name: string, icb: string}>>([]);

  useEffect(() => {
    loadNHSData()
      .then(() => {
        setTrusts(getAllTrusts());
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  return { trusts, isLoading, error, getTrustData };
}
```

### Phase 2: Dashboard Shell & Navigation (2-3 hours)

#### Task 2.1: Dashboard Layout Implementation
```typescript
// app/dashboard/layout.tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <DashboardSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TrustSelectorHeader />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

// components/dashboard/sidebar.tsx
export function DashboardSidebar() {
  const pathname = usePathname();
  
  const navigation = [
    { name: 'Overview', href: '/dashboard', icon: BarChart3 },
    { name: 'RTT Deep Dive', href: '/dashboard/rtt-deep-dive', icon: TrendingUp },
    { name: 'Operational', href: '/dashboard/operational', icon: Activity },
    { name: 'Capacity', href: '/dashboard/capacity', icon: Building2 },
    { name: 'ICB Analysis', href: '/dashboard/icb-analysis', icon: MapPin },
    { name: 'Custom Analytics', href: '/dashboard/custom-analytics', icon: LineChart }
  ];

  return (
    <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col">
      {/* NHS Analytics branding */}
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold text-nhs-blue">NHS Analytics</h1>
        <p className="text-sm text-slate-600">Trust Dashboard</p>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              pathname === item.href 
                ? "bg-nhs-blue text-white" 
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </Link>
        ))}
      </nav>
      
      {/* Settings at bottom */}
      <div className="p-4 border-t">
        <Button variant="ghost" className="w-full justify-start gap-3">
          <Settings className="h-5 w-5" />
          Settings
        </Button>
      </div>
    </div>
  );
}

// components/dashboard/trust-selector.tsx
export function TrustSelectorHeader() {
  const { trusts, isLoading } = useNHSData();
  const [selectedTrust, setSelectedTrust] = useState<string>('RGT'); // Default to Cambridge
  
  const currentTrust = trusts.find(t => t.code === selectedTrust);
  
  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={selectedTrust} onValueChange={setSelectedTrust}>
            <SelectTrigger className="w-[400px]">
              <SelectValue>
                {currentTrust ? (
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">{currentTrust.name}</span>
                    <span className="text-sm text-slate-500">{currentTrust.icb}</span>
                  </div>
                ) : (
                  'Select NHS Trust'
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {trusts.map((trust) => (
                <SelectItem key={trust.code} value={trust.code}>
                  <div className="flex flex-col">
                    <span>{trust.name}</span>
                    <span className="text-sm text-slate-500">{trust.icb}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="text-sm text-slate-600">
          RTT performance analysis and operational intelligence
        </div>
      </div>
    </div>
  );
}
```

#### Task 2.2: NHS Color Scheme Implementation
```css
/* globals.css - NHS color palette */
:root {
  --nhs-blue: #005eb8;
  --nhs-dark-blue: #003087;
  --nhs-light-blue: #0072ce;
  --success-green: #00a650;
  --warning-amber: #ffb81c;
  --danger-red: #da291c;
  --performance-excellent: #00a650;
  --performance-good: #78be20;
  --performance-concern: #ffb81c;
  --performance-critical: #da291c;
}
```

### Phase 3: Overview Tab Implementation (3-4 hours)

#### Task 3.1: KPI Cards (Exact Image 1 Recreation)
```typescript
// components/dashboard/kpi-cards.tsx
export function KPICards({ trustData }: { trustData: NHSTrustData[] }) {
  const latestData = trustData[trustData.length - 1];
  const previousData = trustData[trustData.length - 2];
  
  const kpiCards = [
    {
      title: "RTT 18-week Compliance",
      value: latestData.trust_total_percent_within_18_weeks,
      previousValue: previousData?.trust_total_percent_within_18_weeks,
      target: 92,
      format: "percentage",
      trend: "% from last month",
      description: "Target: 92%"
    },
    {
      title: "52+ Week Waiters", 
      value: latestData.trust_total_total_52_plus_weeks,
      previousValue: previousData?.trust_total_total_52_plus_weeks,
      target: 0,
      format: "number",
      trend: "% from last month", 
      description: "Should be zero"
    },
    {
      title: "Total Waiting List",
      value: latestData.trust_total_total_incomplete_pathways,
      previousValue: previousData?.trust_total_total_incomplete_pathways,
      format: "number",
      trend: "% from last month",
      description: "All incomplete RTT pathways"
    },
    {
      title: "A&E 4-hour Performance",
      value: latestData.ae_4hr_performance_pct,
      previousValue: previousData?.ae_4hr_performance_pct,
      target: 95,
      format: "percentage", 
      trend: "% from last month",
      description: "Target: 95%"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {kpiCards.map((kpi) => (
        <Card key={kpi.title}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-600">{kpi.title}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">
                    {kpi.format === "percentage" 
                      ? `${kpi.value?.toFixed(1)}%`
                      : kpi.value?.toLocaleString()
                    }
                  </p>
                  {kpi.previousValue && (
                    <TrendIndicator 
                      current={kpi.value} 
                      previous={kpi.previousValue}
                      format={kpi.format}
                    />
                  )}
                </div>
                <p className="text-xs text-slate-500">{kpi.description}</p>
              </div>
              <div className="text-right">
                <PerformanceIndicator 
                  value={kpi.value} 
                  target={kpi.target}
                  format={kpi.format} 
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

#### Task 3.2: Chart Grid Implementation (2x2 Layout)
```typescript
// app/dashboard/page.tsx (Overview Tab)
export default function OverviewPage() {
  const { getTrustData } = useNHSData();
  const [selectedTrust] = useTrustSelection();
  const trustData = getTrustData(selectedTrust);

  if (!trustData.length) {
    return <div>Loading trust data...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <KPICards trustData={trustData} />
      
      {/* 2x2 Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance vs 92% Target</CardTitle>
            <CardDescription>RTT 18-week compliance over time with 92% NHS standard</CardDescription>
          </CardHeader>
          <CardContent>
            <RTTPerformanceChart data={trustData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Patients Awaiting Treatment</CardTitle>
            <CardDescription>Total incomplete pathways by month</CardDescription>
          </CardHeader>
          <CardContent>
            <WaitingListChart data={trustData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Wait Time</CardTitle>
            <CardDescription>Mean waiting time in weeks with trend analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <AverageWaitChart data={trustData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>52/65/78 Week Breakdown</CardTitle>
            <CardDescription>Long wait breach categories over time</CardDescription>
          </CardHeader>
          <CardContent>
            <BreachBreakdownChart data={trustData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### Phase 4: RTT Deep Dive Tab (4-5 hours)

#### Task 4.1: Specialty Performance Heatmap (Image 2 Recreation)
```typescript
// components/charts/specialty-heatmap.tsx
export function SpecialtyHeatmap({ trustData }: { trustData: NHSTrustData[] }) {
  const latestData = trustData[trustData.length - 1];
  
  const specialties = [
    { key: 'general_surgery', name: 'General Surgery', code: '100' },
    { key: 'urology', name: 'Urology', code: '101' },
    { key: 'trauma_orthopaedics', name: 'Trauma & Orthopaedics', code: '110' },
    { key: 'ent', name: 'ENT', code: '120' },
    { key: 'ophthalmology', name: 'Ophthalmology', code: '130' },
    { key: 'oral_surgery', name: 'Oral Surgery', code: '140' },
    { key: 'general_medicine', name: 'General Internal Medicine', code: '150' },
    { key: 'gastroenterology', name: 'Gastroenterology', code: '160' },
    { key: 'cardiology', name: 'Cardiology', code: '170' },
    { key: 'pediatric_cardiology', name: 'Paediatric Cardiology', code: '171' }
    // ... all 20 specialties from CSV
  ];

  const getPerformanceLevel = (percentage: number) => {
    if (percentage >= 90) return { level: 'Excellent', color: 'bg-green-500', textColor: 'text-white' };
    if (percentage >= 75) return { level: 'Good', color: 'bg-green-400', textColor: 'text-white' };
    if (percentage >= 50) return { level: 'Concern', color: 'bg-yellow-400', textColor: 'text-black' };
    return { level: 'Critical', color: 'bg-red-500', textColor: 'text-white' };
  };

  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <h3 className="font-semibold text-red-800">Critical RTT Performance Detected</h3>
          <Button size="sm" variant="outline" className="ml-auto">
            View Action Plan
          </Button>
        </div>
        <p className="text-sm text-red-700 mt-1">
          5 specialties performing below 50% compliance threshold
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Specialty Performance Heatmap</CardTitle>
          <CardDescription>
            RTT 18-week compliance across all specialties - click cells for detailed analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {specialties.map((specialty) => {
              const percentage = latestData[`rtt_${specialty.key}_percent_within_18_weeks`] as number;
              const compliance = latestData[`rtt_${specialty.key}_total_within_18_weeks`] as number;
              const performance = getPerformanceLevel(percentage);
              
              return (
                <div key={specialty.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${performance.color}`} />
                    <div>
                      <p className="font-medium">{specialty.name}</p>
                      <p className="text-sm text-slate-600">Code: {specialty.code}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{percentage?.toFixed(1)}%</p>
                    <Badge variant={performance.level.toLowerCase() as any}>
                      {performance.level}
                    </Badge>
                    <p className="text-xs text-slate-500">18-week compliance</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

#### Task 4.2: Breach Analysis Dashboard (Image 2 Metric Cards)
```typescript
// components/dashboard/breach-cards.tsx
export function BreachAnalysisCards({ trustData }: { trustData: NHSTrustData[] }) {
  const latestData = trustData[trustData.length - 1];
  
  const breachMetrics = [
    {
      title: "52+ Week Breaches",
      value: latestData.trust_total_total_52_plus_weeks,
      description: "Critical breach threshold",
      color: "border-red-500 bg-red-50",
      textColor: "text-red-700",
      valueColor: "text-red-600"
    },
    {
      title: "65+ Week Breaches", 
      value: latestData.trust_total_total_65_plus_weeks,
      description: "Severe delay threshold",
      color: "border-orange-500 bg-orange-50",
      textColor: "text-orange-700", 
      valueColor: "text-orange-600"
    },
    {
      title: "78+ Week Breaches",
      value: latestData.trust_total_total_78_plus_weeks,
      description: "Extreme delay threshold", 
      color: "border-red-600 bg-red-100",
      textColor: "text-red-800",
      valueColor: "text-red-700"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {breachMetrics.map((metric) => (
        <Card key={metric.title} className={metric.color}>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className={`text-sm font-medium ${metric.textColor} mb-2`}>
                {metric.title}
              </h3>
              <p className={`text-3xl font-bold ${metric.valueColor}`}>
                {metric.value?.toLocaleString() || '0'}
              </p>
              <p className={`text-xs ${metric.textColor} mt-2`}>
                {metric.description}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### Phase 5: Operational Tab Implementation (3-4 hours)

#### Task 5.1: A&E Performance Dashboard
```typescript
// app/dashboard/operational/page.tsx
export default function OperationalPage() {
  const { getTrustData } = useNHSData();
  const [selectedTrust] = useTrustSelection();
  const trustData = getTrustData(selectedTrust);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Operational Performance</h1>
          <p className="text-slate-600">Emergency department and diagnostic service analysis</p>
        </div>
      </div>

      {/* A&E Performance Section */}
      <Card>
        <CardHeader>
          <CardTitle>Emergency Department Performance</CardTitle>
          <CardDescription>4-hour standard and emergency flow metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <AEPerformanceDashboard data={trustData} />
        </CardContent>
      </Card>

      {/* Diagnostics Section */}
      <Card>
        <CardHeader>
          <CardTitle>Diagnostic Services Performance</CardTitle>
          <CardDescription>Waiting times and breach analysis across 15 test types</CardDescription>
        </CardHeader>
        <CardContent>
          <DiagnosticsPerformanceDashboard data={trustData} />
        </CardContent>
      </Card>
    </div>
  );
}
```

#### Task 5.2: Diagnostics Analysis
```typescript
// components/charts/diagnostics-chart.tsx
export function DiagnosticsPerformanceDashboard({ data }: { data: NHSTrustData[] }) {
  const diagnosticTypes = [
    'mri', 'ct', 'ultrasound', 'nuclear_medicine', 'dexa', 
    'echocardiography', 'electrophysiology', 'neurophysiology',
    'audiology', 'gastroscopy', 'colonoscopy', 'sigmoidoscopy', 
    'cystoscopy', 'urodynamics', 'sleep_studies'
  ];

  const latestData = data[data.length - 1];
  
  return (
    <div className="space-y-6">
      {diagnosticTypes.map((type) => {
        const totalWaiting = latestData[`diag_${type}_total_waiting`] as number;
        const sixWeekBreaches = latestData[`diag_${type}_6week_breaches`] as number;
        const thirteenWeekBreaches = latestData[`diag_${type}_13week_breaches`] as number;
        
        if (!totalWaiting) return null;

        const breachRate = ((sixWeekBreaches / totalWaiting) * 100);
        
        return (
          <div key={type} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <h4 className="font-medium capitalize">{type.replace(/_/g, ' ')}</h4>
              <p className="text-sm text-slate-600">
                {totalWaiting.toLocaleString()} total waiting
              </p>
            </div>
            <div className="text-right space-y-1">
              <div className="flex gap-4">
                <div>
                  <p className="text-sm text-slate-600">6+ weeks</p>
                  <p className="font-semibold text-orange-600">
                    {sixWeekBreaches?.toLocaleString() || '0'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">13+ weeks</p>
                  <p className="font-semibold text-red-600">
                    {thirteenWeekBreaches?.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
              <Badge variant={breachRate > 15 ? 'destructive' : breachRate > 5 ? 'secondary' : 'default'}>
                {breachRate.toFixed(1)}% breach rate
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

### Phase 6: Capacity Tab (2 hours)

#### Task 6.1: Limited Capacity Dashboard
```typescript
// app/dashboard/capacity/page.tsx
export default function CapacityPage() {
  const { getTrustData } = useNHSData();
  const [selectedTrust] = useTrustSelection();
  const trustData = getTrustData(selectedTrust);

  const hasCapacityData = trustData.some(d => 
    d.virtual_ward_capacity || d.virtual_ward_occupancy_rate || d.avg_daily_discharges
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Capacity Intelligence</h1>
          <p className="text-slate-600">Virtual ward utilization and capacity metrics</p>
        </div>
      </div>

      {!hasCapacityData ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Limited Capacity Data</h3>
            <p className="text-slate-600 mb-4">
              Capacity metrics are available for approximately 25% of trusts in the dataset.
              This trust may not have reported virtual ward or capacity data for the selected period.
            </p>
            <Badge variant="secondary">Data Coverage: ~25% of records</Badge>
          </CardContent>
        </Card>
      ) : (
        <VirtualWardDashboard data={trustData} />
      )}
    </div>
  );
}
```

### Phase 7: ICB Analysis Tab (3 hours)

#### Task 7.1: ICB Performance Dashboard
```typescript
// app/dashboard/icb-analysis/page.tsx
export default function ICBAnalysisPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ICB Regional Analysis</h1>
          <p className="text-slate-600">Integrated Care Board performance analysis and regional benchmarking</p>
        </div>
      </div>

      <Tabs defaultValue="icb-overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="icb-overview">ICB Overview</TabsTrigger>
          <TabsTrigger value="regional-comparison">Regional Comparison</TabsTrigger>
          <TabsTrigger value="trust-rankings">Trust Rankings</TabsTrigger>
          <TabsTrigger value="geographic-analysis">Geographic Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="icb-overview">
          <ICBOverviewDashboard />
        </TabsContent>

        <TabsContent value="regional-comparison">
          <RegionalComparisonDashboard />
        </TabsContent>

        <TabsContent value="trust-rankings">
          <TrustRankingsDashboard />
        </TabsContent>

        <TabsContent value="geographic-analysis">
          <GeographicAnalysisDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

#### Task 7.2: ICB Components Implementation
```typescript
// components/charts/icb-overview.tsx
export function ICBOverviewDashboard() {
  const { getAllTrusts, getTrustData } = useNHSData();
  const [selectedICB, setSelectedICB] = useState<string>('');

  // Group trusts by ICB
  const icbGroups = useMemo(() => {
    const groups = new Map();
    getAllTrusts().forEach(trust => {
      if (trust.icb) {
        if (!groups.has(trust.icb)) {
          groups.set(trust.icb, []);
        }
        groups.get(trust.icb).push(trust);
      }
    });
    return groups;
  }, [getAllTrusts]);

  return (
    <div className="space-y-6">
      {/* ICB Performance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from(icbGroups.entries()).map(([icbName, trusts]) => (
          <ICBPerformanceCard
            key={icbName}
            icbName={icbName}
            trusts={trusts}
            onClick={() => setSelectedICB(icbName)}
          />
        ))}
      </div>

      {/* Selected ICB Details */}
      {selectedICB && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedICB} - Detailed Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ICBDetailedAnalysis icbName={selectedICB} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ICB Performance Card Component
export function ICBPerformanceCard({ icbName, trusts, onClick }: ICBCardProps) {
  const { getTrustData } = useNHSData();

  // Calculate ICB aggregate metrics
  const icbMetrics = useMemo(() => {
    const allTrustData = trusts.flatMap(trust => getTrustData(trust.code));
    const latestData = allTrustData.filter(record => record.period === '2025-07-01');

    if (latestData.length === 0) return null;

    return {
      avgRTTCompliance: latestData.reduce((sum, r) => sum + r.trust_total_percent_within_18_weeks, 0) / latestData.length,
      totalWaitingList: latestData.reduce((sum, r) => sum + r.trust_total_total_incomplete_pathways, 0),
      total52PlusWaiters: latestData.reduce((sum, r) => sum + r.trust_total_total_52_plus_weeks, 0),
      trustCount: trusts.length
    };
  }, [trusts, getTrustData]);

  if (!icbMetrics) return null;

  const performanceColor = icbMetrics.avgRTTCompliance >= 80 ? 'text-green-600' : 
                          icbMetrics.avgRTTCompliance >= 60 ? 'text-yellow-600' : 'text-red-600';

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg">{icbName.substring(0, 40)}</h3>
            <p className="text-sm text-slate-600">{icbMetrics.trustCount} NHS Trusts</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-600">Avg RTT Compliance</p>
              <p className={`text-2xl font-bold ${performanceColor}`}>
                {icbMetrics.avgRTTCompliance.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">52+ Week Waiters</p>
              <p className="text-2xl font-bold text-slate-900">
                {icbMetrics.total52PlusWaiters.toLocaleString()}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-600">Total Waiting List</p>
            <p className="text-lg font-semibold">
              {icbMetrics.totalWaitingList.toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Phase 8: Custom Analytics Workbench (4 hours)

#### Task 8.1: Chart Builder Interface
```typescript
// app/dashboard/custom-analytics/page.tsx
export default function CustomAnalyticsPage() {
  const [chartConfig, setChartConfig] = useState<ChartConfiguration>({
    chartType: 'line',
    xAxis: '',
    yAxis: '',
    groupBy: '',
    filters: {},
    trustSelection: 'single'
  });

  return (
    <div className="h-full flex">
      {/* Left Panel - Chart Builder Tools */}
      <div className="w-1/3 border-r border-slate-200 p-6 overflow-y-auto">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">Custom Analytics</h1>
            <p className="text-slate-600">Build custom visualizations and correlations</p>
          </div>

          <ChartBuilderControls 
            config={chartConfig}
            onChange={setChartConfig}
          />
        </div>
      </div>

      {/* Right Panel - Live Preview */}
      <div className="flex-1 p-6">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Live Preview</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Export Data
              </Button>
              <Button variant="outline" size="sm">
                Export Chart
              </Button>
              <Button size="sm">
                Save Analysis
              </Button>
            </div>
          </div>

          <div className="flex-1 bg-slate-50 rounded-lg p-6">
            <CustomChartRenderer config={chartConfig} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### Task 8.2: Chart Builder Controls
```typescript
// components/analytics/chart-builder-controls.tsx
export function ChartBuilderControls({ config, onChange }: ChartBuilderProps) {
  const { getAllTrusts } = useNHSData();
  const availableMetrics = useAvailableMetrics();

  return (
    <div className="space-y-6">
      {/* Chart Type Selection */}
      <div>
        <Label className="text-sm font-medium">Chart Type</Label>
        <Select 
          value={config.chartType} 
          onValueChange={(value) => onChange({...config, chartType: value})}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="line">Line Chart</SelectItem>
            <SelectItem value="bar">Bar Chart</SelectItem>
            <SelectItem value="scatter">Scatter Plot</SelectItem>
            <SelectItem value="area">Area Chart</SelectItem>
            <SelectItem value="heatmap">Heatmap</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Metric Selection */}
      <div>
        <Label className="text-sm font-medium">X-Axis Metric</Label>
        <Select 
          value={config.xAxis} 
          onValueChange={(value) => onChange({...config, xAxis: value})}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select X-axis metric" />
          </SelectTrigger>
          <SelectContent>
            {availableMetrics.map(metric => (
              <SelectItem key={metric.key} value={metric.key}>
                {metric.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-medium">Y-Axis Metric</Label>
        <Select 
          value={config.yAxis} 
          onValueChange={(value) => onChange({...config, yAxis: value})}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Y-axis metric" />
          </SelectTrigger>
          <SelectContent>
            {availableMetrics.map(metric => (
              <SelectItem key={metric.key} value={metric.key}>
                {metric.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Trust Selection */}
      <div>
        <Label className="text-sm font-medium">Trust Selection</Label>
        <RadioGroup 
          value={config.trustSelection} 
          onValueChange={(value) => onChange({...config, trustSelection: value})}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="single" id="single" />
            <Label htmlFor="single">Current Trust</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="multiple" id="multiple" />
            <Label htmlFor="multiple">Compare Trusts</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="all" />
            <Label htmlFor="all">All Trusts</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Time Period Selection */}
      <div>
        <Label className="text-sm font-medium">Time Period</Label>
        <Select 
          value={config.timePeriod} 
          onValueChange={(value) => onChange({...config, timePeriod: value})}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select time period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">Latest Month</SelectItem>
            <SelectItem value="3months">Last 3 Months</SelectItem>
            <SelectItem value="6months">Last 6 Months</SelectItem>
            <SelectItem value="12months">All Available Data</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Advanced Filters */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center justify-between w-full">
          <Label className="text-sm font-medium">Advanced Filters</Label>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 mt-4">
          <AdvancedFilters 
            filters={config.filters}
            onChange={(filters) => onChange({...config, filters})}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Correlation Analysis */}
      <div>
        <Label className="text-sm font-medium">Analysis Type</Label>
        <RadioGroup 
          value={config.analysisType} 
          onValueChange={(value) => onChange({...config, analysisType: value})}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="trend" id="trend" />
            <Label htmlFor="trend">Trend Analysis</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="correlation" id="correlation" />
            <Label htmlFor="correlation">Correlation Analysis</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="distribution" id="distribution" />
            <Label htmlFor="distribution">Distribution Analysis</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
}
```

#### Task 8.3: Live Chart Renderer
```typescript
// components/analytics/custom-chart-renderer.tsx
export function CustomChartRenderer({ config }: CustomChartRendererProps) {
  const { getTrustData, getAllTrusts } = useNHSData();
  const [selectedTrust] = useTrustSelection();

  const chartData = useMemo(() => {
    return generateChartData(config, getTrustData, getAllTrusts, selectedTrust);
  }, [config, getTrustData, getAllTrusts, selectedTrust]);

  const renderChart = () => {
    switch (config.chartType) {
      case 'line':
        return <LineChart data={chartData} dataKey={config.yAxis} />;
      case 'bar':
        return <BarChart data={chartData} dataKey={config.yAxis} />;
      case 'scatter':
        return <ScatterChart data={chartData} xDataKey={config.xAxis} yDataKey={config.yAxis} />;
      case 'area':
        return <AreaChart data={chartData} dataKey={config.yAxis} />;
      case 'heatmap':
        return <HeatmapChart data={chartData} xKey={config.xAxis} yKey={config.yAxis} />;
      default:
        return <div className="text-center text-slate-500">Select chart type and metrics to preview</div>;
    }
  };

  if (!config.xAxis && !config.yAxis) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <BarChart3 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">Configure Your Analysis</h3>
          <p className="text-slate-500">Select metrics and chart type to see live preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Chart Title and Stats */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">
          {getChartTitle(config)}
        </h3>
        <div className="flex gap-4 text-sm text-slate-600">
          <span>Data points: {chartData.length}</span>
          <span>Time period: {getTimePeriodLabel(config.timePeriod)}</span>
          {config.analysisType === 'correlation' && (
            <span>Correlation: {calculateCorrelation(chartData, config.xAxis, config.yAxis)}</span>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

## Critical Development Guidelines

### Data Integration Requirements
1. **No Sample Data Policy**: Every visualization must use real CSV data
2. **Data Validation**: Always check if data exists before rendering components
3. **Error Handling**: Graceful degradation when data is missing
4. **Performance**: Cache parsed CSV data in memory after initial load

### Component Development Standards
```typescript
// Always validate data availability
function MyChart({ data }: { data: NHSTrustData[] }) {
  if (!data.length) {
    return <div className="p-4 text-center text-slate-500">No data available</div>;
  }
  
  // Process and render real data
  return <ActualChart data={data} />;
}

// Use consistent error boundaries
function DataWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary fallback={<div>Failed to load data</div>}>
      <Suspense fallback={<div>Loading...</div>}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}
```

### Design Consistency Requirements
- **Colors**: Use NHS color palette consistently
- **Typography**: Clean, professional fonts suitable for healthcare
- **Spacing**: Consistent padding/margins using Tailwind spacing scale
- **Components**: Use ShadCN components for consistent design system
- **Accessibility**: Proper ARIA labels, keyboard navigation, color contrast

## Success Criteria

### Functional Requirements
- [ ] All 5 dashboard tabs implemented and functional
- [ ] Trust selector in main content header (not sidebar)
- [ ] Real CSV data integration with no sample data
- [ ] Responsive design working on desktop and tablet
- [ ] Professional appearance suitable for NHS client presentations

### Performance Requirements
- [ ] Initial dashboard load under 3 seconds
- [ ] Trust switching under 1 second
- [ ] Smooth chart animations and transitions
- [ ] Efficient CSV parsing and caching

### Data Requirements
- [ ] All 271 CSV columns accessible through the application
- [ ] 151 NHS trusts available for selection
- [ ] 12 months of historical data for trend analysis
- [ ] Proper handling of missing data fields

## Next Steps for Claude Code

1. **Initialize Project**: Set up Next.js project with all dependencies
2. **Implement CSV Loading**: Build data layer with Papa Parse integration
3. **Create Dashboard Shell**: Build layout with sidebar and trust selector
4. **Build Overview Tab**: Implement KPI cards and 2x2 chart grid
5. **Implement RTT Deep Dive**: Create specialty heatmap and breach analysis
6. **Add Remaining Tabs**: Complete operational, capacity, and benchmarking tabs
7. **Polish and Test**: Ensure professional appearance and smooth functionality

Remember: **NO SAMPLE DATA** - every component must display real NHS data from the CSV file.