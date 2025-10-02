'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { getProcurementTimeline, ProcurementTimelineItem } from '@/lib/queries/tender-queries';
import { AlertTriangle } from 'lucide-react';

interface ProcurementTimelineProps {
  trustCode: string;
  dateRange: { start: string; end: string };
}

interface ChartDataPoint {
  x: number;
  y: number;
  value: number | null;
  classification: string | null;
  isFramework: boolean | null;
  tender: ProcurementTimelineItem;
}

export function ProcurementTimeline({ trustCode, dateRange }: ProcurementTimelineProps) {
  const { data: tenders, isLoading, error } = useQuery({
    queryKey: ['procurement-timeline', trustCode, dateRange],
    queryFn: () => getProcurementTimeline(trustCode, dateRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) return <ProcurementTimelineSkeleton />;
  if (error) return <ProcurementTimelineError />;

  // Transform data for scatter chart with stacking for same-day tenders
  const chartData: ChartDataPoint[] = [];
  const dateCountMap = new Map<string, number>();

  tenders?.forEach(tender => {
    const date = new Date(tender.published_date).toDateString();
    const count = dateCountMap.get(date) || 0;
    dateCountMap.set(date, count + 1);

    chartData.push({
      x: new Date(tender.published_date).getTime(),
      y: 1 + (count * 0.15), // Stack vertically with offset
      value: tender.value,
      classification: tender.classification,
      isFramework: tender.is_framework,
      tender
    });
  });

  if (chartData.length === 0) {
    return <EmptyTimelineState />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Procurement Activity Timeline</CardTitle>
        <CardDescription>
          Tender publications and awards over time ({chartData.length} tenders)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <XAxis
              type="number"
              dataKey="x"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(tick) => {
                const date = new Date(tick);
                return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
              }}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              type="number"
              domain={[0, 3]}
              hide
            />
            <Tooltip content={<ProcurementTooltip />} />
            <Scatter
              data={chartData}
              shape={<CustomDot />}
            />
          </ScatterChart>
        </ResponsiveContainer>

        {/* Legend */}
        <TimelineLegend />
      </CardContent>
    </Card>
  );
}

function CustomDot(props: any) {
  const { cx, cy, payload } = props;

  if (!payload) return null;

  const size = getDotSize(payload.value);
  const color = getDotColor(payload.classification, payload.isFramework);

  return (
    <circle
      cx={cx}
      cy={cy}
      r={size}
      fill={color}
      stroke="white"
      strokeWidth={2}
      className="cursor-pointer transition-all duration-200 hover:stroke-4"
      style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
    />
  );
}

function ProcurementTooltip({ active, payload }: any) {
  if (!active || !payload || !payload[0]) return null;

  const data = payload[0].payload;
  const tender = data.tender;

  const formatValue = (value: number | null) => {
    if (value === null || value === 0) return 'Not specified';
    if (value >= 1000000) return `£${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `£${(value / 1000).toFixed(0)}K`;
    return `£${value.toFixed(0)}`;
  };

  return (
    <div className="bg-white border-2 border-slate-200 rounded-lg shadow-lg p-4 max-w-sm">
      <h4 className="font-semibold text-sm text-slate-900 mb-2 line-clamp-2">
        {tender.title}
      </h4>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-slate-600">Value:</span>
          <span className="font-medium text-slate-900">{formatValue(tender.value)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-600">Status:</span>
          <span className="font-medium text-slate-900 capitalize">{tender.status}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-600">Published:</span>
          <span className="font-medium text-slate-900">
            {new Date(tender.published_date).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </span>
        </div>
        {tender.classification && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-600">Type:</span>
            <span className="font-medium text-slate-900 capitalize">
              {tender.classification === 'insourcing_opportunity' ? 'Insourcing Opportunity' : tender.classification}
            </span>
          </div>
        )}
      </div>
      <div className="mt-2 pt-2 border-t border-slate-100">
        <span className="text-xs text-blue-600 font-medium">Click to view details</span>
      </div>
    </div>
  );
}

function TimelineLegend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 mt-4 pt-4 border-t border-slate-100">
      {/* Color Legend */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#3b82f6] border-2 border-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
          <span className="text-xs text-slate-600">General</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#10b981] border-2 border-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
          <span className="text-xs text-slate-600">Insourcing</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#f59e0b] border-2 border-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
          <span className="text-xs text-slate-600">Framework</span>
        </div>
      </div>

      {/* Size Legend */}
      <div className="flex items-center gap-4 pl-4 border-l border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-slate-400" />
          <span className="text-xs text-slate-600">&lt; £500K</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
          <span className="text-xs text-slate-600">£500K-£2M</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-slate-400" />
          <span className="text-xs text-slate-600">&gt; £2M</span>
        </div>
      </div>
    </div>
  );
}

function getDotSize(value: number | null): number {
  if (!value || value < 500000) return 6;
  if (value < 2000000) return 10;
  return 14;
}

function getDotColor(classification: string | null, isFramework: boolean | null): string {
  if (classification === 'insourcing_opportunity') return '#10b981'; // Green
  if (isFramework) return '#f59e0b'; // Yellow/Amber
  return '#3b82f6'; // Blue
}

export function ProcurementTimelineSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-4 w-48 mt-2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[200px] w-full" />
        <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-slate-100">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

function ProcurementTimelineError() {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-red-600" />
          <CardTitle className="text-red-900">Error Loading Timeline</CardTitle>
        </div>
        <CardDescription className="text-red-700">
          Failed to load procurement timeline data. Please try again later.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function EmptyTimelineState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Procurement Activity Timeline</CardTitle>
        <CardDescription>No procurement data available for this period</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] flex items-center justify-center text-slate-500">
          <div className="text-center">
            <p className="text-sm mb-2">No tenders found for this trust in the selected date range</p>
            <p className="text-xs text-slate-400">Try selecting a different time period or trust</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
