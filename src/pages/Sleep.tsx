import { useState } from 'react';
import { format, differenceInMinutes, differenceInHours } from 'date-fns';
import { nl } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/hooks/use-toast';
import {
  useSleepSessions,
  useActiveSleepSession,
  useStartSleep,
  useEndSleep,
  useAddManualSleep,
  useDeleteSleep,
  calculateSleepStats,
  calculateSleepScore,
  generateSleepAdvice,
} from '@/hooks/useSleep';
import { useLatestPrediction, seasonLabels } from '@/hooks/useCycle';
import { SleepInsightCard } from '@/components/insights';
import { Moon, Sun, Clock, TrendingUp, Lightbulb, BedDouble, AlarmClock, Sparkles, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function SleepPage() {
  const { toast } = useToast();
  const [showQualityDialog, setShowQualityDialog] = useState(false);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [qualityScore, setQualityScore] = useState([7]);
  const [wakeFeeling, setWakeFeeling] = useState<string>('');
  const [nightInterruptions, setNightInterruptions] = useState<string>('');
  
  // Manual sleep entry state
  const [manualDate, setManualDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [manualSleepTime, setManualSleepTime] = useState('23:00');
  const [manualWakeTime, setManualWakeTime] = useState('07:00');
  const [manualQuality, setManualQuality] = useState([7]);

  const { data: sessions, isLoading } = useSleepSessions(7);
  const { data: activeSession, isLoading: activeLoading } = useActiveSleepSession();
  const { data: prediction } = useLatestPrediction();
  const startSleep = useStartSleep();
  const endSleep = useEndSleep();
  const addManualSleep = useAddManualSleep();
  const deleteSleep = useDeleteSleep();
  
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);

  const stats = sessions ? calculateSleepStats(sessions) : null;
  const sleepScore = sessions ? calculateSleepScore(sessions) : 0;
  const advice = sessions ? generateSleepAdvice(sessions) : [];
  const currentSeason = prediction?.current_season || 'onbekend';

  const handleStartSleep = async () => {
    try {
      await startSleep.mutateAsync();
      toast({ title: 'Welterusten! 🌙', description: 'Je slaapsessie is gestart.' });
    } catch {
      toast({ title: 'Kon slaapsessie niet starten', variant: 'destructive' });
    }
  };

  const handleWakeUp = () => {
    setShowQualityDialog(true);
  };

  const handleConfirmWakeUp = async () => {
    if (!activeSession) return;
    try {
      await endSleep.mutateAsync({
        sessionId: activeSession.id,
        qualityScore: qualityScore[0],
      });
      setShowQualityDialog(false);
      toast({ title: 'Goedemorgen! ☀️', description: 'Je slaapsessie is opgeslagen.' });
    } catch {
      toast({ title: 'Kon slaapsessie niet afsluiten', variant: 'destructive' });
    }
  };

  const handleManualSleep = async () => {
    try {
      // Parse sleep time (assume night before if wake time < sleep time)
      const sleepDate = new Date(manualDate);
      const wakeDate = new Date(manualDate);
      
      const [sleepHour, sleepMin] = manualSleepTime.split(':').map(Number);
      const [wakeHour, wakeMin] = manualWakeTime.split(':').map(Number);
      
      sleepDate.setHours(sleepHour, sleepMin, 0, 0);
      wakeDate.setHours(wakeHour, wakeMin, 0, 0);
      
      // If sleep time is after wake time, sleep was the night before
      if (sleepHour > wakeHour || (sleepHour === wakeHour && sleepMin > wakeMin)) {
        sleepDate.setDate(sleepDate.getDate() - 1);
      }
      
      await addManualSleep.mutateAsync({
        sleepStart: sleepDate.toISOString(),
        sleepEnd: wakeDate.toISOString(),
        qualityScore: manualQuality[0],
      });
      
      setShowManualDialog(false);
      toast({ title: 'Slaap opgeslagen! 🌙' });
    } catch (error) {
      toast({ 
        title: 'Kon slaap niet opslaan', 
        description: error instanceof Error ? error.message : 'Probeer het opnieuw',
        variant: 'destructive' 
      });
    }
  };

  const handleDeleteSleep = async () => {
    if (!deleteSessionId) return;
    try {
      await deleteSleep.mutateAsync(deleteSessionId);
      setDeleteSessionId(null);
      toast({ title: 'Slaapsessie verwijderd' });
    } catch {
      toast({ title: 'Kon sessie niet verwijderen', variant: 'destructive' });
    }
  };

  // Calculate current sleep duration if sleeping
  const currentSleepDuration = activeSession
    ? differenceInMinutes(new Date(), new Date(activeSession.sleep_start))
    : 0;
  const currentSleepHours = Math.floor(currentSleepDuration / 60);
  const currentSleepMins = currentSleepDuration % 60;

  if (isLoading || activeLoading) {
    return (
      <AppLayout>
        <LoadingState message="Slaapdata laden..." />
      </AppLayout>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    if (score >= 40) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <AppLayout>
      <div className="space-y-6 overflow-x-hidden">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Slaap</h1>
            <p className="text-muted-foreground">
              Volg je slaappatroon en verbeter je nachtrust
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/meditatie">
              <Sparkles className="h-4 w-4 mr-2" />
              Meditaties
            </Link>
          </Button>
        </div>

        {/* Sleep Score */}
        <Card className="rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/50 border-slate-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-600">Slaapscore</p>
                <p className="text-4xl font-bold text-indigo-900">{sleepScore}</p>
                <p className="text-xs text-indigo-600 mt-1">
                  Gebaseerd op afgelopen 7 dagen
                </p>
              </div>
              <div className={`p-4 rounded-full ${getScoreColor(sleepScore)}`}>
                <Moon className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sleep/Wake Button */}
        <Card className="rounded-2xl">
          <CardContent className="pt-6">
            {activeSession ? (
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 text-indigo-800">
                  <Moon className="h-4 w-4 animate-pulse" />
                  <span className="text-sm font-medium">Je slaapt nu</span>
                </div>
                <div className="text-3xl font-bold">
                  {currentSleepHours}u {currentSleepMins}m
                </div>
                <p className="text-sm text-muted-foreground">
                  Begonnen om {format(new Date(activeSession.sleep_start), 'HH:mm', { locale: nl })}
                </p>
                <Button
                  size="lg"
                  className="w-full bg-amber-500 hover:bg-amber-600"
                  onClick={handleWakeUp}
                  disabled={endSleep.isPending}
                >
                  <Sun className="h-5 w-5 mr-2" />
                  Ik ben wakker
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Druk op de knop als je gaat slapen
                </p>
                <Button
                  size="lg"
                  className="w-full bg-indigo-400/80 hover:bg-indigo-500/90 text-white"
                  onClick={handleStartSleep}
                  disabled={startSleep.isPending}
                >
                  <Moon className="h-5 w-5 mr-2" />
                  Ik ga slapen
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowManualDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Slaap achteraf invoeren
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Overview */}
        {stats && stats.totalSessions > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <Card className="rounded-2xl">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-purple-100">
                    <Clock className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Gem. slaapduur</p>
                    <p className="font-semibold">{stats.avgDurationHours.toFixed(1)} uur</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-indigo-100">
                    <TrendingUp className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Consistentie</p>
                    <p className="font-semibold">{Math.round(stats.consistency)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-100">
                    <BedDouble className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Gem. bedtijd</p>
                    <p className="font-semibold">{stats.avgBedtime || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-amber-100">
                    <AlarmClock className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Gem. wektijd</p>
                    <p className="font-semibold">{stats.avgWakeTime || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sleep History Chart */}
        {sessions && sessions.length > 0 && (
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Afgelopen 7 dagen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end justify-between gap-2 h-40">
                {Array.from({ length: 7 }, (_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() - (6 - i));
                  const dateStr = format(date, 'yyyy-MM-dd');
                  
                  const session = sessions.find(s => 
                    format(new Date(s.sleep_start), 'yyyy-MM-dd') === dateStr ||
                    (s.sleep_end && format(new Date(s.sleep_end), 'yyyy-MM-dd') === dateStr)
                  );
                  
                  const hours = session?.duration_minutes ? session.duration_minutes / 60 : 0;
                  const quality = session?.quality_score || 0;
                  const heightPercent = Math.min(100, (hours / 10) * 100);
                  const isToday = i === 6;
                  
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-muted rounded-t-lg relative" style={{ height: '100px' }}>
                        <div
                          className={`absolute bottom-0 w-full rounded-t-lg transition-all flex items-center justify-center ${
                            isToday ? 'bg-indigo-500' : 'bg-indigo-300'
                          }`}
                          style={{ height: `${heightPercent}%`, minHeight: hours > 0 ? '24px' : '0' }}
                        >
                          {quality > 0 && heightPercent > 20 && (
                            <span className={`text-xs font-bold ${isToday ? 'text-white' : 'text-indigo-900'}`}>
                              {quality}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(date, 'EEE', { locale: nl })}
                      </span>
                      {hours > 0 && (
                        <span className="text-xs font-medium">
                          {hours.toFixed(1)}u
                        </span>
                      )}
                      {quality > 0 && heightPercent <= 20 && (
                        <span className="text-[10px] text-muted-foreground">
                          ({quality})
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Session list with delete option */}
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Sessies beheren</p>
                <div className="space-y-2">
                  {sessions.slice(0, 5).map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="text-sm">
                        <span className="font-medium">
                          {format(new Date(session.sleep_start), 'd MMM', { locale: nl })}
                        </span>
                        <span className="text-muted-foreground ml-2">
                          {session.duration_minutes ? `${(session.duration_minutes / 60).toFixed(1)}u` : 'Bezig...'}
                        </span>
                        {session.quality_score && (
                          <span className="text-muted-foreground ml-2">
                            · Score {session.quality_score}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteSessionId(session.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Sleep Insight */}
        {stats && stats.totalSessions > 0 && (
          <SleepInsightCard
            avgDuration={`${stats.avgDurationHours.toFixed(1)} uur`}
            avgQuality={stats.avgQuality ? `${stats.avgQuality.toFixed(1)}/10` : 'onbekend'}
            consistency={`${Math.round(stats.consistency)}%`}
            interruptions={nightInterruptions || undefined}
            cycleSeason={currentSeason !== 'onbekend' ? seasonLabels[currentSeason] : undefined}
          />
        )}

        {/* Advice */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Slaaptips
            </CardTitle>
            <CardDescription>
              Persoonlijke adviezen op basis van je slaappatroon
            </CardDescription>
          </CardHeader>
          <CardContent>
            {advice.length > 0 ? (
              <ul className="space-y-3">
                {advice.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<Moon className="h-8 w-8" />}
                title="Begin met tracken"
                description="Log je slaap om persoonlijke adviezen te krijgen"
              />
            )}
          </CardContent>
        </Card>

        {/* General Sleep Hygiene */}
        <Card className="rounded-2xl bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Algemene slaaphygiëne</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Houd een vast slaapritme aan, ook in het weekend</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Vermijd schermen 1 uur voor het slapen (blauw licht remt melatonine)</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Zorg voor een koele slaapkamer (16-18°C)</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Vermijd cafeïne na 14:00 en alcohol dicht voor het slapen</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Maak je slaapkamer zo donker mogelijk</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Beweeg regelmatig, maar niet vlak voor het slapen</span>
              </li>
            </ul>
            <Button asChild variant="outline" className="w-full mt-4">
              <Link to="/meditatie">
                <Sparkles className="h-4 w-4 mr-2" />
                Bekijk slaapmeditaties
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quality Dialog - Extended with sleep experience questions */}
      <Dialog open={showQualityDialog} onOpenChange={setShowQualityDialog}>
        <DialogContent className="sm:max-w-md max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>Hoe heb je geslapen?</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Wake feeling */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Hoe voelde je je bij het wakker worden?</Label>
              <RadioGroup value={wakeFeeling} onValueChange={setWakeFeeling} className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="uitgerust" id="uitgerust" />
                  <Label htmlFor="uitgerust" className="text-sm">Uitgerust</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="oke" id="oke" />
                  <Label htmlFor="oke" className="text-sm">Oké</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="onrustig" id="onrustig" />
                  <Label htmlFor="onrustig" className="text-sm">Onrustig</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="uitgeput" id="uitgeput" />
                  <Label htmlFor="uitgeput" className="text-sm">Uitgeput</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Night interruptions */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Nacht onderbroken?</Label>
              <RadioGroup value={nightInterruptions} onValueChange={setNightInterruptions} className="grid grid-cols-3 gap-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nee" id="nee" />
                  <Label htmlFor="nee" className="text-sm">Nee</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1-2" id="1-2" />
                  <Label htmlFor="1-2" className="text-sm">1-2x</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="vaak" id="vaak" />
                  <Label htmlFor="vaak" className="text-sm">Vaak</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Quality score slider */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Algemene slaapkwaliteit</Label>
              <div className="text-center">
                <span className="text-4xl font-bold">{qualityScore[0]}</span>
                <span className="text-muted-foreground">/10</span>
              </div>
              <Slider
                value={qualityScore}
                onValueChange={setQualityScore}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Slecht</span>
                <span>Uitstekend</span>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleConfirmWakeUp}
              disabled={endSleep.isPending}
            >
              Bevestigen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Sleep Entry Dialog */}
      <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
        <DialogContent className="sm:max-w-md max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>Slaap achteraf invoeren</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Date */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Datum (wakker geworden)</Label>
              <Input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
              />
            </div>

            {/* Sleep time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Naar bed gegaan</Label>
                <Input
                  type="time"
                  value={manualSleepTime}
                  onChange={(e) => setManualSleepTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Wakker geworden</Label>
                <Input
                  type="time"
                  value={manualWakeTime}
                  onChange={(e) => setManualWakeTime(e.target.value)}
                />
              </div>
            </div>

            {/* Quality score slider */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Slaapkwaliteit</Label>
              <div className="text-center">
                <span className="text-4xl font-bold">{manualQuality[0]}</span>
                <span className="text-muted-foreground">/10</span>
              </div>
              <Slider
                value={manualQuality}
                onValueChange={setManualQuality}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Slecht</span>
                <span>Uitstekend</span>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleManualSleep}
              disabled={addManualSleep.isPending}
            >
              Opslaan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteSessionId} onOpenChange={(open) => !open && setDeleteSessionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slaapsessie verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze slaapsessie wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSleep} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
