"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TrustSelectionContextType {
  selectedTrust: string;
  setSelectedTrust: (trustCode: string) => void;
}

const TrustSelectionContext = createContext<TrustSelectionContextType | undefined>(undefined);

interface TrustSelectionProviderProps {
  children: ReactNode;
}

export function TrustSelectionProvider({ children }: TrustSelectionProviderProps) {
  const [selectedTrust, setSelectedTrust] = useState<string>('RGT'); // Default to Cambridge

  return (
    <TrustSelectionContext.Provider value={{ selectedTrust, setSelectedTrust }}>
      {children}
    </TrustSelectionContext.Provider>
  );
}

export function useTrustSelection() {
  const context = useContext(TrustSelectionContext);
  if (context === undefined) {
    throw new Error('useTrustSelection must be used within a TrustSelectionProvider');
  }
  return context;
}