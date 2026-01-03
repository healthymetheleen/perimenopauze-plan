import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Clock, Globe, Shield, Download, Trash2 } from 'lucide-react';

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

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Instellingen</h1>
          <p className="text-muted-foreground">Beheer je voorkeuren en privacy</p>
        </div>

        {/* Preferences */}
        <Card className="rounded-2xl">
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

        {/* Privacy */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Privacy
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

            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Gegevens beheren</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Exporteer of verwijder je gegevens via je accountpagina
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" asChild>
                  <Link to="/account">
                    <Download className="h-4 w-4 mr-2" />
                    Exporteren
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/account">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Verwijderen
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="rounded-2xl bg-muted/30">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Je gegevens worden veilig opgeslagen en nooit gedeeld met derden.
              <br />
              <Link to="/pricing" className="text-primary hover:underline">
                Bekijk je abonnement
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
