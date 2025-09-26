'use client';

import { useState, useRef, useEffect } from 'react';
import { useNHSData } from '@/hooks/useNHSData';
import { useTrustSelection } from '@/hooks/use-trust-selection';

export function TrustSelectorHeader() {
  const { trusts, isLoading } = useNHSData();
  const [selectedTrust, setSelectedTrust] = useTrustSelection();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentTrust = trusts.find(t => t.code === selectedTrust);

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

  const handleTrustSelect = (trustCode: string) => {
    setSelectedTrust(trustCode);
    setIsOpen(false);
  };

  if (isLoading) {
    return (
      <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="text-sm text-slate-500">Loading trust data...</div>
      </div>
    );
  }

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4" ref={dropdownRef}>
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-xl font-semibold text-slate-800 hover:text-[#005eb8] transition-colors cursor-pointer tracking-tight"
            >
              {currentTrust ? currentTrust.name : 'Select NHS Trust'}
            </button>
            {currentTrust && (
              <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-xs font-medium text-slate-600">
                {currentTrust.code}
              </span>
            )}

            {isOpen && (
              <div className="absolute top-full left-0 mt-2 w-[500px] bg-white border border-slate-200 rounded-md shadow-lg z-50 max-h-[400px] overflow-y-auto">
                {trusts.map((trust) => (
                  <button
                    key={trust.code}
                    onClick={() => handleTrustSelect(trust.code)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors"
                  >
                    <div className="font-medium text-slate-900">{trust.name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-sm font-medium">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Latest Data
        </div>
      </div>
    </div>
  );
}