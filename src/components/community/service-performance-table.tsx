'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CommunityHealthData, CommunityServiceData } from '@/types/database';
import { Search, TrendingUp, TrendingDown, Minus, ChevronDown, Users } from 'lucide-react';

interface ServiceDisplayRow {
  category: 'Adult' | 'CYP';
  serviceName: string;
  displayName: string;
  data: CommunityServiceData;
  totalWaiting: number;
  wait52PlusWeeks: number;
  percentOver18Weeks: number;
  monthlyChange: number;
  trend: 'up' | 'down' | 'stable';
}

interface ServicePerformanceTableProps {
  data: CommunityHealthData;
  previousData?: CommunityHealthData;
}

// Service name display mapping as per the plan
const SERVICE_DISPLAY_NAMES: Record<string, string> = {
  // Adult services
  'msk_service': 'Musculoskeletal Services',
  'podiatry': 'Podiatry & Podiatric Surgery',
  'therapy_physiotherapy': 'Physiotherapy',
  'audiology': 'Audiology',
  'community_nursing': 'Community Nursing',
  'therapy_ot': 'Occupational Therapy',
  'therapy_speech_language': 'Speech & Language Therapy',
  'therapy_dietetics': 'Dietetics',
  'intermediate_care_reablement': 'Intermediate Care & Reablement',
  'urgent_community_response': 'Urgent Community Response',
  'community_paediatric_nursing': 'Community Paediatric Nursing',
  'home_oxygen_service': 'Home Oxygen Service',
  'specialist_rehabilitation': 'Specialist Rehabilitation',
  'tissue_viability': 'Tissue Viability',
  'orthoptics': 'Orthoptics',
  'wheelchair_services': 'Wheelchair Services',
  'prosthetics_orthotics': 'Prosthetics & Orthotics',
  'continence_services': 'Continence Services',
  'cardiac_rehabilitation': 'Cardiac Rehabilitation',
  'pulmonary_rehabilitation': 'Pulmonary Rehabilitation',
  'diabetes_structured_education': 'Diabetes Structured Education',
  'smoking_cessation': 'Smoking Cessation',
  'weight_management': 'Weight Management',
  'falls_prevention': 'Falls Prevention',
  'specialist_nursing': 'Specialist Nursing',
  'community_dental_services': 'Community Dental Services',
  'sexual_health': 'Sexual Health',
  'substance_misuse': 'Substance Misuse',
  'anticoagulation': 'Anticoagulation',
  'other_adult_services': 'Other Adult Services',

  // CYP services
  'community_paediatrics': 'Community Paediatric Service',
  'therapy_speech_language_cyp': 'Speech & Language Therapy (CYP)',
  'therapy_ot_cyp': 'Occupational Therapy (CYP)',
  'therapy_physiotherapy_cyp': 'Physiotherapy (CYP)',
  'specialist_nursing_cyp': 'Specialist Nursing (CYP)',
  'audiology_cyp': 'Audiology (CYP)',
  'orthoptics_cyp': 'Orthoptics (CYP)',
  'therapy_dietetics_cyp': 'Dietetics (CYP)',
  'continence_services_cyp': 'Continence Services (CYP)',
  'wheelchair_services_cyp': 'Wheelchair Services (CYP)',
  'prosthetics_orthotics_cyp': 'Prosthetics & Orthotics (CYP)',
  'specialist_rehabilitation_cyp': 'Specialist Rehabilitation (CYP)',
  'tissue_viability_cyp': 'Tissue Viability (CYP)',
  'substance_misuse_cyp': 'Substance Misuse (CYP)',
  'sexual_health_cyp': 'Sexual Health (CYP)',
  'smoking_cessation_cyp': 'Smoking Cessation (CYP)',
  'other_cyp_services': 'Other CYP Services'
};

