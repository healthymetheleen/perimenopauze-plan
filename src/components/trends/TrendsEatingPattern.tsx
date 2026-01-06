import { Clock, Utensils, Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EatingPatternStats } from '@/hooks/useTrendsData';

interface TrendsEatingPatternProps {
  stats: EatingPatternStats;
}

export function TrendsEatingPattern({ stats }: TrendsEatingPatternProps) {
  const hasData = stats.avgMealsPerDay > 0;

  if (!hasData) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary" />
            Eetpatroon structuur
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <p>Nog geen maaltijddata beschikbaar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Timer className="h-5 w-5 text-primary" />
          Eetpatroon structuur
        </CardTitle>
        <CardDescription>
          Je ritme en timing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Utensils className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Eetmomenten/dag</span>
            </div>
            <p className="text-xl font-semibold">{stats.avgMealsPerDay}</p>
          </div>
          
          <div className="p-3 rounded-xl bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Eetvenster</span>
            </div>
            <p className="text-xl font-semibold">{stats.avgEatingWindowHours} uur</p>
          </div>
          
          <div className="p-3 rounded-xl bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Eerste maaltijd</span>
            </div>
            <p className="text-xl font-semibold">{stats.avgFirstMealTime || '-'}</p>
          </div>
          
          <div className="p-3 rounded-xl bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Laatste maaltijd</span>
            </div>
            <p className="text-xl font-semibold">{stats.avgLastMealTime || '-'}</p>
          </div>
        </div>
        
        {/* Rhythm score */}
        <div className="p-3 rounded-xl border bg-gradient-to-r from-teal-50/50 to-card dark:from-teal-950/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Ritme score</span>
            <Badge variant="outline" className={
              stats.rhythmScore >= 70 
                ? 'text-success border-success' 
                : stats.rhythmScore >= 50 
                  ? 'text-warning border-warning' 
                  : 'text-destructive border-destructive'
            }>
              {stats.rhythmScore >= 70 ? 'Consistent' : stats.rhythmScore >= 50 ? 'Wisselend' : 'Onregelmatig'}
            </Badge>
          </div>
          <Progress value={stats.rhythmScore} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            Hoe consistenter je eettijden, hoe stabieler je energie en bloedsuiker.
          </p>
        </div>
        
        {/* Snack ratio */}
        {stats.snackRatio > 0.3 && (
          <div className="mt-3 p-2 rounded-lg bg-warning/10 text-sm">
            <p className="text-muted-foreground">
              💡 {Math.round(stats.snackRatio * 100)}% van je eetmomenten zijn snacks. 
              Overweeg grotere hoofdmaaltijden voor minder grazen.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
