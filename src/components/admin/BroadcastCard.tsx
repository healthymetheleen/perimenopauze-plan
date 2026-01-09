import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Send, Loader2, Users, CreditCard, Clock, UserX, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type TargetAudience = 'all' | 'premium' | 'trial' | 'free';

const audienceOptions: { value: TargetAudience; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'all', label: 'Alle gebruikers', icon: <Users className="h-4 w-4" />, description: 'Iedereen ontvangt de email' },
  { value: 'premium', label: 'Premium', icon: <CreditCard className="h-4 w-4" />, description: 'Alleen actieve betalende leden' },
  { value: 'trial', label: 'Trial', icon: <Clock className="h-4 w-4" />, description: 'Gebruikers in hun proefperiode' },
  { value: 'free', label: 'Gratis', icon: <UserX className="h-4 w-4" />, description: 'Gebruikers zonder actief abonnement' },
];

// Brand colors from email template
const BRAND_COLORS = {
  primary: '#C4849B',
  secondary: '#85576D',
  background: '#FBF4F1',
  accent: '#7BA356',
  text: '#4A2D3A',
  muted: '#6B4D5A',
};

function EmailPreview({ subject, message }: { subject: string; message: string }) {
  return (
    <div className="border rounded-lg overflow-hidden bg-[#FBF4F1]">
      {/* Email header */}
      <div 
        className="p-6 text-center"
        style={{ background: `linear-gradient(135deg, ${BRAND_COLORS.background} 0%, #FCE7F3 100%)` }}
      >
        <div className="text-2xl font-semibold" style={{ color: BRAND_COLORS.secondary }}>
          Perimenopauze Plan
        </div>
      </div>
      
      {/* Email content */}
      <div className="bg-white p-6" style={{ color: BRAND_COLORS.text }}>
        <div className="mb-4 pb-2 border-b">
          <p className="text-xs text-muted-foreground">Onderwerp:</p>
          <p className="font-medium">{subject || '(geen onderwerp)'}</p>
        </div>
        
        <div className="whitespace-pre-wrap leading-relaxed">
          {message || '(geen bericht)'}
        </div>
        
        <p className="mt-6">Hartelijke groet,<br/>Team Perimenopauze Plan</p>
      </div>
      
      {/* Email footer */}
      <div 
        className="p-4 text-center text-xs"
        style={{ backgroundColor: BRAND_COLORS.background, color: BRAND_COLORS.muted }}
      >
        <p>Perimenopauze Plan App</p>
        <p>Speciaal voor vrouwen in de perimenopauze</p>
      </div>
    </div>
  );
}

export function BroadcastCard() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState<TargetAudience>('all');
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

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
    } catch (error: unknown) {
      console.error('Broadcast error:', error);
      toast.error(error instanceof Error ? error.message : 'Er ging iets mis bij het versturen');
    } finally {
      setIsSending(false);
    }
  };

  const canPreview = subject.trim() || message.trim();

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

        {/* Actions */}
        <div className="flex gap-2">
          {/* Preview Dialog */}
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                disabled={!canPreview}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Email Preview</DialogTitle>
              </DialogHeader>
              <EmailPreview subject={subject} message={message} />
            </DialogContent>
          </Dialog>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={isSending || !subject.trim() || !message.trim()}
            className="flex-1"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Versturen...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Verstuur
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
