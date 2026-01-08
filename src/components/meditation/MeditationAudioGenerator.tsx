import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Mic, Play, Pause, Download, Loader2, 
  Volume2, Wand2, RefreshCw 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const VOICE_OPTIONS = [
  { id: 'laura', name: 'Laura Peeters', description: 'Nederlands, rustig en enthousiast' },
  { id: 'lily', name: 'Lily', description: 'Zacht en vriendelijk' },
  { id: 'alice', name: 'Alice', description: 'Warm en helder' },
  { id: 'sarah', name: 'Sarah', description: 'Kalm en geruststellend' },
];

const SAMPLE_TEXTS = {
  short: `Welkom bij deze korte ademhalingsoefening.

Sluit je ogen en neem een diepe ademhaling door je neus.
Voel hoe je buik uitzet.
Adem langzaam uit door je mond.

Herhaal dit drie keer in je eigen tempo.`,

  meditation: `Welkom bij deze rustgevende meditatie.

Zoek een comfortabele houding en sluit zachtjes je ogen.
Neem een moment om aan te komen in dit moment.

Laat je aandacht gaan naar je ademhaling.
Je hoeft niets te veranderen, observeer alleen.
De in-ademhaling... en de uit-ademhaling.

Met elke uitademing laat je de spanning in je lichaam los.
Je schouders ontspannen.
Je kaken worden zachter.
Je handen rusten zwaar.

Je bent hier, in dit moment, precies zoals je bent.
Dat is genoeg.`,
};

export function MeditationAudioGenerator() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [text, setText] = useState('');
  const [voice, setVoice] = useState('laura');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const estimatedDuration = Math.ceil(text.split(/\s+/).length / 2.5); // ~150 words per minute for slow meditation
  const characterCount = text.length;

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast({
        title: 'Tekst vereist',
        description: 'Voer de meditatie-tekst in om audio te genereren.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setAudioUrl(null);
    setAudioBlob(null);

    try {
      // Use fetch instead of supabase.functions.invoke for binary response
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-meditation-audio`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({ text, voice }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Genereren mislukt');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      setAudioBlob(blob);
      setAudioUrl(url);

      toast({
        title: 'Audio gegenereerd!',
        description: `${Math.round(blob.size / 1024)} KB audio klaar om te beluisteren.`,
      });
    } catch (error) {
      console.error('Generate error:', error);
      toast({
        title: 'Genereren mislukt',
        description: error instanceof Error ? error.message : 'Onbekende fout',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlay = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleDownload = () => {
    if (!audioBlob) return;
    
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meditatie-${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const loadSampleText = (type: 'short' | 'meditation') => {
    setText(SAMPLE_TEXTS[type]);
  };

  return (
    <Card className="glass rounded-2xl border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              Meditatie Audio Generator
            </CardTitle>
            <CardDescription>
              Genereer Nederlandse meditatie-audio met ElevenLabs AI
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-primary/10">
            Admin
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Voice Selection */}
        <div className="space-y-2">
          <Label>Stem</Label>
          <Select value={voice} onValueChange={setVoice}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VOICE_OPTIONS.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{v.name}</span>
                    <span className="text-xs text-muted-foreground">{v.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Text Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Meditatie Tekst</Label>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => loadSampleText('short')}
              >
                <Wand2 className="h-3 w-3 mr-1" />
                Kort voorbeeld
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => loadSampleText('meditation')}
              >
                <Wand2 className="h-3 w-3 mr-1" />
                Meditatie voorbeeld
              </Button>
            </div>
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Voer hier de tekst voor de meditatie in...

Tip: Gebruik lege regels voor pauzes in de audio."
            className="min-h-[200px] font-mono text-sm"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{characterCount.toLocaleString()} karakters</span>
            <span>~{estimatedDuration} seconden (geschat)</span>
          </div>
        </div>

        {/* Generate Button */}
        <Button 
          onClick={handleGenerate} 
          disabled={isGenerating || !text.trim()}
          className="w-full btn-gradient"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Genereren...
            </>
          ) : (
            <>
              <Mic className="h-4 w-4 mr-2" />
              Genereer Audio
            </>
          )}
        </Button>

        {/* Audio Player */}
        {audioUrl && (
          <div className="p-4 rounded-xl bg-muted/50 space-y-3">
            <audio 
              ref={audioRef} 
              src={audioUrl} 
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant={isPlaying ? 'secondary' : 'default'}
                  size="sm"
                  onClick={handlePlay}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-4 w-4 mr-1" />
                      Pauzeer
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-1" />
                      Afspelen
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                Opnieuw
              </Button>
            </div>

            {isPlaying && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Volume2 className="h-4 w-4 animate-pulse" />
                <span>Audio speelt af...</span>
              </div>
            )}

            {audioBlob && (
              <p className="text-xs text-muted-foreground">
                Bestandsgrootte: {Math.round(audioBlob.size / 1024)} KB
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
