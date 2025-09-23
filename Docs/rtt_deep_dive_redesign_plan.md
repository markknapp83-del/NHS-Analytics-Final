# RTT Deep Dive Redesign Implementation Plan

## Overview
Redesign the RTT Deep Dive page to be more useful and interactive by implementing a tabbed interface with improved specialty analysis and dynamic breach data display.

## Current Issues to Fix
- RTT Deep Dive page doesn't add value beyond the overview page
- Specialty cards have important information crammed in corners
- No interactivity or drill-down capability
- Missing median wait time metric on performance trends

## Implementation Changes

### 1. Performance Trends Tab Updates

#### Remove A&E Card, Add Median Wait Time
```typescript
// Update KPI cards array in Performance Trends tab
const kpiCards = [
  {
    title: "RTT 18-week Compliance",
    value: latestData.trust_total_percent_within_18_weeks,
    previousValue: previousData?.trust_total_percent_within_18_weeks,
    target: 92,
    format: "percentage",
    description: "Target: 92%"
  },
  {
    title: "52+ Week Waiters", 
    value: latestData.trust_total_total_52_plus_weeks,
    previousValue: previousData?.trust_total_total_52_plus_weeks,
    target: 0,
    format: "number",
    description: "Should be zero"
  },
  {
    title: "Total Waiting List",
    value: latestData.trust_total_total_incomplete_pathways,
    previousValue: previousData?.trust_total_total_incomplete_pathways,
    format: "number",
    description: "All incomplete RTT pathways"
  },
  {
    title: "Median Wait Time", // NEW - replaces A&E 4-hour Performance
    value: latestData.trust_total_median_wait_weeks,
    previousValue: previousData?.trust_total_median_wait_weeks,
    format: "weeks",
    description: "Median waiting time in weeks",
    target: 9 // 18 weeks / 2 as rough target
  }
];
```

### 2. Page Structure - Tabbed Interface

