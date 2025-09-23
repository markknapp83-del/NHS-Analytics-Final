import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BreachData } from '@/types/nhs-data';

export function DynamicBreachCards({
  data,
  specialtyName
}: {
  data: BreachData;
  specialtyName: string;
}) {
  const breachMetrics = [
    {
      title: "52+ Week Breaches",
      value: data.week52Plus,
      description: "Critical breach threshold",
      color: "border-red-500 bg-red-50",
      textColor: "text-red-700",
      valueColor: "text-red-600"
    },
    {
      title: "65+ Week Breaches",
      value: data.week65Plus,
      description: "Severe delay threshold",
      color: "border-orange-500 bg-orange-50",
      textColor: "text-orange-700",
      valueColor: "text-orange-600"
    },
    {
      title: "78+ Week Breaches",
      value: data.week78Plus,
      description: "Extreme delay threshold",
      color: "border-red-600 bg-red-100",
      textColor: "text-red-800",
      valueColor: "text-red-700"
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header showing which specialty is selected */}
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">Breach Analysis:</h3>
        <Badge variant="outline" className="text-sm">
          {specialtyName}
        </Badge>
        {specialtyName !== "All Specialties" && (
          <p className="text-sm text-slate-600 ml-2">
            Click different specialties below to update this analysis
          </p>
        )}
      </div>

      {/* Breach Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {breachMetrics.map((metric) => (
          <Card key={metric.title} className={metric.color}>
            <CardContent className="p-6">
              <div className="text-center">
                <h4 className={`text-sm font-medium ${metric.textColor} mb-2`}>
                  {metric.title}
                </h4>
                <p className={`text-3xl font-bold ${metric.valueColor}`}>
                  {metric.value?.toLocaleString() || '0'}
                </p>
                <p className={`text-xs ${metric.textColor} mt-2`}>
                  {metric.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}