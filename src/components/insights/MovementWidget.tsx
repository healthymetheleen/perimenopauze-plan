import { Dumbbell, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLatestPrediction, seasonLabels } from '@/hooks/useCycle';
import { getWorkoutForSeason, type PhaseWorkout } from '@/hooks/useMovement';

const seasonToPhase: Record<string, string> = {
  winter: 'menstrual',
  lente: 'follicular',
  zomer: 'ovulatory',
  herfst: 'luteal',
};

const intensityLabels: Record<string, string> = {
  low: 'Licht',
  moderate: 'Matig',
  high: 'Intensief',
};

const intensityColors: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  moderate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  high: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
};

interface SeasonAdvice {
  feeling: string[];
  family: string[];
  work: string[];
}

const seasonAdvice: Record<string, SeasonAdvice> = {
  winter: {
    feeling: ['Rust en herstel', 'Wees mild voor jezelf', 'Accepteer lage energie'],
    family: ['Vraag om hulp', 'Delegeer taken', 'Neem tijd voor jezelf'],
    work: ['Routine taken', 'Geen grote beslissingen', 'Korte werkblokken'],
  },
  lente: {
    feeling: ['Energie stijgt', 'Nieuwe ideeën', 'Optimisme groeit'],
    family: ['Start nieuwe projecten', 'Plan uitjes', 'Sociale activiteiten'],
    work: ['Creatieve projecten', 'Brainstormen', 'Nieuwe initiatieven'],
  },
  zomer: {
    feeling: ['Piek energie', 'Zelfverzekerd', 'Communicatief'],
    family: ['Verbinding zoeken', 'Belangrijke gesprekken', 'Samen activiteiten'],
    work: ['Presentaties', 'Onderhandelingen', 'Netwerken'],
  },
  herfst: {
    feeling: ['Reflectie', 'Naar binnen keren', 'Gevoeliger'],
    family: ['Grenzen stellen', 'Rust inbouwen', 'Me-time'],
    work: ['Afronden', 'Organiseren', 'Evalueren'],
  },
};

export function MovementWidget() {
  const { data: prediction } = useLatestPrediction();
  const currentSeason = prediction?.current_season || 'onbekend';
  
  const workout = currentSeason !== 'onbekend' ? getWorkoutForSeason(currentSeason) : null;
  const advice = seasonAdvice[currentSeason];

  if (currentSeason === 'onbekend') {
    return null;
  }

  return (
    <Card className="glass-strong rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" />
          Beweging & Focus - {seasonLabels[currentSeason]}
          {workout && (
            <Badge className={intensityColors[workout.intensity]}>
              {intensityLabels[workout.intensity]}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {workout && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{workout.description}</p>
            
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Aanbevolen:</span>
              <span className="text-muted-foreground">{workout.recommendedMinutes} min</span>
            </div>

            {/* Top 2 exercises preview */}
            <div className="flex gap-2">
              {workout.exercises.slice(0, 2).map((exercise) => (
                <Badge key={exercise.id} variant="secondary" className="text-xs">
                  {exercise.nameDutch}
                </Badge>
              ))}
              {workout.exercises.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{workout.exercises.length - 2} meer
                </Badge>
              )}
            </div>
          </div>
        )}

        {advice && (
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/50">
            <div>
              <p className="text-xs font-medium text-primary mb-1">💜 Gevoel</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {advice.feeling.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-primary mb-1">👨‍👩‍👧 Gezin</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {advice.family.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-primary mb-1">💼 Werk</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {advice.work.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <Button variant="ghost" size="sm" asChild className="w-full">
          <Link to="/bewegen">
            Bekijk alle oefeningen
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
