'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CommunityHealthData } from '@/types/database';
import { Users, Stethoscope, AlertTriangle, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICard {
  title: string;
  value: number | undefined;
  previousValue?: number;
  format: 'number' | 'weeks';
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface CommunityKPICardsProps {
  data: CommunityHealthData;
  previousData?: CommunityHealthData;
  selectedService?: string;
  selectedCategory?: string;
}

// Service name display mapping
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

export function CommunityKPICards({ data, previousData, selectedService = 'all', selectedCategory = 'all' }: CommunityKPICardsProps) {
  // Get service-specific data or all data, optionally filtered by category
  const getServiceData = (communityData: CommunityHealthData, serviceKey: string, categoryKey: string = 'all') => {
    // If specific service is selected, filter by that service
    if (serviceKey !== 'all') {
      const adultService = communityData.adult_services?.[serviceKey];
      const cypService = communityData.cyp_services?.[serviceKey];

      if (adultService) {
        return {
          adult_services: { [serviceKey]: adultService },
          cyp_services: {},
          metadata: {
            last_updated: communityData.metadata.last_updated,
            services_reported: 1,
            total_waiting_all_services: adultService.total_waiting,
            services_with_52plus_breaches: adultService.wait_52_plus_weeks > 0 ? 1 : 0
          }
        };
      } else if (cypService) {
        return {
          adult_services: {},
          cyp_services: { [serviceKey]: cypService },
          metadata: {
            last_updated: communityData.metadata.last_updated,
            services_reported: 1,
            total_waiting_all_services: cypService.total_waiting,
            services_with_52plus_breaches: cypService.wait_52_plus_weeks > 0 ? 1 : 0
          }
        };
      }
    }

    // If category is selected (but no specific service), filter by category
    if (categoryKey !== 'all') {
      let filteredServices = {};
      let totalWaiting = 0;
      let servicesWithBreaches = 0;
      let servicesReported = 0;

      if (categoryKey === 'adult_services') {
        filteredServices = communityData.adult_services || {};
        Object.values(communityData.adult_services || {}).forEach(service => {
          totalWaiting += service.total_waiting || 0;
          if (service.wait_52_plus_weeks > 0) servicesWithBreaches++;
          servicesReported++;
        });

        return {
          adult_services: communityData.adult_services || {},
          cyp_services: {},
          metadata: {
            last_updated: communityData.metadata.last_updated,
            services_reported: servicesReported,
            total_waiting_all_services: totalWaiting,
            services_with_52plus_breaches: servicesWithBreaches
          }
        };
      } else if (categoryKey === 'cyp_services') {
        filteredServices = communityData.cyp_services || {};
        Object.values(communityData.cyp_services || {}).forEach(service => {
          totalWaiting += service.total_waiting || 0;
          if (service.wait_52_plus_weeks > 0) servicesWithBreaches++;
          servicesReported++;
        });

        return {
          adult_services: {},
          cyp_services: communityData.cyp_services || {},
          metadata: {
            last_updated: communityData.metadata.last_updated,
            services_reported: servicesReported,
            total_waiting_all_services: totalWaiting,
            services_with_52plus_breaches: servicesWithBreaches
          }
        };
      }
    }

    // Return all data if no filters applied
    return communityData;
  };

  // Helper function to calculate weighted average wait time
  const calculateWeightedAverageWait = (communityData: CommunityHealthData): number => {
    let totalPatients = 0;
    let weightedWeeks = 0;

    const bandWeights = {
      wait_0_1_weeks: 0.5,
      wait_1_2_weeks: 1.5,
      wait_2_4_weeks: 3,
      wait_4_12_weeks: 8,
      wait_12_18_weeks: 15,
      wait_18_52_weeks: 35,
      wait_52_plus_weeks: 65
    };

    ['adult_services', 'cyp_services'].forEach(category => {
      Object.values(communityData[category as keyof typeof communityData] || {}).forEach(service => {
        Object.entries(bandWeights).forEach(([band, weeks]) => {
          const patients = (service as any)[band] || 0;
          totalPatients += patients;
          weightedWeeks += patients * weeks;
        });
      });
    });

    return totalPatients > 0 ? Math.round(weightedWeeks / totalPatients) : 0;
  };

  // Get filtered data based on selected service and category
  const filteredData = getServiceData(data, selectedService, selectedCategory);
  const filteredPreviousData = previousData ? getServiceData(previousData, selectedService, selectedCategory) : undefined;

  const weightedAverageWait = useMemo(() =>
    calculateWeightedAverageWait(filteredData), [filteredData]
  );

  const previousWeightedAverageWait = useMemo(() =>
    filteredPreviousData ? calculateWeightedAverageWait(filteredPreviousData) : undefined,
    [filteredPreviousData]
  );

  const calculateTrend = (current: number, previous?: number) => {
    if (previous === null || previous === undefined) {
      return { change: 0, direction: 'neutral' as const };
    }
    const change = ((current - previous) / previous) * 100;
    return {
      change: Math.abs(change),
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral' as const
    };
  };

  const TrendIcon = ({ direction }: { direction: 'up' | 'down' | 'neutral' }) => {
    switch (direction) {
      case 'up': return <TrendingUp className="h-4 w-4 text-red-600" />; // Red for increases in wait times
      case 'down': return <TrendingDown className="h-4 w-4 text-green-600" />; // Green for decreases in wait times
      default: return <Minus className="h-4 w-4 text-slate-400" />;
    }
  };

  // Get service display name for titles
  const serviceDisplayName = selectedService !== 'all' ? SERVICE_DISPLAY_NAMES[selectedService] || selectedService : null;

  const kpiCards: KPICard[] = [
    {
      title: "Community Services Waiting List",
      value: filteredData.metadata.total_waiting_all_services,
      previousValue: filteredPreviousData?.metadata.total_waiting_all_services,
      format: "number",
      description: selectedService === 'all'
        ? "All community health services combined"
        : `Patients waiting for ${serviceDisplayName}`,
      icon: Users
    },
    {
      title: selectedService === 'all' ? "Active Services" : "Service Status",
      value: filteredData.metadata.services_reported,
      previousValue: filteredPreviousData?.metadata.services_reported,
      format: "number",
      description: selectedService === 'all'
        ? "Community services reporting data"
        : "Service actively reporting data",
      icon: Stethoscope
    },
    {
      title: selectedService === 'all' ? "Services with 52+ Week Waits" : "52+ Week Breaches",
      value: filteredData.metadata.services_with_52plus_breaches,
      previousValue: filteredPreviousData?.metadata.services_with_52plus_breaches,
      format: "number",
      description: selectedService === 'all'
        ? "Services exceeding 52-week threshold"
        : "Patients waiting over 52 weeks",
      icon: AlertTriangle
    },
    {
      title: "Estimated Average Wait",
      value: weightedAverageWait,
      previousValue: previousWeightedAverageWait,
      format: "weeks",
      description: selectedService === 'all'
        ? "Across all community services"
        : `Average wait for ${serviceDisplayName}`,
      icon: Clock
    }
  ];

  const getStatusColor = (kpi: KPICard) => {
    if (kpi.value === undefined || kpi.value === null) return 'text-slate-400';

    if (kpi.title.includes("52+ Week")) {
      return kpi.value === 0 ? 'text-green-600' : kpi.value > 5 ? 'text-red-600' : 'text-yellow-600';
    }

    if (kpi.title.includes("Average Wait")) {
      return kpi.value <= 8 ? 'text-green-600' : kpi.value <= 15 ? 'text-yellow-600' : 'text-red-600';
    }

    return 'text-blue-600'; // Default neutral color for counts
  };

  const getStatusBadge = (kpi: KPICard) => {
    if (kpi.value === undefined || kpi.value === null) {
      return <Badge variant="outline" className="text-slate-500">No Data</Badge>;
    }

    if (kpi.title.includes("52+ Week")) {
      if (kpi.value === 0) return <Badge className="bg-green-100 text-green-700 border-green-200">Excellent</Badge>;
      if (kpi.value <= 5) return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Concern</Badge>;
      return <Badge variant="destructive">Critical</Badge>;
    }

    if (kpi.title.includes("Average Wait")) {
      if (kpi.value <= 8) return <Badge className="bg-green-100 text-green-700 border-green-200">Good</Badge>;
      if (kpi.value <= 15) return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Concern</Badge>;
      return <Badge variant="destructive">High</Badge>;
    }

    return <Badge variant="outline" className="text-slate-600">Active</Badge>;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpiCards.map((kpi) => {
        const trend = (kpi.previousValue !== null && kpi.previousValue !== undefined && kpi.value !== null && kpi.value !== undefined)
          ? calculateTrend(kpi.value, kpi.previousValue)
          : null;
        const colorClass = getStatusColor(kpi);

        return (
          <Card key={kpi.title} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <kpi.icon className={`h-6 w-6 ${colorClass}`} />
                {getStatusBadge(kpi)}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-600">{kpi.title}</p>
                <div className="flex items-baseline gap-2">
                  <p className={`text-3xl font-bold ${colorClass}`}>
                    {kpi.value !== undefined && kpi.value !== null
                      ? kpi.format === 'weeks'
                        ? `${kpi.value}`
                        : kpi.value.toLocaleString()
                      : '—'
                    }
                    {kpi.format === 'weeks' && kpi.value ? (
                      <span className="text-sm font-normal ml-1">weeks</span>
                    ) : null}
                  </p>
                  {trend && trend.change > 0 && (
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
  );
}