'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, TrendingUp, Users, ArrowRight } from 'lucide-react';
import { useActiveAccounts } from '@/hooks/use-active-accounts';
import { getStageBadgeClass, getStageLabel } from '@/lib/crm-stage-utils';
import Link from 'next/link';

function ContactStatusBadge({ status, lastContactDate }: { status: string; lastContactDate: string | null }) {
  const variants: Record<string, { variant: string; label: string }> = {
    active: { variant: 'default', label: 'Active (<14d)' },
    at_risk: { variant: 'secondary', label: 'At Risk (14-30d)' },
    neglected: { variant: 'destructive', label: 'Neglected (30-60d)' },
    critical: { variant: 'destructive', label: 'Critical (60+d)' },
    never_contacted: { variant: 'outline', label: 'Never Contacted' },
  };

  const config = variants[status] || variants.never_contacted;

  return <Badge variant={config.variant as any}>{config.label}</Badge>;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toString();
}

interface AccountCardProps {
  account: any;
}

function AccountCard({ account }: AccountCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-lg">{account.trust_name}</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {account.trust_code} • {account.icb_name}
            </p>
          </div>

          <Button variant="ghost" size="sm" asChild>
            <Link href={`/crm/trusts/${account.trust_code}`}>
              View Details
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-4 mb-4">
          {account.account_stage && (
            <Badge variant="outline">
              {account.account_stage.replace('_', ' ')}
            </Badge>
          )}
          <ContactStatusBadge
            status={account.contact_status}
            lastContactDate={account.last_contact_date}
          />
        </div>

        {/* My Opportunities */}
        {account.my_opportunities.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">
                My Opportunities ({account.my_opportunities.length})
              </span>
            </div>
            <div className="space-y-2 ml-6">
              {account.my_opportunities.map((opp: any) => (
                <div key={opp.id} className="text-sm flex items-center gap-2">
                  <Link
                    href={`/crm/opportunities/${opp.id}`}
                    className="text-blue-600 hover:underline flex-1"
                  >
                    {opp.opportunity_name}
                  </Link>
                  <Badge className={getStageBadgeClass(opp.stage)}>
                    {getStageLabel(opp.stage)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other Opportunities */}
        {account.other_opportunities.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Other Opportunities ({account.other_opportunities.length})
              </span>
            </div>
            <div className="space-y-2 ml-6">
              {account.other_opportunities.map((opp: any) => (
                <div key={opp.id} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="flex-1">
                    {opp.opportunity_name}
                    <span className="ml-2 text-xs">({opp.owner_name})</span>
                  </span>
                  <Badge className={getStageBadgeClass(opp.stage)}>
                    {getStageLabel(opp.stage)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pipeline Value */}
        <div className="flex items-center justify-between pt-4 border-t">
          <span className="text-sm font-medium">My Pipeline Value</span>
          <span className="text-lg font-bold text-blue-600">
            £{formatCurrency(account.my_pipeline_value)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function ActiveAccountsSection() {
  const { accounts, isLoading } = useActiveAccounts();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Accounts I'm Working On</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Accounts I'm Working On</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/crm/trusts">
              View All Trusts
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {accounts.map((account) => (
          <AccountCard key={account.trust_code} account={account} />
        ))}

        {accounts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No active accounts yet</p>
            <p className="text-sm">Create an opportunity to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
