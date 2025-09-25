'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, ExternalLink, Layers } from 'lucide-react';

interface ICBMapTabProps {
  onSwitchTab: (tab: string) => void;
}

export function ICBMapTab({ onSwitchTab }: ICBMapTabProps) {
  const plannedFeatures = [
    {
      title: 'Interactive Regional Map',
      description: 'Visual representation of all ICB boundaries across England with color-coded performance indicators',
      icon: <MapPin className="h-5 w-5" />,
      status: 'In Development'
    },
    {
      title: 'Geographic Performance Patterns',
      description: 'Identify regional trends and geographic clusters in healthcare performance metrics',
      icon: <Layers className="h-5 w-5" />,
      status: 'Planned'
    },
    {
      title: 'Click-to-Drill Analysis',
      description: 'Click any region on the map to instantly access detailed ICB analysis and trust breakdown',
      icon: <ExternalLink className="h-5 w-5" />,
      status: 'Planned'
    },
    {
      title: 'Regional Comparison Tools',
      description: 'Compare performance between neighboring ICBs and identify best practice opportunities',
      icon: <Calendar className="h-5 w-5" />,
      status: 'Future'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#005eb8]/5 to-[#78be20]/5"></div>
        <CardContent className="relative pt-12 pb-12">
          <div className="text-center space-y-6">
            {/* Large Map Placeholder */}
            <div className="mx-auto w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center">
              <MapPin className="h-16 w-16 text-[#005eb8]" />
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-slate-900">Regional Map Analysis</h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Interactive geographic visualization of ICB performance data across England
              </p>
              <Badge variant="secondary" className="text-sm">
                <Calendar className="h-3 w-3 mr-1" />
                Coming Soon - Q2 2025
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Preview */}
      <div className="grid gap-6 md:grid-cols-2">
        {plannedFeatures.map((feature, index) => (
          <Card key={index} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#005eb8]/10 rounded-lg">
                    {feature.icon}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <Badge
                      variant={
                        feature.status === 'In Development' ? 'default' :
                        feature.status === 'Planned' ? 'secondary' : 'outline'
                      }
                      className="mt-1 text-xs"
                    >
                      {feature.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 leading-relaxed">
                {feature.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Current Alternatives */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Available Now
          </CardTitle>
          <CardDescription>
            While we build the interactive map, explore ICB data through these powerful tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <Button
              variant="outline"
              className="h-16 justify-start"
              onClick={() => onSwitchTab('overview')}
            >
              <div className="text-left">
                <div className="font-semibold">ICB Overview</div>
                <div className="text-sm text-slate-600">Detailed analysis with trust breakdown</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-16 justify-start"
              onClick={() => onSwitchTab('rankings')}
            >
              <div className="text-left">
                <div className="font-semibold">Performance Rankings</div>
                <div className="text-sm text-slate-600">Compare all ICBs with sortable metrics</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Development Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Development Roadmap
          </CardTitle>
          <CardDescription>
            Expected delivery timeline for geographic analysis features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
              <div className="flex-1">
                <div className="font-semibold text-blue-900">Q1 2025 - Data Integration</div>
                <div className="text-sm text-blue-700">Integrate geographic boundary data with performance metrics</div>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="w-3 h-3 bg-amber-500 rounded-full flex-shrink-0"></div>
              <div className="flex-1">
                <div className="font-semibold text-amber-900">Q2 2025 - Interactive Map</div>
                <div className="text-sm text-amber-700">Launch interactive England map with ICB boundaries and performance visualization</div>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="w-3 h-3 bg-slate-400 rounded-full flex-shrink-0"></div>
              <div className="flex-1">
                <div className="font-semibold text-slate-700">Q3 2025 - Advanced Features</div>
                <div className="text-sm text-slate-600">Regional comparisons, geographic pattern analysis, and enhanced drill-down capabilities</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Section */}
      <Card className="bg-slate-50">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <h3 className="font-semibold text-slate-900">Have feedback or suggestions?</h3>
            <p className="text-sm text-slate-600">
              Help us prioritize features for the regional map analysis tool
            </p>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Share Feedback
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}