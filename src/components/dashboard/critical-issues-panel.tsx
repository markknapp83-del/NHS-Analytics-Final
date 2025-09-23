'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NHSTrustData } from '@/../types/nhs-data';
import { identifyAllCriticalIssues, CriticalIssue } from '@/lib/critical-issues-identifier';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export function CriticalIssuesPanel({ trustData }: { trustData: NHSTrustData[] }) {
  const latestData = trustData[trustData.length - 1];

  const criticalIssues = useMemo(() => {
    return identifyAllCriticalIssues(latestData);
  }, [latestData]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          Critical Issues Alert
        </CardTitle>
        <CardDescription>
          Performance areas requiring immediate attention
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {criticalIssues.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-700">All Systems Operating Well</h3>
            <p className="text-sm text-slate-600">No critical performance issues identified</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {criticalIssues.map((issue, index) => (
              <CriticalIssueCard key={index} issue={issue} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CriticalIssueCard({ issue }: { issue: CriticalIssue }) {
  const severityConfig = {
    Critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'destructive' },
    High: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'secondary' },
    Moderate: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'outline' }
  };

  const config = severityConfig[issue.severity];

  return (
    <div className={`p-4 rounded-lg border ${config.bg} ${config.border}`}>
      <div className="flex items-start gap-3">
        <issue.icon className={`h-5 w-5 mt-0.5 ${config.text}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`font-semibold ${config.text} text-sm`}>{issue.title}</h4>
            <Badge variant={config.badge as any} className="text-xs">
              {issue.severity}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {issue.category}
            </Badge>
          </div>
          <p className="text-sm text-slate-600 mb-2">{issue.description}</p>
          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium">
              {issue.metric}: {typeof issue.value === 'number' && (issue.metric.includes('Rate') || issue.metric.includes('Compliance') || issue.metric.includes('Performance')) ? `${issue.value}%` : issue.value}
            </span>
            {issue.target && (
              <span className="text-slate-500">
                Target: {typeof issue.target === 'number' && (issue.metric.includes('Rate') || issue.metric.includes('Compliance') || issue.metric.includes('Performance')) ? `${issue.target}%` : issue.target}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}