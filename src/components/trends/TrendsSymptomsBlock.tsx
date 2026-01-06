import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TopSymptom } from '@/hooks/useTrendsData';
import { seasonLabels } from '@/hooks/useCycle';

interface TrendsSymptomsBlockProps {
  symptoms: TopSymptom[];
  period: number;
}

const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
  if (trend === 'up') return <TrendingUp className="h-3 w-3 text-destructive" />;
  if (trend === 'down') return <TrendingDown className="h-3 w-3 text-success" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
};

export function TrendsSymptomsBlock({ symptoms, period }: TrendsSymptomsBlockProps) {
  if (symptoms.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Top 5 klachten
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <p>Geen klachten gelogd in deze periode.</p>
          <p className="text-sm mt-1">Log je symptomen voor inzicht in patronen.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Top 5 klachten
        </CardTitle>
        <CardDescription>
          Meest voorkomend in de laatste {period} dagen
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {symptoms.map((symptom) => (
            <div 
              key={symptom.code}
              className="p-3 rounded-xl border bg-card"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{symptom.label}</span>
                  <TrendIcon trend={symptom.trend} />
                </div>
                <Badge variant="outline" className="text-xs capitalize">
                  {seasonLabels[symptom.peakSeason] || symptom.peakSeason}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <Progress 
                  value={symptom.avgIntensity * 10} 
                  className="h-2 flex-1"
                />
                <span className="text-xs text-muted-foreground w-12">
                  {symptom.count}x
                </span>
              </div>
            </div>
          ))}
        </div>
        
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Tap op een klacht voor meer context (coming soon)
        </p>
      </CardContent>
    </Card>
  );
}
