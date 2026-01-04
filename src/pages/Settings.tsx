import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, Globe, Shield, Download, Trash2, Sparkles, 
  Info, Lock, Database, FileText 
} from 'lucide-react';
import { useConsent, CONSENT_VERSION } from '@/hooks/useConsent';

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
  const [timezone, setTimezone] = useState('Europe/Amsterdam');
  const [digestTime, setDigestTime] = useState('09:00');
  const [privacyMode, setPrivacyMode] = useState(false);
  const { consent, updateConsent } = useConsent();

  const handleAIToggle = (enabled: boolean) => {
    updateConsent.mutate({
      accepted_ai_processing: enabled,
    });
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

        {/* Preferences */}
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
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>AI-analyse inschakelen</Label>
                <p className="text-sm text-muted-foreground">
                  AI analyseert geanonimiseerde statistieken voor tips
                </p>
              </div>
              <Switch 
                checked={consent?.accepted_ai_processing ?? false} 
                onCheckedChange={handleAIToggle}
                disabled={updateConsent.isPending || !consent}
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
              <Link to="/pricing" className="text-primary hover:underline">
                Bekijk abonnement
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
