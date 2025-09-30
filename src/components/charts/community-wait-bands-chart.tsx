'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CommunityHealthData } from '@/types/database';

interface CommunityWaitBandsChartProps {
  data: CommunityHealthData;
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

export function CommunityWaitBandsChart({ data, selectedService = 'all', selectedCategory = 'all' }: CommunityWaitBandsChartProps) {
  // Aggregate wait time data for selected service or all services, filtered by category
  const aggregateWaitBands = () => {
    const aggregated = {
      wait_0_1_weeks: 0,
      wait_1_2_weeks: 0,
      wait_2_4_weeks: 0,
      wait_4_12_weeks: 0,
      wait_12_18_weeks: 0,
      wait_18_52_weeks: 0,
      wait_52_plus_weeks: 0
    };

    if (selectedService === 'all') {
      // Process based on category filter
      if (selectedCategory === 'all' || selectedCategory === 'adult_services') {
        Object.values(data.adult_services || {}).forEach(service => {
          Object.keys(aggregated).forEach(key => {
            aggregated[key as keyof typeof aggregated] += (service as any)[key] || 0;
          });
        });
      }

      if (selectedCategory === 'all' || selectedCategory === 'cyp_services') {
        Object.values(data.cyp_services || {}).forEach(service => {
          Object.keys(aggregated).forEach(key => {
            aggregated[key as keyof typeof aggregated] += (service as any)[key] || 0;
          });
        });
      }
    } else {
      // Process only selected service
      const adultService = data.adult_services?.[selectedService];
      const cypService = data.cyp_services?.[selectedService];

      const selectedServiceData = adultService || cypService;
      if (selectedServiceData) {
        Object.keys(aggregated).forEach(key => {
          aggregated[key as keyof typeof aggregated] = (selectedServiceData as any)[key] || 0;
        });
      }
    }

    return aggregated;
  };

  const waitBandsData = aggregateWaitBands();
  const totalPatients = Object.values(waitBandsData).reduce((sum, value) => sum + value, 0);

  const chartData = [
    {
      name: '0-1 weeks',
      shortName: '0-1w',
      value: waitBandsData.wait_0_1_weeks,
      percentage: totalPatients > 0 ? (waitBandsData.wait_0_1_weeks / totalPatients) * 100 : 0,
      color: 'hsl(142, 76%, 36%)', // Green
      urgency: 'low'
    },
    {
      name: '1-2 weeks',
      shortName: '1-2w',
      value: waitBandsData.wait_1_2_weeks,
      percentage: totalPatients > 0 ? (waitBandsData.wait_1_2_weeks / totalPatients) * 100 : 0,
      color: 'hsl(142, 76%, 36%)', // Green
      urgency: 'low'
    },
    {
      name: '2-4 weeks',
      shortName: '2-4w',
      value: waitBandsData.wait_2_4_weeks,
      percentage: totalPatients > 0 ? (waitBandsData.wait_2_4_weeks / totalPatients) * 100 : 0,
      color: 'hsl(48, 96%, 53%)', // Yellow
      urgency: 'moderate'
    },
    {
      name: '4-12 weeks',
      shortName: '4-12w',
      value: waitBandsData.wait_4_12_weeks,
      percentage: totalPatients > 0 ? (waitBandsData.wait_4_12_weeks / totalPatients) * 100 : 0,
      color: 'hsl(38, 92%, 50%)', // Amber
      urgency: 'moderate'
    },
    {
      name: '12-18 weeks',
      shortName: '12-18w',
      value: waitBandsData.wait_12_18_weeks,
      percentage: totalPatients > 0 ? (waitBandsData.wait_12_18_weeks / totalPatients) * 100 : 0,
      color: 'hsl(38, 92%, 50%)', // Amber
      urgency: 'high'
    },
    {
      name: '18-52 weeks',
      shortName: '18-52w',
      value: waitBandsData.wait_18_52_weeks,
      percentage: totalPatients > 0 ? (waitBandsData.wait_18_52_weeks / totalPatients) * 100 : 0,
      color: 'hsl(25, 95%, 53%)', // Orange
      urgency: 'high'
    },
    {
      name: '52+ weeks',
      shortName: '52+w',
      value: waitBandsData.wait_52_plus_weeks,
      percentage: totalPatients > 0 ? (waitBandsData.wait_52_plus_weeks / totalPatients) * 100 : 0,
      color: 'hsl(0, 84%, 60%)', // Red
      urgency: 'critical'
    }
  ];

  if (totalPatients === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Wait Time Band Breakdown
          </CardTitle>
          <CardDescription>Patient distribution across wait time bands</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-slate-500">
            No community health data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatTooltip = (value: number, name: string, props: any) => {
    const percentage = props.payload.percentage;
    return [
      `${value.toLocaleString()} patients (${percentage.toFixed(1)}%)`,
      name
    ];
  };

  // Calculate summary statistics
  const over18WeeksTotal = waitBandsData.wait_18_52_weeks + waitBandsData.wait_52_plus_weeks;
  const over18WeeksPercent = totalPatients > 0 ? (over18WeeksTotal / totalPatients) * 100 : 0;

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
      ? 'Wait Time Band Breakdown'
      : `${categoryDisplayName} Wait Time Breakdown`
    : `${serviceDisplayName} Wait Time Breakdown`;

  const chartDescription = selectedService === 'all'
    ? selectedCategory === 'all'
      ? `Patient distribution across wait time bands (${totalPatients.toLocaleString()} total patients)`
      : `${categoryDisplayName} patient distribution across wait bands (${totalPatients.toLocaleString()} patients)`
    : `${serviceDisplayName} patient distribution across wait bands (${totalPatients.toLocaleString()} patients)`;

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
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="shortName"
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
                tickFormatter={(value) => {
                  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                  return value.toString();
                }}
              />
              <Tooltip
                formatter={formatTooltip}
                labelFormatter={(label, payload) => {
                  const item = payload?.[0]?.payload;
                  return item ? `Wait Time: ${item.name}` : label;
                }}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Statistics */}
        <div className="flex justify-between mt-4 pt-4 border-t border-slate-200 text-sm">
          <div className="text-center">
            <p className="text-slate-600">Under 4 weeks</p>
            <p className="font-semibold text-green-600">
              {((waitBandsData.wait_0_1_weeks + waitBandsData.wait_1_2_weeks + waitBandsData.wait_2_4_weeks) / totalPatients * 100).toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-slate-600">4-18 weeks</p>
            <p className="font-semibold text-amber-600">
              {((waitBandsData.wait_4_12_weeks + waitBandsData.wait_12_18_weeks) / totalPatients * 100).toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-slate-600">Over 18 weeks</p>
            <p className="font-semibold text-red-600">
              {over18WeeksPercent.toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-slate-600">52+ week breaches</p>
            <p className="font-semibold text-red-800">
              {waitBandsData.wait_52_plus_weeks.toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}