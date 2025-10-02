'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { getTopSuppliers, SupplierData } from '@/lib/queries/tender-queries';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Star } from 'lucide-react';

interface CompetitiveLandscapeChartProps {
  trustCode: string;
  userCompanyName?: string;
}

export function CompetitiveLandscapeChart({ trustCode, userCompanyName }: CompetitiveLandscapeChartProps) {
  const router = useRouter();
  const { data: suppliers, isLoading, error } = useQuery({
    queryKey: ['top-suppliers', trustCode],
    queryFn: () => getTopSuppliers(trustCode, 5),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) return <CompetitiveLandscapeSkeleton />;
  if (error) return <CompetitiveLandscapeError />;

  if (!suppliers || suppliers.length === 0) {
    return <EmptyCompetitiveState trustCode={trustCode} />;
  }

  const handleSupplierClick = (supplierName: string) => {
    // Navigate to competitor analysis page filtered to supplier
    router.push(`/competitor-analysis?supplier=${encodeURIComponent(supplierName)}`);
  };

  const handleViewAll = () => {
    router.push('/competitor-analysis');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Competitive Landscape</CardTitle>
        <CardDescription>
          Top suppliers by contract value over last 12 months
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={suppliers}
            layout="vertical"
            margin={{ left: 20, right: 20, top: 10, bottom: 10 }}
          >
            <XAxis
              type="number"
              tickFormatter={(value) => {
                if (value >= 1000000) return `£${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `£${(value / 1000).toFixed(0)}K`;
                return `£${value}`;
              }}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              tick={{ fontSize: 12 }}
              tickFormatter={(name) => {
                // Truncate long names
                return name.length > 20 ? name.substring(0, 20) + '...' : name;
              }}
            />
            <Tooltip content={<SupplierTooltip userCompanyName={userCompanyName} />} />
            <Bar
              dataKey="totalValue"
              radius={[0, 8, 8, 0]}
            >
              {suppliers.map((supplier, index) => (
                <Cell
                  key={supplier.name}
                  fill={supplier.name === userCompanyName ? '#10b981' : '#3b82f6'}
                  className="cursor-pointer transition-opacity duration-200 hover:opacity-80"
                  onClick={() => handleSupplierClick(supplier.name)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={handleViewAll}
        >
          View Full Competitor Analysis →
        </Button>
      </CardContent>
    </Card>
  );
}

function SupplierTooltip({ active, payload, userCompanyName }: any) {
  if (!active || !payload || !payload[0]) return null;

  const supplier: SupplierData = payload[0].payload;
  const isUserCompany = supplier.name === userCompanyName;

  const formatValue = (value: number | null) => {
    if (value === null || value === 0) return 'Not specified';
    if (value >= 1000000) return `£${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `£${(value / 1000).toFixed(0)}K`;
    return `£${value.toFixed(0)}`;
  };

  return (
    <div className="bg-white border-2 border-slate-200 rounded-lg shadow-lg p-4 max-w-md">
      <div className="flex items-center gap-2 mb-3">
        <h4 className="font-semibold text-sm text-slate-900">
          {supplier.name}
        </h4>
        {isUserCompany && <Star className="h-4 w-4 text-green-600 fill-green-600" />}
      </div>

      <div className="space-y-2 text-xs mb-3">
        <div className="flex justify-between gap-4">
          <span className="text-slate-600">Total Value:</span>
          <span className="font-medium text-slate-900">{formatValue(supplier.totalValue)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-600">Contracts:</span>
          <span className="font-medium text-slate-900">{supplier.contractCount}</span>
        </div>
      </div>

      {supplier.contracts.length > 0 && (
        <>
          <div className="border-t border-slate-100 pt-2 mb-2">
            <p className="text-xs font-semibold text-slate-700 mb-2">Recent Awards:</p>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {supplier.contracts.slice(0, 3).map((contract, idx) => (
              <div key={idx} className="text-xs">
                <p className="text-slate-900 font-medium line-clamp-1">{contract.title}</p>
                <div className="flex justify-between text-slate-600 mt-0.5">
                  <span>{formatValue(contract.value)}</span>
                  <span>
                    {contract.awardDate
                      ? new Date(contract.awardDate).toLocaleDateString('en-GB', {
                          month: 'short',
                          year: 'numeric'
                        })
                      : 'Date N/A'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-2 pt-2 border-t border-slate-100">
        <span className="text-xs text-blue-600 font-medium">Click to view supplier details</span>
      </div>
    </div>
  );
}

export function CompetitiveLandscapeSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-4/5" />
          <Skeleton className="h-12 w-3/5" />
          <Skeleton className="h-12 w-2/5" />
          <Skeleton className="h-12 w-1/5" />
        </div>
        <Skeleton className="h-10 w-full mt-4" />
      </CardContent>
    </Card>
  );
}

function CompetitiveLandscapeError() {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-red-600" />
          <CardTitle className="text-red-900">Error Loading Data</CardTitle>
        </div>
        <CardDescription className="text-red-700">
          Failed to load competitive landscape data. Please try again later.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function EmptyCompetitiveState({ trustCode }: { trustCode: string }) {
  const router = useRouter();

  const handleViewTenders = () => {
    router.push(`/tenders?trust=${trustCode}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Competitive Landscape</CardTitle>
        <CardDescription>Top suppliers by contract value</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="py-8 text-center space-y-4">
          <div className="text-slate-500 space-y-2">
            <p className="font-medium">No awarded contracts in database</p>
            <p className="text-sm">This trust may:</p>
            <ul className="text-sm space-y-1 text-left max-w-xs mx-auto">
              <li className="flex items-start gap-2">
                <span className="text-slate-400">•</span>
                <span>Use frameworks exclusively</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400">•</span>
                <span>Award contracts outside Contracts Finder</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400">•</span>
                <span>Have no recent awards in our database</span>
              </li>
            </ul>
          </div>
          <Button
            variant="outline"
            className="mt-4"
            onClick={handleViewTenders}
          >
            View All Tenders →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
