import { useState, useEffect } from 'react';
import { loadNHSData, getTrustData, getAllTrusts, getLatestDataForTrust } from '@/lib/csv-data';
import { TrustSummary, NHSTrustData } from '@/types/nhs-data';

export function useNHSData() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trusts, setTrusts] = useState<TrustSummary[]>([]);

  useEffect(() => {
    loadNHSData()
      .then(() => {
        setTrusts(getAllTrusts());
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load NHS data');
        setIsLoading(false);
      });
  }, []);

  return {
    trusts,
    isLoading,
    error,
    getTrustData,
    getAllTrusts,
    getLatestDataForTrust
  };
}