export function ServicePerformanceTable({ data, previousData }: ServicePerformanceTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'total' | 'breaches' | 'percent' | 'change'>('total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'Adult' | 'CYP'>('all');

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'name' ? 'asc' : 'desc');
    }
  };

  const serviceRows: ServiceDisplayRow[] = useMemo(() => {
    const rows: ServiceDisplayRow[] = [];

    // Process adult services
    Object.entries(data.adult_services || {}).forEach(([key, serviceData]) => {
      const previousService = previousData?.adult_services?.[key];
      const monthlyChange = previousService
        ? ((serviceData.total_waiting - previousService.total_waiting) / previousService.total_waiting) * 100
        : 0;

      const percentOver18Weeks = serviceData.total_waiting > 0
        ? ((serviceData.wait_18_52_weeks + serviceData.wait_52_plus_weeks) / serviceData.total_waiting) * 100
        : 0;

      rows.push({
        category: 'Adult',
        serviceName: key,
        displayName: SERVICE_DISPLAY_NAMES[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        data: serviceData,
        totalWaiting: serviceData.total_waiting,
        wait52PlusWeeks: serviceData.wait_52_plus_weeks,
        percentOver18Weeks,
        monthlyChange,
        trend: monthlyChange > 5 ? 'up' : monthlyChange < -5 ? 'down' : 'stable'
      });
    });

    // Process CYP services
    Object.entries(data.cyp_services || {}).forEach(([key, serviceData]) => {
      const previousService = previousData?.cyp_services?.[key];
      const monthlyChange = previousService
        ? ((serviceData.total_waiting - previousService.total_waiting) / previousService.total_waiting) * 100
        : 0;

      const percentOver18Weeks = serviceData.total_waiting > 0
        ? ((serviceData.wait_18_52_weeks + serviceData.wait_52_plus_weeks) / serviceData.total_waiting) * 100
        : 0;

      rows.push({
        category: 'CYP',
        serviceName: key,
        displayName: SERVICE_DISPLAY_NAMES[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        data: serviceData,
        totalWaiting: serviceData.total_waiting,
        wait52PlusWeeks: serviceData.wait_52_plus_weeks,
        percentOver18Weeks,
        monthlyChange,
        trend: monthlyChange > 5 ? 'up' : monthlyChange < -5 ? 'down' : 'stable'
      });
    });

    return rows;
  }, [data, previousData]);

  const filteredAndSortedServices = useMemo(() => {
    let filtered = serviceRows.filter(service => {
      const matchesSearch = service.displayName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
      return matchesSearch && matchesCategory && service.totalWaiting > 0; // Only show services with patients waiting
    });

    return filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.displayName.localeCompare(b.displayName);
          break;
        case 'total':
          comparison = a.totalWaiting - b.totalWaiting;
          break;
        case 'breaches':
          comparison = a.wait52PlusWeeks - b.wait52PlusWeeks;
          break;
        case 'percent':
          comparison = a.percentOver18Weeks - b.percentOver18Weeks;
          break;
        case 'change':
          comparison = a.monthlyChange - b.monthlyChange;
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [serviceRows, searchTerm, selectedCategory, sortBy, sortOrder]);

  const getServiceStatusColor = (service: ServiceDisplayRow) => {
    if (service.wait52PlusWeeks > 50) return 'border-red-200 bg-red-50';
    if (service.percentOver18Weeks > 30) return 'border-amber-200 bg-amber-50';
    if (service.percentOver18Weeks < 20) return 'border-green-200 bg-green-50';
    return 'border-slate-200 bg-white';
  };

  const getServiceBadge = (service: ServiceDisplayRow) => {
    if (service.wait52PlusWeeks > 50) {
      return <Badge variant="destructive">Critical</Badge>;
    }
    if (service.percentOver18Weeks > 30) {
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200">High Wait</Badge>;
    }
    if (service.percentOver18Weeks < 20) {
      return <Badge className="bg-green-100 text-green-700 border-green-200">Good</Badge>;
    }
    return <Badge variant="outline">Standard</Badge>;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-red-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-green-600" />;
      default: return <Minus className="h-4 w-4 text-slate-400" />;
    }
  };

  const adultServices = filteredAndSortedServices.filter(s => s.category === 'Adult');
  const cypServices = filteredAndSortedServices.filter(s => s.category === 'CYP');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">Service Performance Analysis</CardTitle>
          <CardDescription>
            All community health services grouped by Adult and Children & Young People (CYP)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search services by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                All Services
              </Button>
              <Button
                variant={selectedCategory === 'Adult' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('Adult')}
              >
                Adult ({adultServices.length})
              </Button>
              <Button
                variant={selectedCategory === 'CYP' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('CYP')}
              >
                CYP ({cypServices.length})
              </Button>
            </div>
          </div>

          {/* Sort Controls */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              variant={sortBy === 'total' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('total')}
            >
              Total Waiting {sortBy === 'total' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
            <Button
              variant={sortBy === 'breaches' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('breaches')}
            >
              52+ Week Waiters {sortBy === 'breaches' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
            <Button
              variant={sortBy === 'percent' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('percent')}
            >
              % Over 18 Weeks {sortBy === 'percent' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
            <Button
              variant={sortBy === 'change' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('change')}
            >
              Monthly Change {sortBy === 'change' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Adult Services Section */}
      {(selectedCategory === 'all' || selectedCategory === 'Adult') && adultServices.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Adult Services ({adultServices.length} services)
          </h3>
          {adultServices.map((service) => (
            <Card
              key={service.serviceName}
              className={`transition-all duration-200 hover:shadow-md ${getServiceStatusColor(service)}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-slate-900">{service.displayName}</h4>
                      {getServiceBadge(service)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Total Waiting</p>
                        <p className="font-semibold text-slate-900">{service.totalWaiting.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">52+ Week Waiters</p>
                        <p className={`font-semibold ${service.wait52PlusWeeks > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {service.wait52PlusWeeks.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">% Over 18 Weeks</p>
                        <p className="font-semibold text-slate-900">{service.percentOver18Weeks.toFixed(1)}%</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <div>
                          <p className="text-slate-600">Monthly Trend</p>
                          <div className="flex items-center gap-1">
                            {getTrendIcon(service.trend)}
                            <span className="text-sm font-medium">
                              {Math.abs(service.monthlyChange).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* CYP Services Section */}
      {(selectedCategory === 'all' || selectedCategory === 'CYP') && cypServices.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            Children & Young People Services ({cypServices.length} services)
          </h3>
          {cypServices.map((service) => (
            <Card
              key={service.serviceName}
              className={`transition-all duration-200 hover:shadow-md ${getServiceStatusColor(service)}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-slate-900">{service.displayName}</h4>
                      {getServiceBadge(service)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Total Waiting</p>
                        <p className="font-semibold text-slate-900">{service.totalWaiting.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">52+ Week Waiters</p>
                        <p className={`font-semibold ${service.wait52PlusWeeks > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {service.wait52PlusWeeks.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">% Over 18 Weeks</p>
                        <p className="font-semibold text-slate-900">{service.percentOver18Weeks.toFixed(1)}%</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <div>
                          <p className="text-slate-600">Monthly Trend</p>
                          <div className="flex items-center gap-1">
                            {getTrendIcon(service.trend)}
                            <span className="text-sm font-medium">
                              {Math.abs(service.monthlyChange).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Results State */}
      {filteredAndSortedServices.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No Services Found
            </h3>
            <p className="text-sm text-slate-600">
              Try adjusting your search terms or filters to see more results.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}