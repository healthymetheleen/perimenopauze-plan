import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Sparkles, Play, Pause, Clock, Moon, 
  Wind, Leaf, Sun, Volume2
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useLatestPrediction, seasonColors } from '@/hooks/useCycle';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useMeditations, type Meditation as DbMeditation } from '@/hooks/useContent';
import { MeditationAudioGenerator } from '@/components/meditation/MeditationAudioGenerator';

interface Meditation {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: 'sleep' | 'stress' | 'energy' | 'cycle';
  imageUrl: string;
  audioUrl?: string | null;
  cycleSeason?: string | null;
}

// Map database meditation to UI meditation
function mapDbMeditation(m: DbMeditation): Meditation {
  return {
    id: m.id,
    title: m.title,
    description: m.description || '',
    duration: m.duration,
    category: m.category,
    imageUrl: m.image_url || 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=300&fit=crop',
    audioUrl: m.audio_url,
    cycleSeason: m.cycle_season,
  };
}

export default function MeditationPage() {
  const { t } = useTranslation();
  const { data: prediction } = useLatestPrediction();
  const { data: isAdmin } = useIsAdmin();
  const { data: dbMeditations, isLoading } = useMeditations();
  const [selectedMeditation, setSelectedMeditation] = useState<Meditation | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const currentSeason = prediction?.current_season || 'onbekend';
  const colors = seasonColors[currentSeason] || seasonColors.onbekend;
  
  // Convert database meditations to UI format
  const meditations: Meditation[] = (dbMeditations || []).map(mapDbMeditation);
  
  // Get recommended meditation based on cycle
  const seasonToDbSeason: Record<string, string> = {
    winter: 'winter',
    lente: 'lente',
    zomer: 'zomer',
    herfst: 'herfst',
  };
  
  const cycleRecommendation = meditations.find(m => 
    m.category === 'cycle' && m.cycleSeason === seasonToDbSeason[currentSeason]
  );

  const getMeditationsByCategory = (category: Meditation['category']) => 
    meditations.filter(m => m.category === category);

  const seasonLabel = t(`seasons.${currentSeason}`);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gradient">{t('meditation.title')}</h1>
          <p className="text-muted-foreground">
            {t('meditation.subtitle')}
          </p>
        </div>

        {/* Admin Audio Generator */}
        {isAdmin && <MeditationAudioGenerator />}

        {/* Cycle-based recommendation */}
        {cycleRecommendation && (
          <Card className={`glass-strong rounded-2xl overflow-hidden ${colors.bg}`}>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full ${colors.accent} text-white`}>
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <Badge variant="secondary" className={`mb-2 text-white ${colors.accent}`}>
                    {t('meditation.recommended_for', { season: seasonLabel })}
                  </Badge>
                  <h2 className="font-semibold text-lg">{cycleRecommendation.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {cycleRecommendation.description}
                  </p>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-sm flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {cycleRecommendation.duration}
                    </span>
                    <Button 
                      size="sm" 
                      className="btn-gradient"
                      onClick={() => setSelectedMeditation(cycleRecommendation)}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      {t('meditation.start')}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick access to sleep meditations */}
        <Card className="glass rounded-2xl bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Moon className="h-5 w-5 text-indigo-600" />
              {t('meditation.sleep_meditations')}
            </CardTitle>
            <CardDescription>
              {t('meditation.sleep_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {isLoading ? (
                <>
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </>
              ) : getMeditationsByCategory('sleep').length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {t('meditation.no_meditations')}
                </p>
              ) : (
                getMeditationsByCategory('sleep').map(meditation => (
                  <div 
                    key={meditation.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-card/50 cursor-pointer hover:bg-card transition-colors"
                    onClick={() => setSelectedMeditation(meditation)}
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <img 
                        src={meditation.imageUrl} 
                        alt={meditation.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{meditation.title}</h4>
                      <p className="text-xs text-muted-foreground">{meditation.duration}</p>
                    </div>
                    <Play className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category Tabs */}
        <Tabs defaultValue="stress" className="space-y-4">
          <TabsList className="w-full glass">
            <TabsTrigger value="stress" className="flex-1 data-[state=active]:bg-primary/20">
              <Wind className="h-4 w-4 mr-1" />
              {t('meditation.stress')}
            </TabsTrigger>
            <TabsTrigger value="energy" className="flex-1 data-[state=active]:bg-primary/20">
              <Sun className="h-4 w-4 mr-1" />
              {t('meditation.energy')}
            </TabsTrigger>
            <TabsTrigger value="cycle" className="flex-1 data-[state=active]:bg-primary/20">
              <Leaf className="h-4 w-4 mr-1" />
              {t('meditation.cycle')}
            </TabsTrigger>
          </TabsList>

          {(['stress', 'energy', 'cycle'] as const).map(category => (
            <TabsContent key={category} value={category} className="space-y-4">
              {isLoading ? (
                <>
                  <Skeleton className="h-32 w-full rounded-xl" />
                  <Skeleton className="h-32 w-full rounded-xl" />
                </>
              ) : getMeditationsByCategory(category).length === 0 ? (
                <Card className="glass rounded-xl p-8 text-center">
                  <p className="text-muted-foreground">{t('meditation.no_meditations')}</p>
                </Card>
              ) : (
                getMeditationsByCategory(category).map(meditation => (
                  <Card 
                    key={meditation.id}
                    className="glass rounded-xl overflow-hidden cursor-pointer hover:shadow-soft transition-all"
                    onClick={() => setSelectedMeditation(meditation)}
                  >
                    <div className="flex">
                      <div className="w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0">
                        <img 
                          src={meditation.imageUrl} 
                          alt={meditation.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <CardContent className="flex-1 p-3 sm:p-4">
                        <h4 className="font-medium text-sm sm:text-base">{meditation.title}</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                          {meditation.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {meditation.duration}
                          </Badge>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Meditation Player Dialog */}
        {selectedMeditation && (
          <div className="fixed inset-0 bg-background/95 z-50 flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-48 h-48 rounded-full overflow-hidden mb-8 shadow-2xl">
                <img 
                  src={selectedMeditation.imageUrl} 
                  alt={selectedMeditation.title}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <h2 className="text-2xl font-semibold mb-2">{selectedMeditation.title}</h2>
              <p className="text-muted-foreground mb-2">{selectedMeditation.duration}</p>
              <p className="text-sm text-muted-foreground max-w-md mb-8">
                {selectedMeditation.description}
              </p>
              
              <div className="flex items-center gap-4">
                <Button
                  size="lg"
                  variant={isPlaying ? 'outline' : 'default'}
                  className={isPlaying ? '' : 'btn-gradient'}
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-5 w-5 mr-2" />
                      {t('meditation.pause')}
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      {t('meditation.start_meditation')}
                    </>
                  )}
                </Button>
              </div>
              
              {isPlaying && (
                <div className="mt-8 flex items-center gap-2 text-muted-foreground">
                  <Volume2 className="h-4 w-4" />
                  <span className="text-sm">{t('meditation.audio_playing')}</span>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t">
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => {
                  setSelectedMeditation(null);
                  setIsPlaying(false);
                }}
              >
                {t('meditation.close')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
