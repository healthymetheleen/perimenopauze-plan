import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useCyclePreferences, useStartCycle } from '@/hooks/useCycle';
import { Loader2, ChevronRight, ChevronLeft, Flower2 } from 'lucide-react';

interface OnboardingData {
  hormonal_contraception: boolean;
  has_iud: boolean;
  breastfeeding: boolean;
  recently_pregnant: boolean;
  perimenopause: boolean;
  pcos: boolean;
  last_period_start: string;
  avg_cycle_length: string;
  avg_period_length: string;
  show_fertile_days: boolean;
  reminders_enabled: boolean;
}

export default function CycleOnboardingPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { upsertPreferences } = useCyclePreferences();
  const startCycle = useStartCycle();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    hormonal_contraception: false,
    has_iud: false,
    breastfeeding: false,
    recently_pregnant: false,
    perimenopause: false,
    pcos: false,
    last_period_start: '',
    avg_cycle_length: '',
    avg_period_length: '',
    show_fertile_days: false,
    reminders_enabled: true,
  });

  const totalSteps = 4;

  const handleSubmit = async () => {
    try {
      await upsertPreferences.mutateAsync({
        hormonal_contraception: data.hormonal_contraception,
        has_iud: data.has_iud,
        breastfeeding: data.breastfeeding,
        recently_pregnant: data.recently_pregnant,
        perimenopause: data.perimenopause,
        pcos: data.pcos,
        avg_cycle_length: data.avg_cycle_length ? parseInt(data.avg_cycle_length) : null,
        avg_period_length: data.avg_period_length ? parseInt(data.avg_period_length) : null,
        show_fertile_days: data.show_fertile_days,
        reminders_enabled: data.reminders_enabled,
        onboarding_completed: true,
      });

      if (data.last_period_start) {
        await startCycle.mutateAsync(data.last_period_start);
      }

      toast({ title: 'Instellingen opgeslagen' });
      navigate('/cycle');
    } catch {
      toast({ title: 'Er ging iets mis', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-lg rounded-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit mb-4">
            <Flower2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Cyclustracking instellen</CardTitle>
          <CardDescription className="text-base">
            Stap {step} van {totalSteps}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Welke situatie is op jou van toepassing? Dit helpt ons betere voorspellingen te maken.
              </p>
              <div className="space-y-3">
                {[
                  { key: 'hormonal_contraception', label: 'Ik gebruik hormonale anticonceptie (pil, pleister, ring)' },
                  { key: 'has_iud', label: 'Ik heb een spiraal (hormoon of koper)' },
                  { key: 'breastfeeding', label: 'Ik geef borstvoeding' },
                  { key: 'recently_pregnant', label: 'Ik ben recent zwanger geweest (<1 jaar)' },
                  { key: 'perimenopause', label: 'Ik zit (mogelijk) in de perimenopauze' },
                  { key: 'pcos', label: 'Ik heb PCOS' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center space-x-3">
                    <Checkbox
                      id={key}
                      checked={data[key as keyof OnboardingData] as boolean}
                      onCheckedChange={(checked) =>
                        setData({ ...data, [key]: !!checked })
                      }
                    />
                    <Label htmlFor={key} className="text-sm cursor-pointer">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Als je het weet, vul je laatste menstruatiedag en gemiddelden in. Niet zeker? Laat leeg.
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lastPeriod">Eerste dag van laatste menstruatie</Label>
                  <Input
                    id="lastPeriod"
                    type="date"
                    value={data.last_period_start}
                    onChange={(e) => setData({ ...data, last_period_start: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Hiermee kunnen we meteen je huidige cyclus inschatten.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cycleLength">Gemiddelde cycluslengte (dagen)</Label>
                  <Input
                    id="cycleLength"
                    type="number"
                    placeholder="bijv. 28"
                    min="21"
                    max="60"
                    value={data.avg_cycle_length}
                    onChange={(e) => setData({ ...data, avg_cycle_length: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Gemiddeld is 24-35 dagen. Bij perimenopauze vaak wisselend.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="periodLength">Gemiddelde duur menstruatie (dagen)</Label>
                  <Input
                    id="periodLength"
                    type="number"
                    placeholder="bijv. 5"
                    min="1"
                    max="14"
                    value={data.avg_period_length}
                    onChange={(e) => setData({ ...data, avg_period_length: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Wil je vruchtbare dagen zien in de app?
              </p>
              <RadioGroup
                value={data.show_fertile_days ? 'yes' : 'no'}
                onValueChange={(v) => setData({ ...data, show_fertile_days: v === 'yes' })}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3 p-3 rounded-lg border">
                  <RadioGroupItem value="yes" id="fertile-yes" />
                  <Label htmlFor="fertile-yes" className="flex-1 cursor-pointer">
                    Ja, toon vruchtbare dagen
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border">
                  <RadioGroupItem value="no" id="fertile-no" />
                  <Label htmlFor="fertile-no" className="flex-1 cursor-pointer">
                    Nee, liever niet
                  </Label>
                </div>
              </RadioGroup>
              {data.show_fertile_days && (
                <div className="p-3 rounded-lg bg-amber-50 text-amber-800 text-sm">
                  <strong>Let op:</strong> Voorspellingen van vruchtbare dagen zijn schattingen en niet bedoeld als anticonceptie. Overleg bij kinderwens of het vermijden van zwangerschap met een professional.
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Laatste stap: wil je herinneringen ontvangen?
              </p>
              <div className="flex items-center space-x-3 p-3 rounded-lg border">
                <Checkbox
                  id="reminders"
                  checked={data.reminders_enabled}
                  onCheckedChange={(checked) =>
                    setData({ ...data, reminders_enabled: !!checked })
                  }
                />
                <Label htmlFor="reminders" className="flex-1 cursor-pointer">
                  Ja, stuur me herinneringen om te loggen
                </Label>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <p className="text-sm font-medium">Goed om te weten</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Voorspellingen zijn schattingen op basis van jouw data</li>
                  <li>• Bij perimenopauze zijn cycli vaak onvoorspelbaar</li>
                  <li>• Hoe meer je logt, hoe beter de voorspellingen worden</li>
                </ul>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Terug
              </Button>
            )}
            {step < totalSteps ? (
              <Button onClick={() => setStep(step + 1)} className="flex-1">
                Volgende
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                className="flex-1"
                disabled={upsertPreferences.isPending}
              >
                {upsertPreferences.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Start cyclustracking
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
