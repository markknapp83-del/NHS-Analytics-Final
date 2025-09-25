'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CommunityHealthData, CommunityServiceData } from '@/types/database';

interface CommunityTopServicesChartProps {
  data: CommunityHealthData;
  selectedService?: string;
  selectedCategory?: string;
  onServiceClick?: (serviceKey: string) => void;
}

// Service name display mapping (based on actual database keys)
const SERVICE_DISPLAY_NAMES: Record<string, string> = {
  // Adult services
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
  // CYP services
  'community_paediatrics': 'Community Paediatrics',
  'antenatal_screening': 'Antenatal Screening',
  'newborn_hearing': 'Newborn Hearing',
  'vision_screening': 'Vision Screening'
};

export function CommunityTopServicesChart({ data, selectedService = 'all', selectedCategory = 'all', onServiceClick }: CommunityTopServicesChartProps) {
  // Extract all services and their data
  const getTopServices = (limit: number = 10) => {
    const services: Array<{
      name: string;
      displayName: string;
      category: 'Adult' | 'CYP';
      totalWaiting: number;
      breaches52Plus: number;
    }> = [];

    // Process adult services (only if category allows)
    if (selectedCategory === 'all' || selectedCategory === 'adult_services') {
      Object.entries(data.adult_services || {}).forEach(([key, serviceData]) => {
        if (serviceData && typeof serviceData.total_waiting === 'number' && serviceData.total_waiting > 0) {
          services.push({
            name: key,
            displayName: SERVICE_DISPLAY_NAMES[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            category: 'Adult',
            totalWaiting: serviceData.total_waiting,
            breaches52Plus: serviceData.wait_52_plus_weeks || 0
          });
        }
      });
    }

    // Process CYP services (only if category allows)
    if (selectedCategory === 'all' || selectedCategory === 'cyp_services') {
      Object.entries(data.cyp_services || {}).forEach(([key, serviceData]) => {
        if (serviceData && typeof serviceData.total_waiting === 'number' && serviceData.total_waiting > 0) {
          services.push({
            name: key,
            displayName: SERVICE_DISPLAY_NAMES[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            category: 'CYP',
            totalWaiting: serviceData.total_waiting,
            breaches52Plus: serviceData.wait_52_plus_weeks || 0
          });
        }
      });
    }

    return services
      .sort((a, b) => b.totalWaiting - a.totalWaiting)
      .slice(0, limit);
  };

  const topServices = getTopServices(10);

  if (topServices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Largest Service Waiting Lists
          </CardTitle>
          <CardDescription>Top community services by patient volume</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-slate-500">
            No community health data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Create chart data - reverse order so largest appears at top
  const chartData = topServices.reverse().map((service, index) => ({
    name: service.displayName.length > 20 ? service.displayName.substring(0, 18) + '...' : service.displayName,
    fullName: service.displayName,
    serviceKey: service.name,
    prefixedKey: `${service.category.toLowerCase() === 'adult' ? 'adult' : 'cyp'}_${service.name}`,
    value: service.totalWaiting,
    category: service.category,
    breaches: service.breaches52Plus,
    isSelected: selectedService === service.name,
    isFiltered: selectedService !== 'all' && selectedService !== service.name
  }));

  const totalAcrossTopServices = topServices.reduce((sum, service) => sum + service.totalWaiting, 0);
  const servicesWithBreaches = topServices.filter(s => s.breaches52Plus > 0).length;

  // Debug logging
  console.log('Chart data for bars:', chartData);
  console.log('Max value:', Math.max(...chartData.map(d => d.value)));
  console.log('Min value:', Math.min(...chartData.map(d => d.value)));

  return (
    <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-slate-900">
          {selectedCategory === 'all'
            ? 'Largest Service Waiting Lists'
            : selectedCategory === 'adult_services'
            ? 'Largest Adult Services Waiting Lists'
            : 'Largest Children & Young People Service Lists'}
        </CardTitle>
        <CardDescription className="text-sm text-slate-600">
          Top {topServices.length} {
            selectedCategory === 'all'
              ? 'community services'
              : selectedCategory === 'adult_services'
              ? 'adult services'
              : 'children & young people services'
          } by patient volume
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Custom horizontal bar chart */}
        <div className="space-y-3">
          {chartData.map((item, index) => {
            const maxValue = Math.max(...chartData.map(d => d.value));
            const widthPercentage = (item.value / maxValue) * 100;

            // Determine bar color based on selection state
            const getBarColor = () => {
              if (item.isSelected) return 'from-blue-500 to-blue-600';
              if (item.isFiltered) return 'from-slate-300 to-slate-400';
              return 'from-blue-500 to-blue-600';
            };

            const getTextColor = () => {
              if (item.isFiltered) return 'text-slate-400';
              return item.isSelected ? 'text-blue-700 font-semibold' : 'text-slate-600';
            };

            const getValueTextColor = () => {
              if (item.isFiltered) return 'text-slate-400';
              return item.isSelected ? 'text-blue-700 font-semibold' : 'text-slate-700';
            };

            return (
              <div key={index} className="flex items-center gap-3">
                {/* Service name */}
                <div className={`w-32 text-xs text-right truncate ${getTextColor()}`}>
                  {item.name}
                </div>

                {/* Bar */}
                <div className="flex-1 relative">
                  <div
                    className={`h-6 bg-gradient-to-r ${getBarColor()} rounded-r-md transition-all duration-300 ease-out relative group ${
                      onServiceClick ? 'cursor-pointer hover:shadow-md' : ''
                    }`}
                    style={{ width: `${Math.max(widthPercentage, 8)}%` }}
                    onClick={() => onServiceClick?.(item.prefixedKey)}
                  >
                    {/* Value inside bar */}
                    <div className="absolute right-2 top-0 h-full flex items-center">
                      <span className="text-xs font-medium text-white opacity-90">
                        {item.value.toLocaleString()}
                      </span>
                    </div>

                    {/* Hover tooltip */}
                    <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                      <div className="bg-slate-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                        {item.fullName}: {item.value.toLocaleString()} patients
                        {item.breaches > 0 && (
                          <div className="text-red-400">
                            {item.breaches} waiting 52+ weeks
                          </div>
                        )}
                        {onServiceClick && (
                          <div className="text-slate-300 mt-1">
                            Click to filter
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Value label */}
                <div className={`w-16 text-xs font-medium ${getValueTextColor()}`}>
                  {item.value >= 1000 ? `${(item.value / 1000).toFixed(1)}k` : item.value}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-200 text-sm">
          <div className="text-center">
            <p className="text-slate-600">Largest Service</p>
            <p className="font-semibold text-blue-600">
              {topServices[topServices.length - 1]?.totalWaiting.toLocaleString() || '—'}
            </p>
            <p className="text-xs text-slate-500 truncate">{topServices[topServices.length - 1]?.displayName || '—'}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-600">Top 10 Total</p>
            <p className="font-semibold text-slate-900">
              {totalAcrossTopServices.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-slate-600">With 52+ Week Breaches</p>
            <p className={`font-semibold ${servicesWithBreaches > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {servicesWithBreaches} of {topServices.length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-slate-600">Categories</p>
            <div className="flex gap-2 justify-center">
              <span className="inline-flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-xs">Adult</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-xs">CYP</span>
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}