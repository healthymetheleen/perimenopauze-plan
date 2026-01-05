import { format, addDays, differenceInDays } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Sparkles, Snowflake, Leaf, Sun, Wind, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { seasonLabels } from '@/hooks/useCycle';
import { Link } from 'react-router-dom';

interface TrendsForecastProps {
  currentSeason: string;
  nextSeason: string;
  daysUntilNextSeason: number | null;
}

const seasonIcons: Record<string, React.ReactNode> = {
  winter: <Snowflake className="h-4 w-4" />,
  lente: <Leaf className="h-4 w-4" />,
  zomer: <Sun className="h-4 w-4" />,
  herfst: <Wind className="h-4 w-4" />,
  onbekend: <Sparkles className="h-4 w-4" />,
};

const seasonBadgeColors: Record<string, string> = {
  winter: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  lente: 'bg-green-500/10 text-green-700 dark:text-green-300',
  zomer: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  herfst: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  onbekend: 'bg-muted text-muted-foreground',
};

const seasonTips: Record<string, { feelings: string[]; actions: string[] }> = {
  winter: {
    feelings: [
      'Meer trek eind middag',
      'Sneller wakker worden',
      'Minder stressbuffer',
    ],
    actions: [
      'Ontbijt 25-35g eiwit',
      'Laatste maaltijd 3 uur voor slapen',
    ],
  },
  lente: {
    feelings: [
      'Energie komt terug',
      'Meer zin in plannen',
      'Stabielere stemming',
    ],
    actions: [
      'Langzaam opbouwen activiteiten',
      'IJzer en B-vitamines voor herstel',
    ],
  },
  zomer: {
    feelings: [
      'Meer drive en actie',
      'Sociale energie',
      'Risico overcommitment',
    ],
    actions: [
      'Benut energie voor grote taken',
      'Plan ook herstelmomenten',
    ],
  },
  herfst: {
    feelings: [
      'Meer behoefte aan ritme',
      'Sneller overprikkeld',
      'Trek neemt toe',
    ],
    actions: [
      'Terug naar vaste eettijden',
      'Vroegere avonden',
    ],
  },
  onbekend: {
    feelings: ['Log je cyclus voor gepersonaliseerde tips'],
    actions: ['Start met cyclustracking'],
  },
};

export function TrendsForecast({ currentSeason, nextSeason, daysUntilNextSeason }: TrendsForecastProps) {
  const tips = seasonTips[nextSeason] || seasonTips.onbekend;
  const showTransition = daysUntilNextSeason !== null && daysUntilNextSeason > 0 && daysUntilNextSeason <= 7;

  return (
    <Card className="rounded-2xl overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Blik vooruit
          {showTransition && (
            <Badge className={`ml-2 ${seasonBadgeColors[nextSeason]}`}>
              {seasonIcons[nextSeason]}
              <span className="ml-1">{seasonLabels[nextSeason]} over {daysUntilNextSeason} dag{daysUntilNextSeason !== 1 ? 'en' : ''}</span>
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Season pills */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className={`p-2 rounded-lg ${seasonBadgeColors[currentSeason]} bg-opacity-30`}>
            <p className="text-xs opacity-70 mb-0.5">Nu</p>
            <div className="flex items-center gap-1.5 font-medium text-sm">
              {seasonIcons[currentSeason]}
              {seasonLabels[currentSeason]}
            </div>
          </div>
          <div className={`p-2 rounded-lg ${seasonBadgeColors[nextSeason]} bg-opacity-30`}>
            <p className="text-xs opacity-70 mb-0.5">Daarna</p>
            <div className="flex items-center gap-1.5 font-medium text-sm">
              {seasonIcons[nextSeason]}
              {seasonLabels[nextSeason]}
            </div>
          </div>
        </div>
        
        {/* What you might notice */}
        <div className="mb-4">
          <p className="text-sm font-medium mb-2">Wat je kunt merken bij {seasonLabels[nextSeason]}</p>
          <ul className="space-y-1">
            {tips.feelings.map((feeling, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary">•</span>
                {feeling}
              </li>
            ))}
          </ul>
        </div>
        
        {/* Actions */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-sm font-medium mb-2">Plan voor de komende dagen</p>
          <ul className="space-y-1.5">
            {tips.actions.map((action, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="font-bold text-primary">{i + 1}</span>
                {action}
              </li>
            ))}
          </ul>
        </div>
        
        {/* Link to full forecast */}
        <div className="mt-4">
          <Link to="/dashboard">
            <Button variant="outline" className="w-full" size="sm">
              Bekijk volledige forecast
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
