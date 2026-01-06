import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { AnimatedSeasonBackground } from '@/components/layout/AnimatedSeasonBackground';
import { InstallPromptDialog } from '@/components/pwa/InstallPromptDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      toast({
        title: 'Inloggen mislukt',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      navigate('/dashboard');
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      toast({
        title: 'Registratie mislukt',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
    } else {
      toast({
        title: 'Account aangemaakt',
        description: 'Je kunt nu inloggen.',
      });
      setLoading(false);
      
      // Check if user hasn't skipped install prompt before
      const hasSkipped = sessionStorage.getItem('pwa-install-skipped');
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      
      if (!hasSkipped && !isStandalone) {
        // Show install prompt after successful signup
        setShowInstallPrompt(true);
      } else {
        navigate('/consent');
      }
    }
  };

  const handleInstallPromptClose = () => {
    setShowInstallPrompt(false);
    navigate('/consent');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <AnimatedSeasonBackground season="primary" />
      
      {/* PWA Install Prompt after registration */}
      <InstallPromptDialog 
        open={showInstallPrompt} 
        onOpenChange={handleInstallPromptClose}
        onInstalled={() => navigate('/consent')}
      />
      
      <Card className="w-full max-w-md rounded-2xl bg-card/80 backdrop-blur-md border-border/50">
        <CardHeader className="text-center space-y-3">
          <CardTitle className="text-2xl">Perimenopauze Plan</CardTitle>
          <CardDescription className="space-y-2">
            <span className="block">Speciaal ontwikkeld voor vrouwen in de perimenopauze</span>
            <span className="block text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full inline-block">
              ✨ AI-inzichten afgestemd op jouw cyclus & symptomen
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Inloggen</TabsTrigger>
              <TabsTrigger value="signup">Registreren</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-mailadres</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="jouw@email.nl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Wachtwoord</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Inloggen
                </Button>
                
                <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="w-full text-sm text-primary hover:underline mt-2"
                    >
                      Wachtwoord vergeten?
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Wachtwoord resetten</DialogTitle>
                      <DialogDescription>
                        Vul je e-mailadres in en we sturen je een link om je wachtwoord te resetten.
                      </DialogDescription>
                    </DialogHeader>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setResetLoading(true);
                        const { error } = await supabase.auth.resetPasswordForEmail(
                          resetEmail.trim(),
                          { redirectTo: `${window.location.origin}/login` }
                        );
                        setResetLoading(false);
                        if (error) {
                          toast({
                            title: 'Kon reset e-mail niet versturen',
                            description: error.message,
                            variant: 'destructive',
                          });
                        } else {
                          toast({
                            title: 'E-mail verstuurd',
                            description: 'Check je inbox voor de resetlink.',
                          });
                          setResetDialogOpen(false);
                          setResetEmail('');
                        }
                      }}
                      className="space-y-4"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="reset-email">E-mailadres</Label>
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="jouw@email.nl"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={resetLoading}>
                        {resetLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Verstuur resetlink
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-mailadres</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="jouw@email.nl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Wachtwoord</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimaal 6 tekens
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Account aanmaken
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <Link to="/pricing" className="text-sm text-primary hover:underline">
              Bekijk onze abonnementen
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}