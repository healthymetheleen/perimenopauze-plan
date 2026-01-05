import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile, AGE_CATEGORY_OPTIONS, AgeCategory } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Ruler, Scale, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingPage } from '@/components/ui/loading-state';

export default function ProfileOnboardingPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, isLoading, hasCompletedProfile, updateProfile } = useProfile();

  const [ageCategory, setAgeCategory] = useState<AgeCategory | ''>('');
  const [heightCm, setHeightCm] = useState<string>('');
  const [weightKg, setWeightKg] = useState<string>('');
  const [acceptedBodyData, setAcceptedBodyData] = useState(false);

  useEffect(() => {
    if (hasCompletedProfile) {
      navigate('/dashboard', { replace: true });
    }
  }, [hasCompletedProfile, navigate]);

  useEffect(() => {
    if (profile) {
      setAgeCategory(profile.age_category ?? '');
      setHeightCm(profile.height_cm != null ? String(profile.height_cm) : '');
      setWeightKg(profile.weight_kg != null ? String(profile.weight_kg) : '');
      setAcceptedBodyData(profile.accepted_body_data ?? false);
    }
  }, [profile]);

  if (isLoading) {
    return <LoadingPage />;
  }

  const canSubmit = ageCategory !== '' && (
    // If providing height/weight, need consent
    (!heightCm && !weightKg) || acceptedBodyData
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ageCategory) {
      toast({
        title: 'Leeftijd verplicht',
        description: 'Selecteer je leeftijdscategorie om door te gaan.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateProfile.mutateAsync({
        age_category: ageCategory as AgeCategory,
        height_cm: heightCm ? parseInt(heightCm, 10) : null,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        accepted_body_data: acceptedBodyData,
      });

      toast({
        title: 'Profiel opgeslagen',
        description: 'Je kunt nu beginnen met je dagboek.',
      });
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: 'Er ging iets mis',
        description: 'Probeer het opnieuw.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle px-4 py-8">
      <Card className="w-full max-w-md glass-strong rounded-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <User className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl text-gradient">Vertel ons over jezelf</CardTitle>
          <CardDescription className="text-base">
            Voor persoonlijke adviezen over voeding en eiwit-targets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Age Category - Required */}
            <div className="space-y-2">
              <Label htmlFor="age-category" className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Leeftijdscategorie <span className="text-destructive">*</span>
              </Label>
              <Select value={ageCategory} onValueChange={(v) => setAgeCategory(v as AgeCategory)}>
                <SelectTrigger id="age-category">
                  <SelectValue placeholder="Selecteer je leeftijd" />
                </SelectTrigger>
                <SelectContent>
                  {AGE_CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Deze app is ontworpen voor vrouwen vanaf 30 jaar
              </p>
            </div>

            {/* Height - Optional */}
            <div className="space-y-2">
              <Label htmlFor="height" className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-muted-foreground" />
                Lengte (optioneel)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="height"
                  type="number"
                  placeholder="170"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  min="100"
                  max="250"
                  className="flex-1"
                />
                <span className="text-muted-foreground">cm</span>
              </div>
            </div>

            {/* Weight - Optional */}
            <div className="space-y-2">
              <Label htmlFor="weight" className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-muted-foreground" />
                Gewicht (optioneel)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  placeholder="65"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  min="30"
                  max="300"
                  className="flex-1"
                />
                <span className="text-muted-foreground">kg</span>
              </div>
            </div>

            {/* Body Data Consent - Only if height or weight provided */}
            {(heightCm || weightKg) && (
              <Alert className="bg-info/10 border-info/30">
                <Info className="h-4 w-4 text-info" />
                <AlertDescription className="text-sm">
                  <div className="flex items-start gap-3 mt-2">
                    <Checkbox
                      id="body-data-consent"
                      checked={acceptedBodyData}
                      onCheckedChange={(c) => setAcceptedBodyData(!!c)}
                    />
                    <Label htmlFor="body-data-consent" className="text-sm cursor-pointer leading-relaxed">
                      Ik geef toestemming om mijn lengte en gewicht te gebruiken voor 
                      persoonlijke calorie- en eiwit-aanbevelingen. Deze gegevens worden 
                      veilig opgeslagen en niet gedeeld met derden.
                    </Label>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Alert className="bg-muted/50">
              <AlertDescription className="text-xs text-muted-foreground">
                <strong>Privacy:</strong> Lengte en gewicht zijn optioneel. Als je ze invult, 
                berekenen we persoonlijke eiwit- en calorie-adviezen. Zonder deze gegevens 
                gebruiken we algemene richtlijnen voor jouw leeftijdscategorie.
              </AlertDescription>
            </Alert>

            <Button
              type="submit"
              disabled={!canSubmit || updateProfile.isPending}
              className="w-full btn-gradient"
              size="lg"
            >
              {updateProfile.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Doorgaan
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              * Verplicht veld · Je kunt dit later wijzigen in Instellingen
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
