'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { ICBSelectorHeader } from '@/components/dashboard/icb-selector-header';
import { useICBData } from '@/hooks/useICBData';

interface ICBSelectionContextType {
  selectedICB: string | null;
  onICBSelect: (icbCode: string) => void;
}

const ICBSelectionContext = createContext<ICBSelectionContextType>({
  selectedICB: null,
  onICBSelect: () => {}
});

export const useICBSelection = () => useContext(ICBSelectionContext);

interface ICBAnalysisLayoutProps {
  children: React.ReactNode;
}

export default function ICBAnalysisLayout({ children }: ICBAnalysisLayoutProps) {
  const { allICBs, isLoading } = useICBData();
  const [selectedICB, setSelectedICB] = useState<string | null>(null);

  // Set first ICB (alphabetical) as default when data loads
  useEffect(() => {
    if (!isLoading && allICBs.length > 0 && !selectedICB) {
      const sortedICBs = [...allICBs].sort((a, b) => a.name.localeCompare(b.name));
      setSelectedICB(sortedICBs[0].code);
    }
  }, [allICBs, isLoading, selectedICB]);

  const handleICBSelect = (icbCode: string) => {
    setSelectedICB(icbCode);
  };

  return (
    <ICBSelectionContext.Provider value={{ selectedICB, onICBSelect: handleICBSelect }}>
      <div className="flex flex-col h-full">
        <ICBSelectorHeader
          selectedICB={selectedICB}
          onICBSelect={handleICBSelect}
        />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </ICBSelectionContext.Provider>
  );
}