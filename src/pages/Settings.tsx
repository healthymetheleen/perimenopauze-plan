import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Clock, Globe, Shield, Download, Trash2, Sparkles,
  Info, Lock, Database, FileText, User, Crown, CreditCard, LogOut, Camera, Ruler, Scale
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useConsent, CONSENT_VERSION } from '@/hooks/useConsent';
import { useAuth } from '@/lib/auth';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useProfile, AGE_CATEGORY_OPTIONS, AgeCategory } from '@/hooks/useProfile';
import { CoachingPreferencesCard } from '@/components/settings/CoachingPreferencesCard';

const timezones = [
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
];

const digestTimes = [
  { value: '07:00', label: '07:00' },
  { value: '08:00', label: '08:00' },
  { value: '09:00', label: '09:00' },
  { value: '20:00', label: '20:00' },
  { value: '21:00', label: '21:00' },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const { data: entitlements } = useEntitlements();
  const { profile, updateProfile } = useProfile();
  const navigate = useNavigate();
  const [timezone, setTimezone] = useState('Europe/Amsterdam');
  const [digestTime, setDigestTime] = useState('09:00');
  const [privacyMode, setPrivacyMode] = useState(false);
  const { consent, updateConsent } = useConsent();
  
  // Profile editing states
  const [ageCategory, setAgeCategory] = useState<AgeCategory | ''>(profile?.age_category || '');
  const [heightCm, setHeightCm] = useState<string>(profile?.height_cm?.toString() || '');
  const [weightKg, setWeightKg] = useState<string>(profile?.weight_kg?.toString() || '');
  const [acceptedBodyData, setAcceptedBodyData] = useState(profile?.accepted_body_data || false);
  
  // Sync profile data when loaded
  useEffect(() => {
    if (profile) {
      setAgeCategory(profile.age_category || '');
      setHeightCm(profile.height_cm?.toString() || '');
      setWeightKg(profile.weight_kg?.toString() || '');
      setAcceptedBodyData(profile.accepted_body_data || false);
    }
  }, [profile]);
  
  const isPremium = entitlements?.plan === 'premium' && entitlements?.status === 'active';
  
  const handleSaveProfile = async () => {
    // Need consent if providing height/weight
    if ((heightCm || weightKg) && !acceptedBodyData) {
      toast({
        title: 'Toestemming vereist',
        description: 'Geef toestemming voor het gebruik van lengte/gewicht.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await updateProfile.mutateAsync({
        age_category: ageCategory as AgeCategory || null,
        height_cm: heightCm ? parseInt(heightCm, 10) : null,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        accepted_body_data: acceptedBodyData,
      });
      toast({ title: 'Profiel opgeslagen' });
    } catch {
      toast({
        title: 'Kon profiel niet opslaan',
        variant: 'destructive',
      });
    }
  };
  
  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleAIToggle = async (enabled: boolean) => {
    try {
      await updateConsent.mutateAsync({
        accepted_ai_processing: enabled,
      });
      toast({
        title: enabled ? 'AI-analyse ingeschakeld' : 'AI-analyse uitgeschakeld',
      });
    } catch {
      toast({
        title: 'Kon AI-instelling niet opslaan',
        variant: 'destructive',
      });
    }
  };

  const handlePhotoToggle = async (enabled: boolean) => {
    try {
      await updateConsent.mutateAsync({
        accepted_photo_analysis: enabled,
        photo_analysis_consent_at: enabled ? new Date().toISOString() : null,
      });
      toast({
        title: enabled ? 'Foto-analyse ingeschakeld' : 'Foto-analyse uitgeschakeld',
      });
    } catch {
      toast({
        title: 'Kon foto-instelling niet opslaan',
        variant: 'destructive',
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl bg-gradient-subtle min-h-screen -m-4 p-4 sm:-m-6 sm:p-6">
        <div>
          <h1 className="text-2xl font-semibold text-gradient">Instellingen</h1>
          <p className="text-muted-foreground">Beheer je voorkeuren en privacy</p>
        </div>

        {/* Transparency Info */}
        <Alert className="glass border-primary/20">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            <strong>Zo gebruiken we je gegevens:</strong> Deze app ondersteunt je met inzicht in 
            leefstijl en cyclus. We gebruiken je gegevens alleen om patronen zichtbaar te maken. 
            AI wordt ingezet als hulpmiddel en ontvangt geen herleidbare persoonsgegevens.
          </AlertDescription>
        </Alert>

        {/* Account & Subscription */}
        <Card className="glass rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Account & Abonnement
            </CardTitle>
            <CardDescription>Beheer je account en premium toegang</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>E-mailadres</Label>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label className="flex items-center gap-2">
                  {isPremium && <Crown className="h-4 w-4 text-primary" />}
                  Abonnement
                </Label>
                <p className="text-sm text-muted-foreground">
                  {isPremium ? 'Premium - volledige toegang' : 'Gratis - beperkte functies'}
                </p>
              </div>
              <Button variant="outline" asChild className="glass">
                <Link to="/subscription">
                  <CreditCard className="h-4 w-4 mr-2" />
                  {isPremium ? 'Beheren' : 'Upgraden'}
                </Link>
              </Button>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Accountbeheer</Label>
                <p className="text-sm text-muted-foreground">Data downloaden of account verwijderen</p>
              </div>
              <Button variant="outline" asChild className="glass">
                <Link to="/account">
                  <Shield className="h-4 w-4 mr-2" />
                  Beheren
                </Link>
              </Button>
            </div>
            
            <Separator />
            
            <Button variant="outline" onClick={handleSignOut} className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Uitloggen
            </Button>
          </CardContent>
        </Card>

        {/* Profile - Age, Height, Weight */}
        <Card className="glass rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Persoonlijk profiel
            </CardTitle>
            <CardDescription>Voor gepersonaliseerde voedings- en eiwitadviezen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Leeftijdscategorie</Label>
                <p className="text-sm text-muted-foreground">Voor leeftijd-specifieke adviezen</p>
              </div>
              <Select value={ageCategory} onValueChange={(v) => setAgeCategory(v as AgeCategory)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Kies..." />
                </SelectTrigger>
                <SelectContent>
                  {AGE_CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height" className="flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-muted-foreground" />
                  Lengte (cm)
                </Label>
                <Input
                  id="height"
                  type="number"
                  placeholder="170"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  min="100"
                  max="250"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight" className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-muted-foreground" />
                  Gewicht (kg)
                </Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  placeholder="65"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  min="30"
                  max="300"
                />
              </div>
            </div>

            {/* Body Data Consent */}
            {(heightCm || weightKg) && (
              <Alert className="bg-info/10 border-info/30">
                <Info className="h-4 w-4 text-info" />
                <AlertDescription className="text-sm">
                  <div className="flex items-start gap-3 mt-2">
                    <Checkbox
                      id="body-data-consent-settings"
                      checked={acceptedBodyData}
                      onCheckedChange={(c) => setAcceptedBodyData(!!c)}
                    />
                    <Label htmlFor="body-data-consent-settings" className="text-sm cursor-pointer leading-relaxed">
                      Ik geef toestemming om mijn lengte en gewicht te gebruiken voor 
                      persoonlijke calorie- en eiwit-aanbevelingen.
                    </Label>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleSaveProfile} 
              disabled={updateProfile.isPending}
              className="w-full"
            >
              Profiel opslaan
            </Button>
          </CardContent>
        </Card>
        <Card className="glass rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Voorkeuren
            </CardTitle>
            <CardDescription>Pas je dagelijkse overzicht en tijdzone aan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Tijdzone</Label>
                <p className="text-sm text-muted-foreground">Voor correcte tijden in je dagboek</p>
              </div>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="w-48">
                  <Globe className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Dagelijks overzicht</Label>
                <p className="text-sm text-muted-foreground">Ontvang een herinnering om te registreren</p>
              </div>
              <Select value={digestTime} onValueChange={setDigestTime}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {digestTimes.map((time) => (
                    <SelectItem key={time.value} value={time.value}>
                      {time.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* AI Settings */}
        <Card className="glass rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI-ondersteuning
            </CardTitle>
            <CardDescription>Beheer hoe AI je helpt met inzichten</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Photo analysis consent */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="photo-analysis" className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Foto-analyse voor macro's
                </Label>
                <p className="text-sm text-muted-foreground">
                  Foto's van maaltijden worden naar AI gestuurd voor automatische analyse
                </p>
              </div>
              <Switch
                id="photo-analysis"
                checked={consent?.accepted_photo_analysis ?? false}
                onCheckedChange={handlePhotoToggle}
                disabled={updateConsent.isPending}
              />
            </div>

            <Separator />

            {/* AI insights consent */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ai-analysis" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI-inzichten inschakelen
                </Label>
                <p className="text-sm text-muted-foreground">
                  AI analyseert geanonimiseerde statistieken voor tips
                </p>
              </div>
              <Switch
                id="ai-analysis"
                checked={consent?.accepted_ai_processing ?? false}
                onCheckedChange={handleAIToggle}
                disabled={updateConsent.isPending}
              />
            </div>

            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3">
              <p className="font-medium text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Wat doet AI in deze app?
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• <strong>Maaltijdanalyse:</strong> Herkent voedsel uit foto's en beschrijvingen, schat voedingswaarden</li>
                <li>• <strong>Dagelijkse reflectie:</strong> Beschrijft patronen in je dag zonder oordeel</li>
                <li>• <strong>Slaapinzicht:</strong> Verbindt slaapervaring met context als eten en cyclus</li>
                <li>• <strong>Cycluscoaching:</strong> Geeft fase-specifieke context en normalisatie</li>
                <li>• <strong>Patroonherkenning:</strong> Toont samenhang tussen voeding, slaap en klachten</li>
              </ul>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Lock className="h-4 w-4 text-success" />
                <span>AI ontvangt alleen geanonimiseerde features (geen namen/datums)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-success" />
                <span>AI beschrijft patronen, stelt geen diagnoses of geeft geen behandeladvies</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coaching Focus Preferences */}
        <CoachingPreferencesCard />

        {/* Privacy */}
        <Card className="glass rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Privacy & Data
            </CardTitle>
            <CardDescription>Beheer je gegevens en privacy instellingen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Privacy modus</Label>
                <p className="text-sm text-muted-foreground">Verberg gevoelige informatie op het scherm</p>
              </div>
              <Switch checked={privacyMode} onCheckedChange={setPrivacyMode} />
            </div>

            <Separator />

            {/* Data Retention Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Data retentie</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>• Eetdagboeken: 12 maanden</li>
                <li>• Cyclusdata & symptomen: 12 maanden</li>
                <li>• AI-logs: 6 maanden</li>
                <li>• Daarna automatisch verwijderd</li>
              </ul>
            </div>

            <Separator />

            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Jouw rechten (AVG/GDPR)</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Je kunt op elk moment je gegevens inzien, downloaden of verwijderen.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" asChild className="glass">
                  <Link to="/account">
                    <Download className="h-4 w-4 mr-2" />
                    Data downloaden
                  </Link>
                </Button>
                <Button variant="outline" asChild className="glass">
                  <Link to="/account">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Account verwijderen
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Consent Info */}
        <Card className="glass rounded-2xl bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Consent versie {CONSENT_VERSION}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
