# Asymmetrical Overview Layout Implementation Plan

## Overview
Redesign the Performance Overview page layout from a symmetrical 2x2 grid to an asymmetrical layout where three shorter charts occupy the left side (stacked vertically) while the Critical Issues panel takes the full height on the right side.

## Current vs. Desired Layout

### Current Layout (2x2 Grid)
```
┌─ RTT Performance ──────┬─ Critical Issues ──────┐
│ (Full height)          │ (Full height)          │
│                        │                        │
└────────────────────────┼────────────────────────┘
┌─ Average Wait Time ────┬─ Diagnostic Breakdown ─┐
│ (Full height)          │ (Full height)          │
│                        │                        │
└────────────────────────┴────────────────────────┘
```

### Desired Layout (Asymmetrical)
```
┌─ RTT Performance Trend ─────┬─────────────────────────────┐
│ (Shorter - ~250px height)   │                             │
├─────────────────────────────┤  Critical Issues Panel     │
│ Average Wait Time           │  (Full height - ~800px)    │
│ (Shorter - ~250px height)   │                             │
├─────────────────────────────┤                             │
│ Diagnostic Services         │                             │
│ Breakdown (Shorter height)  │                             │
└─────────────────────────────┴─────────────────────────────┘
```

## Implementation Plan

### Phase 1: Grid Layout Restructure (1-2 hours)

#### Task 1.1: Update Overview Page Grid Structure
```typescript
// app/dashboard/page.tsx
export default function OverviewPage() {
  const { getTrustData } = useNHSData();
  const [selectedTrust] = useTrustSelection();
  const trustData = getTrustData(selectedTrust);

  if (!trustData.length) {
    return <div className="p-6">Loading trust data...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* KPI Cards (unchanged) */}
      <OverviewKPICards trustData={trustData} />
      
      {/* New Asymmetrical Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[800px]">
        {/* LEFT COLUMN - TOP: RTT Performance Trend */}
        <Card className="lg:col-span-2 lg:row-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">RTT Performance Trend</CardTitle>
            <CardDescription className="text-sm">
              18-week compliance over time with 92% NHS standard
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[220px]"> {/* Fixed height for consistency */}
              <RTTPerformanceChart data={trustData} height={220} />
            </div>
          </CardContent>
        </Card>

        {/* RIGHT COLUMN: Critical Issues Panel (Full Height) */}
        <Card className="lg:col-span-1 lg:row-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Critical Issues Alert
            </CardTitle>
            <CardDescription className="text-sm">
              Performance areas requiring immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 h-[calc(100%-4rem)] overflow-auto">
            <CriticalIssuesPanel trustData={trustData} />
          </CardContent>
        </Card>

        {/* LEFT COLUMN - MIDDLE: Average Wait Time */}
        <Card className="lg:col-span-2 lg:row-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Average Wait Time</CardTitle>
            <CardDescription className="text-sm">
              Median waiting time in weeks with trend analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[220px]"> {/* Fixed height for consistency */}
              <AverageWaitChart data={trustData} height={220} />
            </div>
          </CardContent>
        </Card>

        {/* LEFT COLUMN - BOTTOM: Diagnostic Services Breakdown */}
        <Card className="lg:col-span-2 lg:row-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Diagnostic Services Breakdown</CardTitle>
            <CardDescription className="text-sm">
              6+ and 13+ week breach categories across diagnostic services
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[220px]"> {/* Fixed height for consistency */}
              <DiagnosticBreachBreakdownChart data={trustData} height={220} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

#### Task 1.2: Grid Layout CSS Classes
Add custom CSS classes for better control if needed:

```css
/* Add to globals.css if fine-tuning is needed */
.asymmetric-overview-grid {
  display: grid;
  gap: 1.5rem;
  min-height: 800px;
  grid-template-columns: 1fr;
}

@media (min-width: 1024px) {
  .asymmetric-overview-grid {
    grid-template-columns: 2fr 1fr;
    grid-template-rows: repeat(3, 1fr);
  }
}

.chart-container-short {
  height: 220px;
}

.critical-issues-full-height {
  height: calc(100% - 1rem);
  overflow-y: auto;
}
```

### Phase 2: Chart Components Height Management (1 hour)

#### Task 2.1: Update Chart Components with Height Props
```typescript
// components/charts/rtt-performance-chart.tsx
export function RTTPerformanceChart({ 
  data, 
  height = 300 
}: { 
  data: NHSTrustData[]; 
  height?: number; 
}) {
  // ... existing chart data processing

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        {/* ... existing chart components */}
      </LineChart>
    </ResponsiveContainer>
  );
}

