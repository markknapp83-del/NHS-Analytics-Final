'use client';

import { useState, useRef, useEffect } from 'react';
import { useNHSData } from '@/hooks/useNHSData';
import { useTrustSelection } from '@/hooks/use-trust-selection';
import { ChevronDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function TrustSelectorHeader() {
  const { trusts, isLoading } = useNHSData();
  const [selectedTrust, setSelectedTrust] = useTrustSelection();
  const currentTrust = trusts.find(t => t.code === selectedTrust);

  if (isLoading) {
    return (
      <div className="h-18 bg-[#005eb8] border-b border-white/10 shadow-sm">
        <div className="h-full px-6 flex items-center">
          <div className="text-sm text-white/80">Loading trust data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-18 bg-[#005eb8] border-b border-white/10 shadow-sm">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left: Trust Selector (Hero Element) */}
        <div className="flex-1 max-w-2xl">
          <TrustSelector
            trusts={trusts}
            currentTrust={currentTrust}
            onSelect={setSelectedTrust}
          />
        </div>

        {/* Right: Status & Actions */}
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="border-white/30 bg-white/10 text-white backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-green-400 mr-2 relative">
              <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
            </div>
            Latest Data
          </Badge>
        </div>
      </div>
    </div>
  );
}

interface TrustSelectorProps {
  trusts: Array<{ code: string; name: string }>;
  currentTrust?: { code: string; name: string };
  onSelect: (trustCode: string) => void;
}

function TrustSelector({ trusts, currentTrust, onSelect }: TrustSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    onSelect(trustCode);
    setIsOpen(false);
    setSearch('');
  };

  const filteredTrusts = trusts.filter(trust =>
    trust.name.toLowerCase().includes(search.toLowerCase()) ||
    trust.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between h-12 px-4 border-white/30 bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm shadow-sm hover:shadow-md transition-all"
      >
        <div className="flex flex-col items-start text-left">
          <span className="font-semibold text-base text-white">
            {currentTrust ? currentTrust.name : 'Select NHS Trust'}
          </span>
        </div>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-white/70" />
      </Button>

      {isOpen && (
        <div className="absolute left-0 top-14 w-[500px] bg-white border border-border rounded-md shadow-dropdown z-[100] max-h-[70vh] flex flex-col">
          {/* Search Bar */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
              <input
                type="text"
                placeholder="Search trusts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 h-10 border border-border rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-nhs-blue/20 focus:border-nhs-blue"
              />
            </div>
          </div>

          {/* Trust List */}
          <div className="overflow-y-auto flex-1">
            <div className="p-2">
              {filteredTrusts.map((trust) => (
                <button
                  key={trust.code}
                  onClick={() => handleTrustSelect(trust.code)}
                  className="w-full px-2 py-2 hover:bg-slate-50 rounded-md cursor-pointer transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-text-primary truncate">
                        {trust.name}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}