import { useState, useEffect } from 'react';

// Module-level state to share trust selection across components
let globalTrustState = 'R0A'; // Default to Manchester University NHS Foundation Trust (has community health data)
const listeners = new Set<(trust: string) => void>();

const setGlobalTrust = (trust: string) => {
  console.log('[useTrustSelection] Setting global trust to:', trust);
  globalTrustState = trust;
  listeners.forEach(listener => listener(trust));
};

export function useTrustSelection() {
  const [selectedTrust, setSelectedTrust] = useState<string>(globalTrustState);

  useEffect(() => {
    const listener = (trust: string) => {
      setSelectedTrust(trust);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const updateTrust = (trust: string) => {
    setGlobalTrust(trust);
  };

  return [selectedTrust, updateTrust] as const;
}