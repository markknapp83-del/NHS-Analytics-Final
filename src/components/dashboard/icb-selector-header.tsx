'use client';

import { useState, useRef, useEffect } from 'react';
import { useICBData } from '@/hooks/useICBData';

interface ICBSelectorHeaderProps {
  selectedICB: string | null;
  onICBSelect: (icbCode: string) => void;
}

export function ICBSelectorHeader({ selectedICB, onICBSelect }: ICBSelectorHeaderProps) {
  const { allICBs, isLoading } = useICBData();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentICB = allICBs.find(icb => icb.code === selectedICB);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleICBSelect = (icbCode: string) => {
    onICBSelect(icbCode);
    setIsOpen(false);
  };

  if (isLoading) {
    return (
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="text-sm text-slate-500">Loading ICB data...</div>
      </div>
    );
  }

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4" ref={dropdownRef}>
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-xl font-bold text-[#005eb8] hover:text-[#004a94] transition-colors cursor-pointer"
            >
              {currentICB ? currentICB.name : 'Select ICB'}
            </button>

            {isOpen && (
              <div className="absolute top-full left-0 mt-2 w-[500px] bg-white border border-slate-200 rounded-md shadow-lg z-50 max-h-[400px] overflow-y-auto">
                {allICBs.map((icb) => (
                  <button
                    key={icb.code}
                    onClick={() => handleICBSelect(icb.code)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors"
                  >
                    <div className="font-medium text-slate-900">{icb.name}</div>
                    <div className="text-sm text-slate-600">{icb.trustCount} trusts</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="text-sm text-slate-600">
          ICB performance analysis and regional intelligence
        </div>
      </div>
    </div>
  );
}