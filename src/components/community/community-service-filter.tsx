'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, FilterX } from 'lucide-react';
import { CommunityHealthData } from '@/types/database';

interface CommunityServiceFilterProps {
  data: CommunityHealthData;
  selectedService: string;
  selectedCategory: string;
  onServiceChange: (service: string) => void;
  onCategoryChange: (category: string) => void;
}

// Service name display mapping
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

export function CommunityServiceFilter({ data, selectedService, selectedCategory, onServiceChange, onCategoryChange }: CommunityServiceFilterProps) {
  // Extract all available services
  const getAllServices = () => {
    const services: Array<{
      key: string;
      name: string;
      category: 'Adult' | 'CYP';
      totalWaiting: number;
    }> = [];

    // Add adult services
    Object.entries(data.adult_services || {}).forEach(([key, serviceData]) => {
      if (serviceData && serviceData.total_waiting > 0) {
        services.push({
          key: `adult_${key}`, // Prefix to make keys unique
          name: SERVICE_DISPLAY_NAMES[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          category: 'Adult',
          totalWaiting: serviceData.total_waiting
        });
      }
    });

    // Add CYP services
    Object.entries(data.cyp_services || {}).forEach(([key, serviceData]) => {
      if (serviceData && serviceData.total_waiting > 0) {
        services.push({
          key: `cyp_${key}`, // Prefix to make keys unique
          name: SERVICE_DISPLAY_NAMES[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          category: 'CYP',
          totalWaiting: serviceData.total_waiting
        });
      }
    });

    return services.sort((a, b) => a.name.localeCompare(b.name));
  };

  const availableServices = getAllServices();

  // Filter services by selected category
  const filteredServices = selectedCategory === 'all'
    ? availableServices
    : availableServices.filter(s => s.category === selectedCategory);

  const selectedServiceData = availableServices.find(s => s.key === selectedService);

  // Helper to get original service key without prefix
  const getOriginalServiceKey = (prefixedKey: string) => {
    return prefixedKey.replace(/^(adult_|cyp_)/, '');
  };

  // Helper to get category from prefixed key
  const getCategoryFromKey = (prefixedKey: string) => {
    if (prefixedKey.startsWith('adult_')) return 'Adult';
    if (prefixedKey.startsWith('cyp_')) return 'CYP';
    return 'All';
  };

  // Check if any filters are active
  const hasActiveFilters = selectedCategory !== 'all' || selectedService !== 'all';

  // Clear all filters function
  const clearAllFilters = () => {
    onCategoryChange('all');
    onServiceChange('all');
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border">
      <div className="flex items-center gap-4">
        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Category:</span>
          <Select value={selectedCategory} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Adult">Adult Services</SelectItem>
              <SelectItem value="CYP">Children & Young People</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Service Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Service:</span>
          <Select value={selectedService} onValueChange={onServiceChange}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="All Services" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>

              {filteredServices.map(service => (
                <SelectItem key={service.key} value={service.key}>
                  <div className="flex items-center justify-between w-full">
                    <span>
                      {service.name}
                      <span className="text-xs text-slate-400 ml-1">
                        ({service.category})
                      </span>
                    </span>
                    <span className="text-xs text-slate-500 ml-2">
                      {service.totalWaiting.toLocaleString()}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear All Filters Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={clearAllFilters}
          disabled={!hasActiveFilters}
          className={`flex items-center gap-2 transition-opacity ${
            hasActiveFilters
              ? 'text-slate-600 hover:text-slate-900 border-slate-300 opacity-100'
              : 'text-slate-400 border-slate-200 opacity-50 cursor-not-allowed'
          }`}
        >
          <FilterX className="h-4 w-4" />
          Clear All Filters
        </Button>
      </div>

      {/* Active filter badges */}
      <div className="flex items-center gap-2">
        {selectedCategory !== 'all' && (
          <Badge variant="outline" className="flex items-center gap-1">
            <span>{selectedCategory === 'CYP' ? 'Children & Young People' : selectedCategory}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => onCategoryChange('all')}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        )}

        {selectedService !== 'all' && selectedServiceData && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <span>{selectedServiceData.name} ({selectedServiceData.category})</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => onServiceChange('all')}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        )}

        {(selectedService !== 'all' || selectedCategory !== 'all') && (
          <span className="text-xs text-slate-500">
            {selectedService !== 'all'
              ? `${selectedServiceData?.totalWaiting.toLocaleString()} patients waiting`
              : `${filteredServices.length} services available`
            }
          </span>
        )}
      </div>
    </div>
  );
}

// Export helper functions for other components to use
export const getOriginalServiceKey = (prefixedKey: string) => {
  return prefixedKey.replace(/^(adult_|cyp_)/, '');
};

export const getCategoryFromKey = (prefixedKey: string) => {
  if (prefixedKey.startsWith('adult_')) return 'adult_services';
  if (prefixedKey.startsWith('cyp_')) return 'cyp_services';
  return null;
};