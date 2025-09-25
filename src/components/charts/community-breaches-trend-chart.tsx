'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrustMetrics } from '@/types/database';

interface CommunityBreachesTrendChartProps {
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

export function CommunityBreachesTrendChart({ data, selectedService = 'all', selectedCategory = 'all' }: CommunityBreachesTrendChartProps) {
  const chartData = data
    .filter(record => record.community_health_data)
    .map(record => {
      const communityData = record.community_health_data!;

      let servicesWithBreaches: number;
      let totalServices: number;

      if (selectedService === 'all') {
        if (selectedCategory === 'all') {
          servicesWithBreaches = communityData.metadata.services_with_52plus_breaches;
          totalServices = communityData.metadata.services_reported;
        } else if (selectedCategory === 'adult_services') {
          // Count adult services with breaches
          servicesWithBreaches = Object.values(communityData.adult_services || {}).filter(service =>
            service && service.wait_52_plus_weeks > 0
          ).length;
          totalServices = Object.keys(communityData.adult_services || {}).length;
        } else if (selectedCategory === 'cyp_services') {
          // Count CYP services with breaches
          servicesWithBreaches = Object.values(communityData.cyp_services || {}).filter(service =>
            service && service.wait_52_plus_weeks > 0
          ).length;
          totalServices = Object.keys(communityData.cyp_services || {}).length;
        } else {
          servicesWithBreaches = communityData.metadata.services_with_52plus_breaches;
          totalServices = communityData.metadata.services_reported;
        }
      } else {
        // For individual service, show the actual 52+ week breach count
        const adultService = communityData.adult_services?.[selectedService];
        const cypService = communityData.cyp_services?.[selectedService];
        const selectedServiceData = adultService || cypService;

        servicesWithBreaches = selectedServiceData?.wait_52_plus_weeks || 0;
        totalServices = 1; // Single service
      }

      return {
        period: new Date(record.period).toLocaleDateString('en-GB', {
          month: 'short',
          year: '2-digit'
        }),
        servicesWithBreaches,
        totalServices,
        fullDate: record.period
      };
    })
    .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
{selectedCategory === 'all'
              ? 'Services with 52+ Week Breaches'
              : selectedCategory === 'adult_services'
              ? 'Adult Services with 52+ Week Breaches'
              : 'Children & Young People Services with 52+ Week Breaches'}
          </CardTitle>
          <CardDescription>Count of services exceeding 52-week threshold over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-slate-500">
            No community health data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxBreaches = Math.max(...chartData.map(d => d.servicesWithBreaches));
  const latestData = chartData[chartData.length - 1];
  const previousData = chartData[chartData.length - 2];

  const trend = latestData && previousData
    ? latestData.servicesWithBreaches - previousData.servicesWithBreaches
    : 0;

  const formatTooltip = (value: number, name: string, props: any) => {
    if (selectedService === 'all') {
      const totalServices = props.payload.totalServices;
      const percentage = totalServices > 0 ? (value / totalServices * 100).toFixed(1) : '0';
      return [
        `${value} services (${percentage}% of ${totalServices} reporting)`,
        'Services with 52+ Week Breaches'
      ];
    } else {
      return [
        `${value} patients waiting 52+ weeks`,
        `${SERVICE_DISPLAY_NAMES[selectedService]} 52+ Week Waiters`
      ];
    }
  };

  // Calculate breach-free periods
  const breachFreeCount = chartData.filter(d => d.servicesWithBreaches === 0).length;
  const totalPeriods = chartData.length;

  // Get display title and description
  const serviceDisplayName = selectedService !== 'all' ? SERVICE_DISPLAY_NAMES[selectedService] || selectedService : null;
  const getCategoryDisplayName = (category: string) => {
    if (category === 'adult_services') return 'Adult Services';
    if (category === 'cyp_services') return 'Children & Young People Services';
    return 'Services';
  };

  const categoryDisplayName = getCategoryDisplayName(selectedCategory);

  const chartTitle = selectedService === 'all'
    ? selectedCategory === 'all'
      ? 'Services with 52+ Week Breaches'
      : `${categoryDisplayName} with 52+ Week Breaches`
    : `${serviceDisplayName} 52+ Week Waiters`;

  const chartDescription = selectedService === 'all'
    ? selectedCategory === 'all'
      ? `Count of services exceeding 52-week threshold over ${chartData.length} months`
      : `Count of ${categoryDisplayName.toLowerCase()} exceeding 52-week threshold over ${chartData.length} months`
    : `${serviceDisplayName} patients waiting 52+ weeks over ${chartData.length} months`;

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
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                domain={[0, Math.max(5, maxBreaches + 1)]}
                allowDecimals={false}
              />
              <Tooltip
                formatter={formatTooltip}
                labelFormatter={(label) => `Period: ${label}`}
                labelStyle={{ color: '#334155', fontWeight: 500 }}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              {/* Zero baseline reference line */}
              <ReferenceLine
                y={0}
                stroke="hsl(142, 76%, 36%)"
                strokeDasharray="5 5"
                label={{ value: "No Breaches", position: "topLeft", fontSize: 12, fill: "#059669" }}
              />
              <Line
                type="monotone"
                dataKey="servicesWithBreaches"
                stroke="hsl(0, 84%, 60%)"
                strokeWidth={3}
                dot={{
                  fill: 'hsl(0, 84%, 60%)',
                  strokeWidth: 2,
                  r: 5,
                  stroke: 'white'
                }}
                activeDot={{
                  r: 7,
                  fill: 'hsl(0, 84%, 60%)',
                  stroke: 'white',
                  strokeWidth: 3
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Statistics */}
        <div className="flex justify-between mt-4 pt-4 border-t border-slate-200 text-sm">
          <div className="text-center">
            <p className="text-slate-600">Current</p>
            <p className={`text-2xl font-bold ${latestData?.servicesWithBreaches === 0 ? 'text-green-600' : 'text-red-600'}`}>
              {latestData?.servicesWithBreaches || 0}
            </p>
            <p className="text-xs text-slate-500">services</p>
          </div>
          <div className="text-center">
            <p className="text-slate-600">Peak Breaches</p>
            <p className="font-semibold text-red-600">{maxBreaches}</p>
            <p className="text-xs text-slate-500">highest count</p>
          </div>
          <div className="text-center">
            <p className="text-slate-600">Breach-Free Periods</p>
            <p className="font-semibold text-green-600">
              {breachFreeCount} of {totalPeriods}
            </p>
            <p className="text-xs text-slate-500">
              {totalPeriods > 0 ? ((breachFreeCount / totalPeriods) * 100).toFixed(0) : 0}% of time
            </p>
          </div>
          <div className="text-center">
            <p className="text-slate-600">Monthly Trend</p>
            <div className="flex items-center justify-center gap-1">
              {trend > 0 ? (
                <>
                  <span className="text-red-600 font-semibold">↗ +{trend}</span>
                  <p className="text-xs text-red-600">worsening</p>
                </>
              ) : trend < 0 ? (
                <>
                  <span className="text-green-600 font-semibold">↘ {trend}</span>
                  <p className="text-xs text-green-600">improving</p>
                </>
              ) : (
                <>
                  <span className="text-slate-500 font-semibold">— 0</span>
                  <p className="text-xs text-slate-500">stable</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Alert for current breaches */}
        {latestData && latestData.servicesWithBreaches > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <p className="text-sm font-medium text-red-800">
                Current Alert: {latestData.servicesWithBreaches} service{latestData.servicesWithBreaches !== 1 ? 's' : ''}
                {' '}currently have patients waiting 52+ weeks
              </p>
            </div>
          </div>
        )}

        {/* Success message for no breaches */}
        {latestData && latestData.servicesWithBreaches === 0 && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-sm font-medium text-green-800">
                ✓ No services currently have patients waiting 52+ weeks
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}