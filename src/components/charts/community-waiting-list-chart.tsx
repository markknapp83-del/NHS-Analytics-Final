'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrustMetrics } from '@/types/database';

interface CommunityWaitingListChartProps {
  data: TrustMetrics[];
  selectedService?: string;
  selectedCategory?: string;
}

// Service name display mapping for title
const SERVICE_DISPLAY_NAMES: Record<string, string> = {
  'msk_service': 'MSK Services',
  'podiatry': 'Podiatry',
  'therapy_physiotherapy': 'Physiotherapy',
  'audiology': 'Audiology',
  'community_nursing': 'Community Nursing',
  'therapy_ot': 'Occupational Therapy',
  'therapy_speech_language': 'Speech & Language',
  'therapy_dietetics': 'Dietetics',
  'therapy_orthotics': 'Orthotics',
  'intermediate_care_reablement': 'Intermediate Care',
  'urgent_community_response': 'Urgent Response',
  'rapid_response': 'Rapid Response',
  'home_oxygen': 'Home Oxygen',
  'rehab_bed_based': 'Bed-based Rehab',
  'rehab_integrated': 'Integrated Rehab',
  'neurorehabilitation': 'Neuro Rehab',
  'weight_management': 'Weight Management',
  'wheelchair_equipment': 'Wheelchair & Equipment',
  'clinical_support_social_care': 'Clinical Support',
  'ltc_continence': 'Continence Services',
  'ltc_diabetes': 'Diabetes Care',
  'ltc_falls': 'Falls Prevention',
  'ltc_heart_failure': 'Heart Failure',
  'ltc_lymphoedema': 'Lymphoedema',
  'ltc_mnd': 'Motor Neurone Disease',
  'ltc_ms': 'Multiple Sclerosis',
  'ltc_respiratory': 'Respiratory Care',
  'ltc_stroke': 'Stroke Care',
  'ltc_support': 'LTC Support',
  'ltc_tb': 'TB Services',
  'ltc_tissue_viability': 'Tissue Viability',
  'community_paediatrics': 'Community Paediatrics',
  'antenatal_screening': 'Antenatal Screening',
  'newborn_hearing': 'Newborn Hearing',
  'vision_screening': 'Vision Screening'
};

export function CommunityWaitingListChart({ data, selectedService = 'all', selectedCategory = 'all' }: CommunityWaitingListChartProps) {
  const chartData = data
    .filter(record => record.community_health_data)
    .map(record => {
      const communityData = record.community_health_data!;

      let totalWaiting: number;

      if (selectedService === 'all') {
        if (selectedCategory === 'all') {
          totalWaiting = communityData.metadata.total_waiting_all_services;
        } else if (selectedCategory === 'adult_services') {
          // Sum all adult services
          totalWaiting = Object.values(communityData.adult_services || {}).reduce((sum, service) =>
            sum + (service?.total_waiting || 0), 0);
        } else if (selectedCategory === 'cyp_services') {
          // Sum all CYP services
          totalWaiting = Object.values(communityData.cyp_services || {}).reduce((sum, service) =>
            sum + (service?.total_waiting || 0), 0);
        } else {
          totalWaiting = communityData.metadata.total_waiting_all_services;
        }
      } else {
        // Get specific service data
        const adultService = communityData.adult_services?.[selectedService];
        const cypService = communityData.cyp_services?.[selectedService];
        totalWaiting = adultService?.total_waiting || cypService?.total_waiting || 0;
      }

      return {
        period: new Date(record.period).toLocaleDateString('en-GB', {
          month: 'short',
          year: '2-digit'
        }),
        totalWaiting,
        fullDate: record.period
      };
    })
    .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Community Services Total Waiting List
          </CardTitle>
          <CardDescription>Combined patient volumes over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-slate-500">
            No community health data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  const maxValue = Math.max(...chartData.map(d => d.totalWaiting));
  const minValue = Math.min(...chartData.map(d => d.totalWaiting));

  // Get display title and description
  const serviceDisplayName = selectedService !== 'all' ? SERVICE_DISPLAY_NAMES[selectedService] || selectedService : null;
  const getCategoryDisplayName = (category: string) => {
    if (category === 'adult_services') return 'Adult Services';
    if (category === 'cyp_services') return 'Children & Young People';
    return 'All Services';
  };

  const categoryDisplayName = getCategoryDisplayName(selectedCategory);

  const chartTitle = selectedService === 'all'
    ? selectedCategory === 'all'
      ? 'Community Services Waiting List'
      : `${categoryDisplayName} Waiting List`
    : `${serviceDisplayName} Waiting List`;

  const chartDescription = selectedService === 'all'
    ? selectedCategory === 'all'
      ? `Combined patient volumes over ${chartData.length} months`
      : `${categoryDisplayName} patient volumes over ${chartData.length} months`
    : `${serviceDisplayName} patient volumes over ${chartData.length} months`;

  return (
    <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-slate-900">
          {chartTitle}
        </CardTitle>
        <CardDescription className="text-sm text-slate-600">
          {chartDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="totalWaitingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 12 }}
                stroke="#64748b"
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#64748b"
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={{ stroke: '#e2e8f0' }}
                tickFormatter={formatNumber}
                domain={['dataMin - 500', 'dataMax + 500']}
              />
              <Tooltip
                formatter={(value: number) => [
                  value.toLocaleString() + ' patients',
                  'Total Waiting'
                ]}
                labelFormatter={(label) => `Period: ${label}`}
                labelStyle={{ color: '#334155', fontWeight: 500 }}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Area
                type="monotone"
                dataKey="totalWaiting"
                stroke="hsl(217, 91%, 60%)"
                strokeWidth={2}
                fill="url(#totalWaitingGradient)"
                dot={{ fill: 'hsl(217, 91%, 60%)', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: 'hsl(217, 91%, 60%)', stroke: 'white', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* Summary Statistics */}
        <div className="flex justify-between mt-4 pt-4 border-t border-slate-200 text-sm">
          <div className="text-center">
            <p className="text-slate-600">Current</p>
            <p className="font-semibold text-slate-900">{chartData[chartData.length - 1]?.totalWaiting.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-600">Peak</p>
            <p className="font-semibold text-red-600">{maxValue.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-600">Lowest</p>
            <p className="font-semibold text-green-600">{minValue.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-600">Trend</p>
            <p className={`font-semibold ${chartData.length >= 2 && chartData[chartData.length - 1].totalWaiting > chartData[0].totalWaiting ? 'text-red-600' : 'text-green-600'}`}>
              {chartData.length >= 2
                ? (chartData[chartData.length - 1].totalWaiting > chartData[0].totalWaiting ? '↗ Rising' : '↘ Falling')
                : '— Stable'
              }
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}