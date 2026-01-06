import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  Info, Lock, Database, FileText, User, Crown, CreditCard, LogOut, Camera, Ruler, Scale, Settings2, BarChart3, Mail, Lightbulb, Languages
} from 'lucide-react';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { ContactFormDialog } from '@/components/contact/ContactFormDialog';
import { FeedbackFormDialog } from '@/components/contact/FeedbackFormDialog';
import { useToast } from '@/hooks/use-toast';
import { useConsent, CONSENT_VERSION } from '@/hooks/useConsent';
import { useAuth } from '@/lib/auth';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useProfile, AGE_CATEGORY_OPTIONS, AgeCategory } from '@/hooks/useProfile';
import { useIsAdmin } from '@/hooks/useIsAdmin';
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
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const { data: entitlements } = useEntitlements();
  const { data: isAdmin } = useIsAdmin();
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
        title: t('settings.consent_required'),
        description: t('settings.consent_required_desc'),
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
      toast({ title: t('settings.profile_saved') });
    } catch {
      toast({
        title: t('settings.could_not_save_profile'),
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
        title: enabled ? t('settings.ai_enabled') : t('settings.ai_disabled'),
      });
    } catch {
      toast({
        title: t('settings.could_not_save_ai'),
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
        title: enabled ? t('settings.photo_enabled') : t('settings.photo_disabled'),
      });
    } catch {
      toast({
        title: t('settings.could_not_save_photo'),
        variant: 'destructive',
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-semibold text-gradient">{t('settings.title')}</h1>
          <p className="text-muted-foreground">{t('settings.subtitle')}</p>
        </div>

        {/* Transparency Info */}
        <Alert className="glass border-primary/20">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            {t('settings.transparency_info')}
          </AlertDescription>
        </Alert>

        {/* Admin-only: Coaching Settings */}
        {isAdmin && (
          <Card className="glass rounded-2xl border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                Admin: Coaching & AI Instellingen
              </CardTitle>
              <CardDescription>Beheer de stem en stijl van alle AI-adviezen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Coaching Configuratie</Label>
                  <p className="text-sm text-muted-foreground">Stel targets, voedingsregels en coachingstijl in</p>
                </div>
                <Button variant="default" asChild>
                  <Link to="/voeding-beheer">
                    <Settings2 className="h-4 w-4 mr-2" />
                    Configureren
                  </Link>
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Maandelijkse Analyse</Label>
                  <p className="text-sm text-muted-foreground">Uitgebreide inzichten over cyclus & voeding</p>
                </div>
                <Button variant="outline" asChild className="glass">
                  <Link to="/analyse">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Bekijken
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Account & Subscription */}
        <Card className="glass rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {t('settings.account_subscription')}
            </CardTitle>
            <CardDescription>{t('settings.account_subscription_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('settings.email')}</Label>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label className="flex items-center gap-2">
                  {isPremium && <Crown className="h-4 w-4 text-primary" />}
                  {t('settings.current_subscription')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {isPremium 
                    ? t('settings.premium_access')
                    : entitlements?.trial_days_remaining && entitlements.trial_days_remaining > 0
                      ? t('settings.trial_remaining', { 
                          days: entitlements.trial_days_remaining, 
                          dayWord: entitlements.trial_days_remaining === 1 ? t('settings.day') : t('settings.days') 
                        })
                      : t('settings.free_limited')}
                </p>
              </div>
              <Button variant="outline" asChild className="glass">
                <Link to="/subscription">
                  <CreditCard className="h-4 w-4 mr-2" />
                  {isPremium ? t('common.manage') : t('common.upgrade')}
                </Link>
              </Button>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('settings.account_management')}</Label>
                <p className="text-sm text-muted-foreground">{t('settings.account_management_desc')}</p>
              </div>
              <Button variant="outline" asChild className="glass">
                <Link to="/account">
                  <Shield className="h-4 w-4 mr-2" />
                  {t('common.manage')}
                </Link>
              </Button>
            </div>
            
            <Separator />
            
            <Button variant="outline" onClick={handleSignOut} className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              {t('common.logout')}
            </Button>
          </CardContent>
        </Card>

        {/* Profile - Age, Height, Weight */}
        <Card className="glass rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {t('settings.personal_profile')}
            </CardTitle>
            <CardDescription>{t('settings.personal_profile_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('settings.age_category')}</Label>
                <p className="text-sm text-muted-foreground">{t('settings.age_specific_advice')}</p>
              </div>
              <Select value={ageCategory} onValueChange={(v) => setAgeCategory(v as AgeCategory)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder={t('settings.choose')} />
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
                  {t('settings.height')}
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
                  {t('settings.weight')}
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
                      {t('settings.body_data_consent')}
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
              {t('settings.save_profile')}
            </Button>
          </CardContent>
        </Card>
        <Card className="glass rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              {t('settings.preferences')}
            </CardTitle>
            <CardDescription>{t('settings.preferences_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Language */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Languages className="h-4 w-4" />
                  {t('settings.language')}
                </Label>
                <p className="text-sm text-muted-foreground">{t('settings.language_desc')}</p>
              </div>
              <LanguageSwitcher />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('settings.timezone')}</Label>
                <p className="text-sm text-muted-foreground">{t('settings.timezone_desc')}</p>
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
                <Label>{t('settings.daily_overview')}</Label>
                <p className="text-sm text-muted-foreground">{t('settings.daily_overview_desc')}</p>
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
              {t('settings.ai_support')}
            </CardTitle>
            <CardDescription>{t('settings.ai_support_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Photo analysis consent */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="photo-analysis" className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  {t('settings.photo_analysis')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('settings.photo_analysis_desc')}
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

        {/* Contact & Feedback */}
        <Card className="glass rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Contact & Feedback
            </CardTitle>
            <CardDescription>Neem contact op of deel je ideeën</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <ContactFormDialog 
                trigger={
                  <Button variant="outline" className="flex-1 gap-2">
                    <Mail className="h-4 w-4" />
                    Stel een vraag
                  </Button>
                }
              />
              <FeedbackFormDialog 
                trigger={
                  <Button variant="outline" className="flex-1 gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Verbeteridee delen
                  </Button>
                }
              />
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
