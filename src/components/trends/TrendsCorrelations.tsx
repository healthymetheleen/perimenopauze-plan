import { Lightbulb, ArrowRight, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Correlation } from '@/hooks/useTrendsData';

interface TrendsCorrelationsProps {
  correlations: Correlation[];
  period: number;
}

const strengthColors: Record<string, string> = {
  laag: 'bg-muted text-muted-foreground',
  matig: 'bg-primary/10 text-primary',
  hoog: 'bg-primary/20 text-primary',
};

export function TrendsCorrelations({ correlations, period }: TrendsCorrelationsProps) {
  if (correlations.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Dit viel op
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <p>Nog niet genoeg data om verbanden te ontdekken.</p>
          <p className="text-sm mt-1">Log meer dagen voor inzichten.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          Dit viel op
        </CardTitle>
        <CardDescription>
          Gebaseerd op jouw laatste {period} dagen
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {correlations.map((correlation, index) => (
            <div 
              key={index}
              className="p-3 rounded-xl border bg-gradient-to-r from-card to-muted/30"
            >
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="font-medium text-sm">{correlation.trigger}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium text-sm text-primary">{correlation.effect}</span>
                <Badge className={`text-xs ${strengthColors[correlation.strength]}`}>
                  {correlation.strength}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {correlation.description}
              </p>
            </div>
          ))}
        </div>
        
        {/* Disclaimer */}
        <div className="mt-4 p-3 rounded-lg bg-muted/50 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Dit zijn patronen in jouw data, geen diagnose. Bespreek veranderingen met een zorgverlener.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
