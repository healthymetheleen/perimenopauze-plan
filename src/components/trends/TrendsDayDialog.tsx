import { useState } from 'react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { X, Snowflake, Leaf, Sun, Wind, Utensils, Moon, Activity } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { TrendDayData } from '@/hooks/useTrendsData';
import { seasonLabels } from '@/hooks/useCycle';

interface TrendsDayDialogProps {
  day: TrendDayData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const seasonIcons: Record<string, React.ReactNode> = {
  winter: <Snowflake className="h-4 w-4" />,
  lente: <Leaf className="h-4 w-4" />,
  zomer: <Sun className="h-4 w-4" />,
  herfst: <Wind className="h-4 w-4" />,
  onbekend: null,
};

export function TrendsDayDialog({ day, open, onOpenChange }: TrendsDayDialogProps) {
  if (!day) return null;

  const hasSymptoms = day.headache || day.anxiety || day.irritability || day.bloating || day.breastTender || day.hotFlashes;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {format(new Date(day.date), 'EEEE d MMMM', { locale: nl })}
            <Badge variant="outline" className="capitalize">
              {seasonIcons[day.season]}
              <span className="ml-1">{seasonLabels[day.season]}</span>
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Score */}
          {day.score !== null && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <span className="text-sm text-muted-foreground">Dagscore</span>
              <span className="text-2xl font-bold">{day.score}/10</span>
            </div>
          )}
          
          {/* Meals */}
          <div className="p-3 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Utensils className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Voeding</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Maaltijden:</span> {day.mealsCount}
              </div>
              <div>
                <span className="text-muted-foreground">kcal:</span> {Math.round(day.kcalTotal) || '-'}
              </div>
              <div>
                <span className="text-muted-foreground">Eiwit:</span> {Math.round(day.proteinG)}g
              </div>
              <div>
                <span className="text-muted-foreground">Vezels:</span> {Math.round(day.fiberG)}g
              </div>
            </div>
            {day.lastMealTime && (
              <p className="text-xs text-muted-foreground mt-2">
                Laatste maaltijd: {day.lastMealTime}
              </p>
            )}
          </div>
          
          {/* Sleep */}
          {day.sleepDurationMin !== null && (
            <div className="p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Moon className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-medium">Slaap</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Duur:</span> {(day.sleepDurationMin / 60).toFixed(1)} uur
                </div>
                {day.sleepQuality !== null && (
                  <div>
                    <span className="text-muted-foreground">Kwaliteit:</span> {day.sleepQuality}/10
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Symptoms */}
          {hasSymptoms && (
            <div className="p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-rose-500" />
                <span className="text-sm font-medium">Klachten</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {day.headache && <Badge variant="outline" className="text-xs">Hoofdpijn</Badge>}
                {day.anxiety && <Badge variant="outline" className="text-xs">Angst/onrust</Badge>}
                {day.irritability && <Badge variant="outline" className="text-xs">Prikkelbaar</Badge>}
                {day.bloating && <Badge variant="outline" className="text-xs">Opgeblazen</Badge>}
                {day.breastTender && <Badge variant="outline" className="text-xs">Gevoelige borsten</Badge>}
                {day.hotFlashes && <Badge variant="outline" className="text-xs">Opvliegers</Badge>}
              </div>
            </div>
          )}
          
          {/* Tip based on data */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-sm font-medium mb-1">💡 Tip</p>
            <p className="text-xs text-muted-foreground">
              {day.proteinG < 50 && day.mealsCount > 0 
                ? 'Je eiwit was laag vandaag. Probeer morgen meer eiwit bij ontbijt.'
                : day.lastMealTime && parseInt(day.lastMealTime.split(':')[0]) >= 21
                  ? 'Je at laat. Probeer morgen eerder te eten voor betere slaap.'
                  : day.score && day.score >= 7
                    ? 'Mooie dag! Wat hielp er vandaag?'
                    : 'Bekijk wat je kunt aanpassen voor een betere dag morgen.'
              }
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
