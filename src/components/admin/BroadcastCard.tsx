import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Loader2, Users, CreditCard, Clock, UserX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type TargetAudience = 'all' | 'premium' | 'trial' | 'free';

const audienceOptions: { value: TargetAudience; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'all', label: 'Alle gebruikers', icon: <Users className="h-4 w-4" />, description: 'Iedereen ontvangt de email' },
  { value: 'premium', label: 'Premium', icon: <CreditCard className="h-4 w-4" />, description: 'Alleen actieve betalende leden' },
  { value: 'trial', label: 'Trial', icon: <Clock className="h-4 w-4" />, description: 'Gebruikers in hun proefperiode' },
  { value: 'free', label: 'Gratis', icon: <UserX className="h-4 w-4" />, description: 'Gebruikers zonder actief abonnement' },
];

export function BroadcastCard() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState<TargetAudience>('all');
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ sent: number; failed: number; total: number } | null>(null);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error('Vul zowel onderwerp als bericht in');
      return;
    }

    const confirmed = window.confirm(
      `Weet je zeker dat je deze email wilt versturen naar ${audienceOptions.find(a => a.value === targetAudience)?.label}?`
    );

    if (!confirmed) return;

    setIsSending(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('admin-broadcast', {
        body: { subject, message, targetAudience },
      });

      if (error) throw error;

      setLastResult({ sent: data.sent, failed: data.failed, total: data.total });
      toast.success(`Email verstuurd naar ${data.sent} van ${data.total} gebruikers`);
      
      // Clear form on success
      setSubject('');
      setMessage('');
    } catch (error: any) {
      console.error('Broadcast error:', error);
      toast.error(error.message || 'Er ging iets mis bij het versturen');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="glass rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Send className="h-5 w-5 text-primary" />
          Broadcast Email
        </CardTitle>
        <CardDescription>
          Stuur een email naar alle of specifieke gebruikers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Audience Selector */}
        <div className="space-y-2">
          <Label>Doelgroep</Label>
          <Select value={targetAudience} onValueChange={(v) => setTargetAudience(v as TargetAudience)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {audienceOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    {option.icon}
                    <span>{option.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {option.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Subject */}
        <div className="space-y-2">
          <Label htmlFor="broadcast-subject">Onderwerp</Label>
          <Input
            id="broadcast-subject"
            placeholder="Onderwerp van de email..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={isSending}
          />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <Label htmlFor="broadcast-message">Bericht</Label>
          <Textarea
            id="broadcast-message"
            placeholder="Schrijf je bericht hier..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isSending}
            rows={6}
          />
          <p className="text-xs text-muted-foreground">
            Het bericht wordt opgemaakt in de standaard email template.
          </p>
        </div>

        {/* Last Result */}
        {lastResult && (
          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <p className="font-medium">Laatste verzending:</p>
            <p className="text-muted-foreground">
              ✓ {lastResult.sent} verstuurd
              {lastResult.failed > 0 && ` · ✗ ${lastResult.failed} mislukt`}
              {' '} (totaal: {lastResult.total})
            </p>
          </div>
        )}

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={isSending || !subject.trim() || !message.trim()}
          className="w-full"
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Versturen...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Verstuur naar {audienceOptions.find(a => a.value === targetAudience)?.label}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