// components/charts/average-wait-chart.tsx  
export function AverageWaitChart({ 
  data, 
  height = 300 
}: { 
  data: NHSTrustData[]; 
  height?: number; 
}) {
  // ... existing chart data processing

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        {/* ... existing chart components */}
      </LineChart>
    </ResponsiveContainer>
  );
}

// components/charts/diagnostic-breach-breakdown-chart.tsx
export function DiagnosticBreachBreakdownChart({ 
  data, 
  height = 300 
}: { 
  data: NHSTrustData[]; 
  height?: number; 
}) {
  // ... existing chart data processing

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        {/* ... existing chart components */}
      </BarChart>
    </ResponsiveContainer>
  );
}
```

#### Task 2.2: Update Chart Component Interfaces
```typescript
// types/chart-types.ts (create if doesn't exist)
export interface ChartProps {
  data: NHSTrustData[];
  height?: number;
  className?: string;
}

// Update all chart components to use this interface
export interface RTTPerformanceChartProps extends ChartProps {}
export interface AverageWaitChartProps extends ChartProps {}
export interface DiagnosticBreachChartProps extends ChartProps {}
```

### Phase 3: Critical Issues Panel Height Optimization (1 hour)

#### Task 3.1: Update Critical Issues Panel for Full Height
```typescript
// components/dashboard/critical-issues-panel.tsx
export function CriticalIssuesPanel({ trustData }: { trustData: NHSTrustData[] }) {
  const latestData = trustData[trustData.length - 1];
  
  const criticalIssues = useMemo(() => {
    return identifyAllCriticalIssues(latestData);
  }, [latestData]);

  return (
    <div className="h-full flex flex-col">
      {criticalIssues.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-8">
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-700 mb-2">
              All Systems Operating Well
            </h3>
            <p className="text-sm text-slate-600">
              No critical performance issues identified
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto flex-1">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-slate-800">
              {criticalIssues.length} Critical Issue{criticalIssues.length !== 1 ? 's' : ''} Identified
            </h4>
            <Badge variant="destructive" className="text-xs">
              Action Required
            </Badge>
          </div>
          
          {criticalIssues.map((issue, index) => (
            <CriticalIssueCard key={index} issue={issue} />
          ))}
          
          {/* Spacer to prevent content from being cut off */}
          <div className="h-4" />
        </div>
      )}
    </div>
  );
}
```

#### Task 3.2: Update Critical Issue Cards for Compact Display
```typescript
// components/dashboard/critical-issue-card.tsx
function CriticalIssueCard({ issue }: { issue: CriticalIssue }) {
  const severityConfig = {
    Critical: { 
      bg: 'bg-red-50', 
      border: 'border-red-200', 
      text: 'text-red-700', 
      badge: 'destructive',
      icon: 'text-red-600'
    },
    High: { 
      bg: 'bg-orange-50', 
      border: 'border-orange-200', 
      text: 'text-orange-700', 
      badge: 'secondary',
      icon: 'text-orange-600'
    },
    Moderate: { 
      bg: 'bg-yellow-50', 
      border: 'border-yellow-200', 
      text: 'text-yellow-700', 
      badge: 'outline',
      icon: 'text-yellow-600'
    }
  };

  const config = severityConfig[issue.severity];

  return (
    <div className={`p-3 rounded-lg border ${config.bg} ${config.border} transition-all hover:shadow-sm`}>
      <div className="flex items-start gap-3">
        <issue.icon className={`h-4 w-4 mt-1 flex-shrink-0 ${config.icon}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h5 className={`font-semibold text-sm ${config.text}`}>
              {issue.title}
            </h5>
            <Badge variant={config.badge as any} className="text-xs">
              {issue.severity}
            </Badge>
          </div>
          <p className="text-xs text-slate-600 mb-2 leading-relaxed">
            {issue.description}
          </p>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">
              {issue.metric}: {
                typeof issue.value === 'number' 
                  ? issue.value % 1 === 0 
                    ? issue.value.toLocaleString()
                    : issue.value.toFixed(1)
                  : issue.value
              }{issue.metric.includes('Rate') || issue.metric.includes('Performance') ? '%' : ''}
            </span>
            {issue.target && (
              <span className="text-slate-500">
                Target: {issue.target}{issue.metric.includes('Rate') || issue.metric.includes('Performance') ? '%' : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Phase 4: Responsive Design Enhancements (1 hour)

#### Task 4.1: Mobile Layout Handling
```typescript
// Update the grid with better mobile responsiveness
<div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:min-h-[800px]">
  {/* Mobile: Stack all charts vertically */}
  {/* Desktop: Use asymmetrical layout */}
</div>
```

#### Task 4.2: Breakpoint Considerations
```css
/* Custom responsive adjustments if needed */
@media (max-width: 1023px) {
  .asymmetric-overview-grid .chart-container-short {
    height: 300px; /* Taller on mobile for better visibility */
  }
}

@media (min-width: 1024px) and (max-width: 1279px) {
  .asymmetric-overview-grid {
    min-height: 700px; /* Slightly shorter on smaller desktop screens */
  }
  
  .chart-container-short {
    height: 200px; /* Slightly shorter charts */
  }
}

@media (min-width: 1280px) {
  .asymmetric-overview-grid {
    min-height: 850px; /* Taller on larger screens */
  }
  
  .chart-container-short {
    height: 240px; /* Slightly taller charts */
  }
}
```

### Phase 5: Testing and Refinement (1 hour)

#### Task 5.1: Visual Consistency Testing
- [ ] Verify all left-column charts have consistent height (220px)
- [ ] Ensure Critical Issues panel uses full right-column height
- [ ] Check that card padding and margins are consistent
- [ ] Validate responsive behavior on different screen sizes

#### Task 5.2: Content Overflow Testing
- [ ] Test Critical Issues panel with many issues (scrolling)
- [ ] Test Critical Issues panel with no issues (centered content)
- [ ] Verify chart content fits properly in reduced height containers
- [ ] Check that chart legends and labels remain readable

#### Task 5.3: Performance Testing
- [ ] Ensure layout doesn't cause performance issues
- [ ] Verify smooth scrolling in Critical Issues panel
- [ ] Test chart rendering performance with reduced heights

## File Structure Updates

### Files to Modify
```
app/dashboard/page.tsx (main overview page layout)
components/charts/rtt-performance-chart.tsx (add height prop)
components/charts/average-wait-chart.tsx (add height prop)
components/charts/diagnostic-breach-breakdown-chart.tsx (add height prop)
components/dashboard/critical-issues-panel.tsx (full height optimization)
components/dashboard/critical-issue-card.tsx (compact display)
```

### Files to Create (if needed)
```
types/chart-types.ts (chart component interfaces)
styles/overview-layout.css (custom grid styles if needed)
```

### CSS Classes to Add
```css
/* Add to globals.css or component-specific CSS */
.asymmetric-overview-grid {
  /* Grid layout styles */
}

.chart-container-short {
  height: 220px;
}

.critical-issues-full-height {
  height: calc(100% - 1rem);
  overflow-y: auto;
}
```

## Implementation Priority

### High Priority (Essential)
1. **Grid Layout Update** - Convert from 2x2 to asymmetrical 3-column layout
2. **Chart Height Props** - Add height parameters to all chart components
3. **Critical Issues Panel** - Optimize for full-height display

### Medium Priority (Important)
1. **Responsive Design** - Ensure mobile compatibility
2. **Visual Polish** - Consistent padding, margins, typography
3. **Performance** - Smooth scrolling and rendering

### Low Priority (Nice to Have)
1. **Custom CSS Classes** - Additional styling control
2. **Animation** - Smooth transitions between layouts
3. **Advanced Responsive** - Fine-tuned breakpoints

## Success Criteria
- [ ] Left column contains 3 charts stacked vertically with consistent ~220px height
- [ ] Right column Critical Issues panel spans full height (~800px)
- [ ] Layout is responsive and works well on mobile devices
- [ ] All chart content remains readable and functional at reduced heights
- [ ] Critical Issues panel scrolls smoothly when content overflows
- [ ] Overall visual balance is improved over current symmetric layout
- [ ] Page performance remains optimal
- [ ] Design maintains professional appearance suitable for NHS analytics

## Testing Checklist
- [ ] Desktop layout (1280px+) displays asymmetrical grid correctly
- [ ] Laptop layout (1024-1279px) maintains readability
- [ ] Tablet layout (768-1023px) stacks appropriately
- [ ] Mobile layout (< 768px) provides good user experience
- [ ] Critical Issues panel handles 0, few, and many issues gracefully
- [ ] Chart animations and interactions work properly at reduced heights
- [ ] Text and labels remain readable across all breakpoints
- [ ] Print layout is acceptable (if print functionality needed)