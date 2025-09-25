'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTrustMetrics } from '@/hooks/useNHSData';
import { useTrustSelection } from '@/hooks/use-trust-selection';
import { extractDiagnosticData } from '@/lib/diagnostic-data-processor';
import { rankDiagnosticsByOpportunity } from '@/lib/diagnostic-intelligence';
import { EnhancedDiagnosticCard } from '@/components/dashboard/enhanced-diagnostic-card';
import { DiagnosticBreachChart } from '@/components/charts/diagnostic-breach-chart';
import { DiagnosticScatterChart } from '@/components/charts/diagnostic-scatter-chart';
import { EnhancedKPICard } from '@/components/dashboard/enhanced-kpi-card';
import { calculateTrend, findPreviousMonthData } from '@/lib/trend-calculator';
import { Users, Clock, AlertTriangle, TrendingUp } from 'lucide-react';

export default function DiagnosticsPage() {
  const [selectedTrust] = useTrustSelection();
  const { metrics: trustData, isLoading } = useTrustMetrics(selectedTrust);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const diagnosticServices = useMemo(() => {
    if (!trustData.length) return [];
    const latestData = trustData[trustData.length - 1];
    const services = extractDiagnosticData(latestData);
    return rankDiagnosticsByOpportunity(services);
  }, [trustData]);

  const previousMonthData = useMemo(() => {
    return findPreviousMonthData(trustData);
  }, [trustData]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!trustData.length) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No Diagnostic Data Available</h3>
          <p className="text-slate-600">
            No diagnostic performance data found for the selected trust.
          </p>
        </div>
      </div>
    );
  }

  const latestData = trustData[trustData.length - 1];

  // Get selected service data or aggregate data
  const selectedServiceData = selectedService
    ? diagnosticServices.find(s => s.type === selectedService)
    : null;

  const displayData = selectedServiceData ? {
    totalWaiting: selectedServiceData.totalWaiting,
    sixWeekBreaches: selectedServiceData.sixWeekBreaches,
    thirteenWeekBreaches: selectedServiceData.thirteenWeekBreaches,
    breachRate: selectedServiceData.breachRate,
    name: selectedServiceData.name
  } : {
    totalWaiting: diagnosticServices.reduce((sum, s) => sum + s.totalWaiting, 0),
    sixWeekBreaches: diagnosticServices.reduce((sum, s) => sum + s.sixWeekBreaches, 0),
    thirteenWeekBreaches: diagnosticServices.reduce((sum, s) => sum + s.thirteenWeekBreaches, 0),
    breachRate: diagnosticServices.length > 0 ?
      ((diagnosticServices.reduce((sum, s) => sum + s.sixWeekBreaches, 0) /
        diagnosticServices.reduce((sum, s) => sum + s.totalWaiting, 0)) * 100)
      : 0,
    name: 'All Services'
  };

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
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            Latest Data: {new Date(latestData.period).toLocaleDateString('en-GB', {
              month: 'long',
              year: 'numeric'
            })}
          </Badge>
          <Badge variant="secondary" className="text-sm">
            {diagnosticServices.length} services monitored
          </Badge>
        </div>
      </div>

      {/* Analysis Charts */}
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

      {/* Dynamic KPI Cards */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Performance Summary:</h3>
          <Badge variant="outline" className="text-sm">
            {displayData.name}
          </Badge>
          {selectedService && (
            <button
              onClick={() => setSelectedService(null)}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              View All Services
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <EnhancedKPICard
            title="Total Patients Waiting"
            value={displayData.totalWaiting}
            previousValue={previousMonthData ?
              selectedServiceData ?
                extractDiagnosticData(previousMonthData).find(s => s.type === selectedService)?.totalWaiting :
                extractDiagnosticData(previousMonthData).reduce((sum, s) => sum + s.totalWaiting, 0)
              : undefined
            }
            symbol={Users}
            format="number"
            description="Patients awaiting diagnostics"
            trend={previousMonthData ? calculateTrend(
              displayData.totalWaiting,
              selectedServiceData ?
                extractDiagnosticData(previousMonthData).find(s => s.type === selectedService)?.totalWaiting || 0 :
                extractDiagnosticData(previousMonthData).reduce((sum, s) => sum + s.totalWaiting, 0),
              false
            ) : undefined}
          />

          <EnhancedKPICard
            title="6+ Week Breaches"
            value={displayData.sixWeekBreaches}
            previousValue={previousMonthData ?
              selectedServiceData ?
                extractDiagnosticData(previousMonthData).find(s => s.type === selectedService)?.sixWeekBreaches :
                extractDiagnosticData(previousMonthData).reduce((sum, s) => sum + s.sixWeekBreaches, 0)
              : undefined
            }
            symbol={Clock}
            format="number"
            description="Patients waiting 6+ weeks"
            trend={previousMonthData ? calculateTrend(
              displayData.sixWeekBreaches,
              selectedServiceData ?
                extractDiagnosticData(previousMonthData).find(s => s.type === selectedService)?.sixWeekBreaches || 0 :
                extractDiagnosticData(previousMonthData).reduce((sum, s) => sum + s.sixWeekBreaches, 0),
              false
            ) : undefined}
          />

          <EnhancedKPICard
            title="13+ Week Breaches"
            value={displayData.thirteenWeekBreaches}
            previousValue={previousMonthData ?
              selectedServiceData ?
                extractDiagnosticData(previousMonthData).find(s => s.type === selectedService)?.thirteenWeekBreaches :
                extractDiagnosticData(previousMonthData).reduce((sum, s) => sum + s.thirteenWeekBreaches, 0)
              : undefined
            }
            symbol={AlertTriangle}
            format="number"
            description="Patients waiting 13+ weeks"
            trend={previousMonthData ? calculateTrend(
              displayData.thirteenWeekBreaches,
              selectedServiceData ?
                extractDiagnosticData(previousMonthData).find(s => s.type === selectedService)?.thirteenWeekBreaches || 0 :
                extractDiagnosticData(previousMonthData).reduce((sum, s) => sum + s.thirteenWeekBreaches, 0),
              false
            ) : undefined}
          />

          <EnhancedKPICard
            title="Overall Breach Rate"
            value={displayData.breachRate}
            previousValue={previousMonthData ?
              selectedServiceData ?
                extractDiagnosticData(previousMonthData).find(s => s.type === selectedService)?.breachRate :
                ((extractDiagnosticData(previousMonthData).reduce((sum, s) => sum + s.sixWeekBreaches, 0) /
                  extractDiagnosticData(previousMonthData).reduce((sum, s) => sum + s.totalWaiting, 0)) * 100)
              : undefined
            }
            symbol={TrendingUp}
            format="percentage"
            target={1}
            description="6+ week breach rate"
            trend={previousMonthData ? calculateTrend(
              displayData.breachRate,
              selectedServiceData ?
                extractDiagnosticData(previousMonthData).find(s => s.type === selectedService)?.breachRate || 0 :
                ((extractDiagnosticData(previousMonthData).reduce((sum, s) => sum + s.sixWeekBreaches, 0) /
                  extractDiagnosticData(previousMonthData).reduce((sum, s) => sum + s.totalWaiting, 0)) * 100),
              false
            ) : undefined}
          />
        </div>
      </div>

      {/* Enhanced Diagnostic Services */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Diagnostic Service Analysis</h3>
          <Badge variant="secondary" className="text-xs">
            Ranked by insourcing opportunity
          </Badge>
          <p className="text-sm text-slate-600">
            Click any service to view detailed metrics
          </p>
        </div>

        <div className="space-y-3">
          {diagnosticServices.map((service) => (
            <div
              key={service.type}
              onClick={() => setSelectedService(service.type)}
              className="cursor-pointer"
            >
              <EnhancedDiagnosticCard
                service={service}
                data={service}
                isSelected={selectedService === service.type}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}