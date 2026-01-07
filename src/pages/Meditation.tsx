import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Sparkles, Play, Pause, Clock, Moon, Heart, 
  Wind, Leaf, Sun, Volume2
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLatestPrediction, seasonColors } from '@/hooks/useCycle';

interface MeditationData {
  id: string;
  titleKey: string;
  descriptionKey: string;
  duration: string;
  category: 'sleep' | 'stress' | 'energy' | 'cycle';
  audioUrl?: string;
  imageUrl: string;
}

const meditationsData: MeditationData[] = [
  // Sleep meditations
  {
    id: 'sleep-body-scan',
    titleKey: 'meditation.items.sleep_body_scan.title',
    descriptionKey: 'meditation.items.sleep_body_scan.description',
    duration: '15 min',
    category: 'sleep',
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=300&fit=crop',
  },
  {
    id: 'sleep-breath',
    titleKey: 'meditation.items.sleep_breath.title',
    descriptionKey: 'meditation.items.sleep_breath.description',
    duration: '10 min',
    category: 'sleep',
    imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop',
  },
  {
    id: 'sleep-gratitude',
    titleKey: 'meditation.items.sleep_gratitude.title',
    descriptionKey: 'meditation.items.sleep_gratitude.description',
    duration: '8 min',
    category: 'sleep',
    imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=300&fit=crop',
  },
  // Stress meditations
  {
    id: 'stress-reset',
    titleKey: 'meditation.items.stress_reset.title',
    descriptionKey: 'meditation.items.stress_reset.description',
    duration: '5 min',
    category: 'stress',
    imageUrl: 'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=400&h=300&fit=crop',
  },
  {
    id: 'stress-anxiety',
    titleKey: 'meditation.items.stress_anxiety.title',
    descriptionKey: 'meditation.items.stress_anxiety.description',
    duration: '12 min',
    category: 'stress',
    imageUrl: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=400&h=300&fit=crop',
  },
  // Energy meditations
  {
    id: 'energy-morning',
    titleKey: 'meditation.items.energy_morning.title',
    descriptionKey: 'meditation.items.energy_morning.description',
    duration: '7 min',
    category: 'energy',
    imageUrl: 'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=400&h=300&fit=crop',
  },
  {
    id: 'energy-afternoon',
    titleKey: 'meditation.items.energy_afternoon.title',
    descriptionKey: 'meditation.items.energy_afternoon.description',
    duration: '5 min',
    category: 'energy',
    imageUrl: 'https://images.unsplash.com/photo-1510894347713-fc3ed6fdf539?w=400&h=300&fit=crop',
  },
  // Cycle meditations
  {
    id: 'cycle-winter',
    titleKey: 'meditation.items.cycle_winter.title',
    descriptionKey: 'meditation.items.cycle_winter.description',
    duration: '10 min',
    category: 'cycle',
    imageUrl: 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=400&h=300&fit=crop',
  },
  {
    id: 'cycle-spring',
    titleKey: 'meditation.items.cycle_spring.title',
    descriptionKey: 'meditation.items.cycle_spring.description',
    duration: '10 min',
    category: 'cycle',
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=300&fit=crop',
  },
  {
    id: 'cycle-summer',
    titleKey: 'meditation.items.cycle_summer.title',
    descriptionKey: 'meditation.items.cycle_summer.description',
    duration: '10 min',
    category: 'cycle',
    imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop',
  },
  {
    id: 'cycle-autumn',
    titleKey: 'meditation.items.cycle_autumn.title',
    descriptionKey: 'meditation.items.cycle_autumn.description',
    duration: '12 min',
    category: 'cycle',
    imageUrl: 'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=400&h=300&fit=crop',
  },
];

const categoryIcons = {
  sleep: Moon,
  stress: Wind,
  energy: Sun,
  cycle: Leaf,
};

interface Meditation {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: 'sleep' | 'stress' | 'energy' | 'cycle';
  imageUrl: string;
}

export default function MeditationPage() {
  const { t } = useTranslation();
  const { data: prediction } = useLatestPrediction();
  const [selectedMeditation, setSelectedMeditation] = useState<Meditation | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const currentSeason = prediction?.current_season || 'onbekend';
  const colors = seasonColors[currentSeason] || seasonColors.onbekend;
  
  // Convert data to translated meditations
  const meditations: Meditation[] = meditationsData.map(m => ({
    id: m.id,
    title: t(m.titleKey),
    description: t(m.descriptionKey),
    duration: m.duration,
    category: m.category,
    imageUrl: m.imageUrl,
  }));
  
  // Get recommended meditation based on cycle
  const cycleRecommendation = meditations.find(m => {
    if (currentSeason === 'winter') return m.id === 'cycle-winter';
    if (currentSeason === 'lente') return m.id === 'cycle-spring';
    if (currentSeason === 'zomer') return m.id === 'cycle-summer';
    if (currentSeason === 'herfst') return m.id === 'cycle-autumn';
    return false;
  });

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
              {getMeditationsByCategory('sleep').map(meditation => (
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
              ))}
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
              {getMeditationsByCategory(category).map(meditation => (
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
              ))}
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
                      {t('meditation.startMeditation')}
                    </>
                  )}
                </Button>
              </div>
              
              {isPlaying && (
                <div className="mt-8 flex items-center gap-2 text-muted-foreground">
                  <Volume2 className="h-4 w-4" />
                  <span className="text-sm">{t('meditation.audioPlaying')}</span>
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
