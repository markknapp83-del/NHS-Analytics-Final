'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CalendarIcon, Filter } from 'lucide-react';

interface RTTFiltersProps {
  selectedSpecialty: string;
  onSpecialtyChange: (specialty: string) => void;
  selectedDateRange: string;
  onDateRangeChange: (range: string) => void;
  availableDateRanges: { value: string; label: string }[];
}

export function RTTFilters({
  selectedSpecialty,
  onSpecialtyChange,
  selectedDateRange,
  onDateRangeChange,
  availableDateRanges
}: RTTFiltersProps) {
  const specialties = [
    { value: 'trust_total', label: 'Trust Total' },
    { value: 'general_surgery', label: 'General Surgery' },
    { value: 'urology', label: 'Urology' },
    { value: 'trauma_orthopaedics', label: 'Trauma & Orthopaedics' },
    { value: 'ent', label: 'ENT' },
    { value: 'ophthalmology', label: 'Ophthalmology' },
    { value: 'cardiology', label: 'Cardiology' },
    { value: 'gastroenterology', label: 'Gastroenterology' },
    { value: 'dermatology', label: 'Dermatology' },
    { value: 'gynaecology', label: 'Gynaecology' },
    { value: 'neurology', label: 'Neurology' },
    { value: 'rheumatology', label: 'Rheumatology' },
    { value: 'plastic_surgery', label: 'Plastic Surgery' },
    { value: 'oral_surgery', label: 'Oral Surgery' },
    { value: 'maxillofacial_surgery', label: 'Maxillofacial Surgery' }
  ];

  return (
    <Card className="mb-2">
      <CardContent className="px-4 py-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-3 w-3 text-slate-600" />
            <span className="text-xs font-medium text-slate-700">Filters:</span>
          </div>

          {/* Specialty Filter - Left side */}
          <div className="flex items-center gap-2">
            <Label htmlFor="specialty-select" className="text-xs text-slate-600 whitespace-nowrap">
              Specialty:
            </Label>
            <Select value={selectedSpecialty} onValueChange={onSpecialtyChange}>
              <SelectTrigger id="specialty-select" className="h-7 w-40 text-xs">
                <SelectValue placeholder="Select specialty" />
              </SelectTrigger>
              <SelectContent>
                {specialties.map((specialty) => (
                  <SelectItem key={specialty.value} value={specialty.value}>
                    {specialty.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter - Left side */}
          <div className="flex items-center gap-2">
            <Label htmlFor="date-range-select" className="text-xs text-slate-600 whitespace-nowrap">
              Date Range:
            </Label>
            <Select value={selectedDateRange} onValueChange={onDateRangeChange}>
              <SelectTrigger id="date-range-select" className="h-7 w-36 text-xs">
                <CalendarIcon className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                {availableDateRanges.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}