#### Main Page Layout
```typescript
// app/dashboard/rtt-deep-dive/page.tsx
export default function RTTDeepDivePage() {
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('trust_total');
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">RTT Deep Dive Analysis</h1>
          <p className="text-slate-600">Comprehensive Referral to Treatment performance analysis</p>
        </div>
      </div>

      <Tabs defaultValue="trends" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="trends">Performance Trends</TabsTrigger>
          <TabsTrigger value="specialties">Specialty Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="trends">
          <RTTTrendsTab />
        </TabsContent>

        <TabsContent value="specialties">
          <SpecialtyAnalysisTab 
            selectedSpecialty={selectedSpecialty}
            onSpecialtySelect={setSelectedSpecialty}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### 3. Performance Trends Tab Component

#### Create RTTTrendsTab Component
```typescript
// components/dashboard/rtt-trends-tab.tsx
export function RTTTrendsTab() {
  const { getTrustData } = useNHSData();
  const [selectedTrust] = useTrustSelection();
  const trustData = getTrustData(selectedTrust);

  if (!trustData.length) {
    return <div>Loading trust data...</div>;
  }

  return (
    <div className="space-y-6">
      <KPICards trustData={trustData} /> {/* Updated cards with median wait time */}
      
      {/* 2x2 Chart Grid - Same as current overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance vs 92% Target</CardTitle>
            <CardDescription>RTT 18-week compliance over time</CardDescription>
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
            <CardDescription>Mean waiting time with trend analysis</CardDescription>
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

### 4. Specialty Analysis Tab - Interactive Design

#### Component Structure
```typescript
// components/dashboard/specialty-analysis-tab.tsx
export function SpecialtyAnalysisTab({ 
  selectedSpecialty, 
  onSpecialtySelect 
}: {
  selectedSpecialty: string;
  onSpecialtySelect: (specialty: string) => void;
}) {
  const { getTrustData } = useNHSData();
  const [selectedTrust] = useTrustSelection();
  const trustData = getTrustData(selectedTrust);
  const latestData = trustData[trustData.length - 1];

  // Get and rank specialties by performance (worst first)
  const rankedSpecialties = useMemo(() => {
    const specialties = getSpecialtiesData(latestData);
    return specialties.sort((a, b) => a.percentage - b.percentage); // Ascending = worst first
  }, [latestData]);

  // Get breach data for selected specialty
  const selectedSpecialtyData = getSpecialtyBreachData(latestData, selectedSpecialty);

  return (
    <div className="space-y-6">
      {/* Dynamic Breach Cards - Update based on selected specialty */}
      <DynamicBreachCards 
        data={selectedSpecialtyData} 
        specialtyName={getSpecialtyDisplayName(selectedSpecialty)}
      />

      {/* Specialty Performance Cards - Ranked worst to best */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Specialty Performance Ranking</h3>
          <p className="text-sm text-slate-600">Click specialty to view detailed breach analysis</p>
        </div>
        
        <div className="space-y-2">
          {rankedSpecialties.map((specialty, index) => (
            <InteractiveSpecialtyCard
              key={specialty.key}
              specialty={specialty}
              rank={index + 1}
              isSelected={selectedSpecialty === specialty.key}
              onClick={() => onSpecialtySelect(specialty.key)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

#### Interactive Specialty Cards
```typescript
// components/dashboard/interactive-specialty-card.tsx
export function InteractiveSpecialtyCard({
  specialty,
  rank,
  isSelected,
  onClick
}: {
  specialty: SpecialtyData;
  rank: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const performanceLevel = getPerformanceLevel(specialty.percentage);
  
  return (
    <Card 
      className={cn(
        "p-4 cursor-pointer transition-all duration-200 hover:shadow-md",
        isSelected && "ring-2 ring-nhs-blue bg-blue-50"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        {/* Rank Badge */}
        <div className="flex-shrink-0">
          <Badge 
            variant={rank <= 3 ? "destructive" : rank <= 6 ? "secondary" : "default"}
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
          >
            {rank}
          </Badge>
        </div>
        
        {/* Specialty Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-lg">{specialty.name}</h4>
          <p className="text-sm text-slate-600">Code: {specialty.code}</p>
        </div>
        
        {/* Performance Metrics */}
        <div className="flex-shrink-0 text-center space-y-1">
          <div className="text-2xl font-bold">{specialty.percentage}%</div>
          <Badge variant={performanceLevel.variant}>
            {performanceLevel.label}
          </Badge>
        </div>
        
        {/* Patient Numbers */}
        <div className="flex-shrink-0 text-right space-y-1">
          <div className="text-sm font-medium">
            {specialty.within18weeks?.toLocaleString()} of {specialty.total?.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">within 18 weeks</div>
        </div>
        
        {/* Selection Indicator */}
        <div className="flex-shrink-0 w-6">
          {isSelected && (
            <CheckCircle className="h-5 w-5 text-nhs-blue" />
          )}
        </div>
      </div>
    </Card>
  );
}
```

### 5. Dynamic Breach Cards

#### Update Breach Cards to Show Selected Specialty Data
```typescript
// components/dashboard/dynamic-breach-cards.tsx
export function DynamicBreachCards({ 
  data, 
  specialtyName 
}: { 
  data: BreachData; 
  specialtyName: string; 
}) {
  const breachMetrics = [
    {
      title: "52+ Week Breaches",
      value: data.week52Plus,
      description: "Critical breach threshold",
      color: "border-red-500 bg-red-50",
      textColor: "text-red-700",
      valueColor: "text-red-600"
    },
    {
      title: "65+ Week Breaches", 
      value: data.week65Plus,
      description: "Severe delay threshold",
      color: "border-orange-500 bg-orange-50",
      textColor: "text-orange-700", 
      valueColor: "text-orange-600"
    },
    {
      title: "78+ Week Breaches",
      value: data.week78Plus,
      description: "Extreme delay threshold", 
      color: "border-red-600 bg-red-100",
      textColor: "text-red-800",
      valueColor: "text-red-700"
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header showing which specialty is selected */}
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">Breach Analysis:</h3>
        <Badge variant="outline" className="text-sm">
          {specialtyName}
        </Badge>
        {specialtyName !== "All Specialties" && (
          <p className="text-sm text-slate-600 ml-2">
            Click different specialties below to update this analysis
          </p>
        )}
      </div>
      
      {/* Breach Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {breachMetrics.map((metric) => (
          <Card key={metric.title} className={metric.color}>
            <CardContent className="p-6">
              <div className="text-center">
                <h4 className={`text-sm font-medium ${metric.textColor} mb-2`}>
                  {metric.title}
                </h4>
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
    </div>
  );
}
```

### 6. Data Processing Functions

#### Specialty Data Extraction and Ranking
```typescript
// lib/specialty-data-processor.ts
export function getSpecialtiesData(trustData: NHSTrustData): SpecialtyData[] {
  const specialties = [
    { key: 'general_surgery', name: 'General Surgery', code: '100' },
    { key: 'urology', name: 'Urology', code: '101' },
    { key: 'trauma_orthopaedics', name: 'Trauma & Orthopaedics', code: '110' },
    { key: 'ent', name: 'ENT', code: '120' },
    { key: 'ophthalmology', name: 'Ophthalmology', code: '130' },
    { key: 'oral_surgery', name: 'Oral Surgery', code: '140' },
    { key: 'restorative_dentistry', name: 'Restorative Dentistry', code: '141' },
    { key: 'pediatric_surgery', name: 'Paediatric Surgery', code: '170' },
    { key: 'cardiothoracic_surgery', name: 'Cardiothoracic Surgery', code: '180' },
    { key: 'general_medicine', name: 'General Internal Medicine', code: '300' },
    { key: 'gastroenterology', name: 'Gastroenterology', code: '301' },
    { key: 'cardiology', name: 'Cardiology', code: '320' },
    { key: 'dermatology', name: 'Dermatology', code: '330' },
    { key: 'respiratory_medicine', name: 'Respiratory Medicine', code: '340' },
    { key: 'neurology', name: 'Neurology', code: '400' },
    { key: 'rheumatology', name: 'Rheumatology', code: '410' },
    { key: 'geriatric_medicine', name: 'Geriatric Medicine', code: '430' },
    { key: 'gynecology', name: 'Gynaecology', code: '500' },
    { key: 'other_surgery', name: 'Other Surgery', code: '800' },
    { key: 'medical_oncology', name: 'Medical Oncology', code: '370' }
  ];

  return specialties.map(specialty => {
    const percentage = trustData[`rtt_${specialty.key}_percent_within_18_weeks`] as number;
    const within18weeks = trustData[`rtt_${specialty.key}_total_within_18_weeks`] as number;
    const total = trustData[`rtt_${specialty.key}_total_incomplete_pathways`] as number;
    
    return {
      ...specialty,
      percentage: percentage || 0,
      within18weeks: within18weeks || 0,
      total: total || 0
    };
  }).filter(specialty => specialty.total > 0); // Only show specialties with data
}

export function getSpecialtyBreachData(trustData: NHSTrustData, specialtyKey: string): BreachData {
  if (specialtyKey === 'trust_total') {
    return {
      week52Plus: trustData.trust_total_total_52_plus_weeks || 0,
      week65Plus: trustData.trust_total_total_65_plus_weeks || 0,
      week78Plus: trustData.trust_total_total_78_plus_weeks || 0
    };
  }
  
  return {
    week52Plus: trustData[`rtt_${specialtyKey}_total_52_plus_weeks`] as number || 0,
    week65Plus: trustData[`rtt_${specialtyKey}_total_65_plus_weeks`] as number || 0,
    week78Plus: trustData[`rtt_${specialtyKey}_total_78_plus_weeks`] as number || 0
  };
}

export function getSpecialtyDisplayName(specialtyKey: string): string {
  if (specialtyKey === 'trust_total') return 'All Specialties';
  
  const specialtyMap = {
    'general_surgery': 'General Surgery',
    'urology': 'Urology',
    'trauma_orthopaedics': 'Trauma & Orthopaedics',
    // ... add all specialty mappings
  };
  
  return specialtyMap[specialtyKey] || specialtyKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
```

### 7. TypeScript Interfaces

#### Add New Type Definitions
```typescript
// types/nhs-data.ts
export interface SpecialtyData {
  key: string;
  name: string;
  code: string;
  percentage: number;
  within18weeks: number;
  total: number;
}

export interface BreachData {
  week52Plus: number;
  week65Plus: number;
  week78Plus: number;
}

export interface PerformanceLevel {
  label: 'Excellent' | 'Good' | 'Concern' | 'Critical';
  variant: 'default' | 'secondary' | 'destructive';
  color: string;
}
```

## Implementation Priority

### Phase 1: Core Structure (1-2 hours)
1. Update `app/dashboard/rtt-deep-dive/page.tsx` with tabbed interface
2. Create `RTTTrendsTab` component (duplicate current overview with median wait time)
3. Remove A&E card, add median wait time card

### Phase 2: Interactive Specialty Analysis (2-3 hours)
1. Create `SpecialtyAnalysisTab` component
2. Build `InteractiveSpecialtyCard` component with click handlers
3. Implement specialty ranking (worst first)
4. Add visual selection feedback

### Phase 3: Dynamic Breach Cards (1-2 hours)
1. Create `DynamicBreachCards` component
2. Implement specialty-specific breach data display
3. Add header showing selected specialty
4. Connect specialty selection to breach card updates

### Phase 4: Data Processing & Utils (1 hour)
1. Create specialty data extraction functions
2. Implement ranking logic
3. Add breach data getter functions
4. Test with different specialty selections

## Testing Checklist
- [ ] Tabbed interface switches correctly
- [ ] Performance Trends tab shows updated KPI cards (no A&E, includes median wait time)
- [ ] Specialty Analysis shows ranked specialties (worst first)
- [ ] Clicking specialty cards updates breach analysis
- [ ] Visual feedback shows selected specialty
- [ ] All data calculations are correct (handle percentage conversion)
- [ ] Responsive design works on mobile/tablet

## Files to Modify/Create

### Modify:
- `app/dashboard/rtt-deep-dive/page.tsx`

### Create:
- `components/dashboard/rtt-trends-tab.tsx`
- `components/dashboard/specialty-analysis-tab.tsx`
- `components/dashboard/interactive-specialty-card.tsx`
- `components/dashboard/dynamic-breach-cards.tsx`
- `lib/specialty-data-processor.ts`

### Update Types:
- `types/nhs-data.ts` (add SpecialtyData, BreachData interfaces)