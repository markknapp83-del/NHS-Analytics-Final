import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTrustMetrics } from '@/hooks/useNHSData';
import { useTrustSelection } from '@/hooks/use-trust-selection';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { RTTPerformanceChart } from '@/components/charts/rtt-performance-chart';
import { WaitingListChart } from '@/components/charts/waiting-list-chart';
import { AverageWaitChart } from '@/components/charts/average-wait-chart';
import { BreachBreakdownChart } from '@/components/charts/breach-breakdown-chart';

interface RTTTrendsTabProps {
  selectedSpecialty?: string;
  filteredData?: any[];
}

export function RTTTrendsTab({ selectedSpecialty = 'trust_total', filteredData }: RTTTrendsTabProps) {
  const [selectedTrust] = useTrustSelection();
  const { metrics: rawTrustData } = useTrustMetrics(selectedTrust);

  // Use filtered data if provided, otherwise use all trust data
  const trustData = filteredData || rawTrustData;

  if (!trustData.length) {
    return <div>Loading trust data...</div>;
  }

  // Helper function to get value from nested structure
  const getValue = (record: any, field: string) => {
    if (selectedSpecialty === 'trust_total') {
      return record?.rtt_data?.trust_total?.[field];
    } else {
      return record?.rtt_data?.specialties?.[selectedSpecialty]?.[field];
    }
  };

  // Find the latest record that has complete data
  const latestDataComplete = [...trustData].reverse().find(record =>
    getValue(record, 'percent_within_18_weeks') !== null &&
    getValue(record, 'percent_within_18_weeks') !== undefined
  );

  const latestData = latestDataComplete || trustData[trustData.length - 1];

  // Find previous record with complete data for trend calculation
  const previousDataComplete = [...trustData].reverse().slice(1).find(record =>
    getValue(record, 'percent_within_18_weeks') !== null &&
    getValue(record, 'percent_within_18_weeks') !== undefined
  );

  const previousData = previousDataComplete;

  const calculateTrend = (current: number, previous: number) => {
    if (previous === null || previous === undefined) return { change: 0, direction: 'neutral' as const };
    const change = ((current - previous) / previous) * 100;
    return {
      change: Math.abs(change),
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral' as const
    };
  };

  const getPerformanceColor = (value: number, target: number, inverse = false) => {
    const ratio = value / target;
    if (inverse) {
      return ratio <= 1 ? 'text-green-600' : ratio <= 1.5 ? 'text-yellow-600' : 'text-red-600';
    }
    return ratio >= 1 ? 'text-green-600' : ratio >= 0.8 ? 'text-yellow-600' : 'text-red-600';
  };

  const TrendIcon = ({ direction }: { direction: 'up' | 'down' | 'neutral' }) => {
    switch (direction) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4 text-slate-400" />;
    }
  };

  // Updated KPI cards with median wait time instead of A&E
  const kpiCards = [
    {
      title: 'RTT 18-week Compliance',
      value: getValue(latestData, 'percent_within_18_weeks'),
      previousValue: getValue(previousData, 'percent_within_18_weeks'),
      target: 92,
      format: 'percentage',
      description: 'Target: 92%',
      inverse: false
    },
    {
      title: '52+ Week Waiters',
      value: getValue(latestData, 'total_52_plus_weeks'),
      previousValue: getValue(previousData, 'total_52_plus_weeks'),
      target: 0,
      format: 'number',
      description: 'Should be zero',
      inverse: true
    },
    {
      title: 'Total Waiting List',
      value: getValue(latestData, 'total_incomplete_pathways'),
      previousValue: getValue(previousData, 'total_incomplete_pathways'),
      format: 'number',
      description: 'All incomplete RTT pathways'
    },
    {
      title: 'Median Wait Time',
      value: getValue(latestData, 'median_wait_weeks'),
      previousValue: getValue(previousData, 'median_wait_weeks'),
      format: 'weeks',
      description: 'Median waiting time in weeks',
      target: 9
    }
  ];

  return (
    <div className="space-y-4">
      {/* Updated KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => {
          const trend = kpi.previousValue ? calculateTrend(kpi.value, kpi.previousValue) : null;
          const performanceColor = kpi.target ?
            getPerformanceColor(kpi.value, kpi.target, kpi.inverse) :
            'text-slate-900';

          return (
            <Card key={kpi.title}>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-600">{kpi.title}</p>
                  <div className="flex items-baseline gap-2">
                    <p className={`text-2xl font-bold ${performanceColor}`}>
                      {kpi.value === null || kpi.value === undefined
                        ? 'N/A'
                        : kpi.format === 'percentage'
                        ? `${kpi.value?.toFixed(1)}%`
                        : kpi.format === 'weeks'
                        ? `${kpi.value?.toFixed(1)} weeks`
                        : kpi.value?.toLocaleString() || '0'
                      }
                    </p>
                    {trend && (
                      <div className="flex items-center gap-1">
                        <TrendIcon direction={trend.direction as 'up' | 'down' | 'neutral'} />
                        <span className="text-sm text-slate-600">
                          {trend.change.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{kpi.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 2x2 Chart Grid - Same as current overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Performance vs 92% Target</CardTitle>
            <CardDescription>RTT 18-week compliance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <RTTPerformanceChart data={trustData} selectedSpecialty={selectedSpecialty} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Patients Awaiting Treatment</CardTitle>
            <CardDescription>Total incomplete pathways by month</CardDescription>
          </CardHeader>
          <CardContent>
            <WaitingListChart data={trustData} selectedSpecialty={selectedSpecialty} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Wait Time</CardTitle>
            <CardDescription>Mean waiting time with trend analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <AverageWaitChart data={trustData} selectedSpecialty={selectedSpecialty} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>52/65/78 Week Breakdown</CardTitle>
            <CardDescription>Long wait breach categories over time</CardDescription>
          </CardHeader>
          <CardContent>
            <BreachBreakdownChart data={trustData} selectedSpecialty={selectedSpecialty} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}