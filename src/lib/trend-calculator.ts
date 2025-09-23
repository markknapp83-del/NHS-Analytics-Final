export interface TrendData {
  change: number;
  direction: 'up' | 'down' | 'stable';
  isPositive: boolean;
}

export function calculateTrend(
  current: number,
  previous: number,
  higherIsBetter: boolean = true
): TrendData | null {
  if (previous === null || previous === undefined || current === null || current === undefined) {
    return null;
  }

  if (previous === 0) {
    return null;
  }

  const change = ((current - previous) / previous) * 100;
  const direction = change > 0.1 ? 'up' : change < -0.1 ? 'down' : 'stable';

  // Determine if the trend is positive based on context
  const isPositive = higherIsBetter ? change > 0 : change < 0;

  return {
    change: Math.abs(change),
    direction,
    isPositive
  };
}

export function findPreviousMonthData<T extends Record<string, any>>(
  data: T[],
  currentIndex: number = -1
): T | null {
  if (!data.length) return null;

  const current = currentIndex === -1 ? data[data.length - 1] : data[currentIndex];
  if (!current) return null;

  // Find the previous month's data by looking backwards
  for (let i = (currentIndex === -1 ? data.length - 2 : currentIndex - 1); i >= 0; i--) {
    const record = data[i];
    if (record && record.period && current.period) {
      const currentDate = new Date(current.period);
      const recordDate = new Date(record.period);

      // Check if this is from the previous month
      const monthDiff = (currentDate.getFullYear() - recordDate.getFullYear()) * 12 +
                       (currentDate.getMonth() - recordDate.getMonth());

      if (monthDiff === 1) {
        return record;
      }
    }
  }

  return null;
}