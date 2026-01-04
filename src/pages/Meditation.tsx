import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, Play, Pause, Clock, Moon, Heart, 
  Wind, Leaf, Sun, Volume2
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLatestPrediction, seasonLabels, seasonColors } from '@/hooks/useCycle';

interface Meditation {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: 'sleep' | 'stress' | 'energy' | 'cycle';
  audioUrl?: string;
  imageUrl: string;
}

const meditations: Meditation[] = [
  // Sleep meditations
  {
    id: 'sleep-body-scan',
    title: 'Bodyscan voor de nacht',
    description: 'Een zachte reis door je lichaam om spanning los te laten en je voor te bereiden op een diepe slaap.',
    duration: '15 min',
    category: 'sleep',
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=300&fit=crop',
  },
  {
    id: 'sleep-breath',
    title: '4-7-8 Slaapademhaling',
    description: 'Gebruik deze krachtige ademhalingstechniek om je zenuwstelsel te kalmeren en sneller in slaap te vallen.',
    duration: '10 min',
    category: 'sleep',
    imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop',
  },
  {
    id: 'sleep-gratitude',
    title: 'Dankbaarheid voor de nacht',
    description: 'Sluit je dag af met een zachte reflectie op wat goed was. Laat zorgen los en omarm rust.',
    duration: '8 min',
    category: 'sleep',
    imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=300&fit=crop',
  },
  // Stress meditations
  {
    id: 'stress-reset',
    title: 'Snelle stress reset',
    description: 'Een korte maar krachtige meditatie om spanning los te laten en je focus terug te vinden.',
    duration: '5 min',
    category: 'stress',
    imageUrl: 'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=400&h=300&fit=crop',
  },
  {
    id: 'stress-anxiety',
    title: 'Kalmte bij onrust',
    description: 'Veel vrouwen ervaren periodes van onrust. Deze meditatie helpt je gronden en tot rust komen.',
    duration: '12 min',
    category: 'stress',
    imageUrl: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=400&h=300&fit=crop',
  },
  // Energy meditations
  {
    id: 'energy-morning',
    title: 'Energieke ochtend',
    description: 'Begin je dag met intentie en zachte energie. Perfect voor wanneer je je moe voelt bij het opstaan.',
    duration: '7 min',
    category: 'energy',
    imageUrl: 'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=400&h=300&fit=crop',
  },
  {
    id: 'energy-afternoon',
    title: 'Middagboost',
    description: 'Herlaad je energie halverwege de dag zonder cafeïne. Veel vrouwen merken dit helpt bij de dip na de lunch.',
    duration: '5 min',
    category: 'energy',
    imageUrl: 'https://images.unsplash.com/photo-1510894347713-fc3ed6fdf539?w=400&h=300&fit=crop',
  },
  // Cycle meditations
  {
    id: 'cycle-winter',
    title: 'Winter: Rust & Herstel',
    description: 'Voor de menstruatiefase. Omarm de behoefte aan rust en geef jezelf toestemming om te vertragen.',
    duration: '10 min',
    category: 'cycle',
    imageUrl: 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=400&h=300&fit=crop',
  },
  {
    id: 'cycle-spring',
    title: 'Lente: Nieuwe Energie',
    description: 'Voor de folliculaire fase. Verwelkom de groeiende energie en zet intenties voor de komende weken.',
    duration: '10 min',
    category: 'cycle',
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=300&fit=crop',
  },
  {
    id: 'cycle-summer',
    title: 'Zomer: Piek & Verbinding',
    description: 'Voor de ovulatiefase. Vier je kracht en verbind met je lichaam op dit hoogtepunt van energie.',
    duration: '10 min',
    category: 'cycle',
    imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop',
  },
  {
    id: 'cycle-autumn',
    title: 'Herfst: Reflectie & Loslaten',
    description: 'Voor de luteale fase. Een zachte meditatie om los te laten wat niet meer dient.',
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

const categoryLabels = {
  sleep: 'Slaap',
  stress: 'Stress',
  energy: 'Energie',
  cycle: 'Cyclus',
};

export default function MeditationPage() {
  const { data: prediction } = useLatestPrediction();
  const [selectedMeditation, setSelectedMeditation] = useState<Meditation | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const currentSeason = prediction?.current_season || 'onbekend';
  const colors = seasonColors[currentSeason] || seasonColors.onbekend;
  
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

  return (
    <AppLayout>
      <div className="space-y-6 bg-gradient-subtle min-h-screen -m-4 p-4 sm:-m-6 sm:p-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gradient">Meditatie</h1>
          <p className="text-muted-foreground">
            Ontspan, focus en verbind met je lichaam
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
                    Aanbevolen voor {seasonLabels[currentSeason]}
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
                      Start
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
              Slaapmeditaties
            </CardTitle>
            <CardDescription>
              Veel vrouwen merken dat meditatie helpt bij het inslapen
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
              Stress
            </TabsTrigger>
            <TabsTrigger value="energy" className="flex-1 data-[state=active]:bg-primary/20">
              <Sun className="h-4 w-4 mr-1" />
              Energie
            </TabsTrigger>
            <TabsTrigger value="cycle" className="flex-1 data-[state=active]:bg-primary/20">
              <Leaf className="h-4 w-4 mr-1" />
              Cyclus
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
                      Pauzeer
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      Start meditatie
                    </>
                  )}
                </Button>
              </div>
              
              {isPlaying && (
                <div className="mt-8 flex items-center gap-2 text-muted-foreground">
                  <Volume2 className="h-4 w-4" />
                  <span className="text-sm">Audio speelt af...</span>
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
                Sluiten
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
