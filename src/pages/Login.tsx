import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { AnimatedSeasonBackground } from '@/components/layout/AnimatedSeasonBackground';
import { InstallPromptDialog } from '@/components/pwa/InstallPromptDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

function isNetworkErrorMessage(message?: string) {
  if (!message) return false;
  return (
    message.includes('Failed to fetch') ||
    message.toLowerCase().includes('networkerror') ||
    message.toLowerCase().includes('fetch')
  );
}

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  const networkErrorToast = useMemo(
    () => ({
      title: t('auth.error_network_title'),
      description: t('auth.error_network_desc'),
      variant: 'destructive' as const,
    }),
    [t]
  );

  const getErrorDescription = (message?: string) => {
    if (isNetworkErrorMessage(message)) return t('auth.error_network_desc');
    return message || t('auth.error_unknown_desc');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        toast({
          title: t('auth.login_failed_title'),
          description: getErrorDescription(error.message),
          variant: 'destructive',
        });
        return;
      }

      navigate('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast(isNetworkErrorMessage(message) ? networkErrorToast : {
        title: t('auth.login_failed_title'),
        description: getErrorDescription(message),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        toast({
          title: t('auth.signup_failed_title'),
          description: getErrorDescription(error.message),
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: t('auth.signup_success_title'),
        description: t('auth.signup_success_desc'),
      });

      const hasSkipped = sessionStorage.getItem('pwa-install-skipped');
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

      if (!hasSkipped && !isStandalone) {
        setShowInstallPrompt(true);
      } else {
        navigate('/consent');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast(isNetworkErrorMessage(message) ? networkErrorToast : {
        title: t('auth.signup_failed_title'),
        description: getErrorDescription(message),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInstallPromptClose = () => {
    setShowInstallPrompt(false);
    navigate('/consent');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <AnimatedSeasonBackground season="primary" />

      <InstallPromptDialog
        open={showInstallPrompt}
        onOpenChange={handleInstallPromptClose}
        onInstalled={() => navigate('/consent')}
      />

      <Card className="w-full max-w-md rounded-2xl bg-card/80 backdrop-blur-md border-border/50">
        <CardHeader className="text-center space-y-3">
          <CardTitle className="text-2xl">{t('layout.app_name')}</CardTitle>
          <CardDescription className="space-y-2">
            <span className="block">{t('auth.hero_description')}</span>
            <span className="block text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full inline-block">
              {t('auth.hero_badge')}
            </span>
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">{t('auth.tab_login')}</TabsTrigger>
              <TabsTrigger value="signup">{t('auth.tab_signup')}</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">{t('auth.email_label')}</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder={t('auth.email_placeholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">{t('auth.password_label')}</Label>
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
                  {t('common.login')}
                </Button>

                <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                  <DialogTrigger asChild>
                    <button type="button" className="w-full text-sm text-primary hover:underline mt-2">
                      {t('auth.forgot_password')}
                    </button>
                  </DialogTrigger>

                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>{t('auth.reset_title')}</DialogTitle>
                      <DialogDescription>{t('auth.reset_description')}</DialogDescription>
                    </DialogHeader>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setResetLoading(true);

                        try {
                          const { error } = await supabase.auth.resetPasswordForEmail(
                            resetEmail.trim(),
                            { redirectTo: `${window.location.origin}/login` }
                          );

                          if (error) {
                            toast({
                              title: t('auth.reset_failed_title'),
                              description: getErrorDescription(error.message),
                              variant: 'destructive',
                            });
                            return;
                          }

                          toast({
                            title: t('auth.reset_email_sent_title'),
                            description: t('auth.reset_email_sent_desc'),
                          });

                          setResetDialogOpen(false);
                          setResetEmail('');
                        } catch (err) {
                          const message = err instanceof Error ? err.message : String(err);
                          toast(isNetworkErrorMessage(message) ? networkErrorToast : {
                            title: t('auth.reset_failed_title'),
                            description: getErrorDescription(message),
                            variant: 'destructive',
                          });
                        } finally {
                          setResetLoading(false);
                        }
                      }}
                      className="space-y-4"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="reset-email">{t('auth.email_label')}</Label>
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder={t('auth.email_placeholder')}
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          required
                        />
                      </div>

                      <Button type="submit" className="w-full" disabled={resetLoading}>
                        {resetLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {t('auth.reset_send')}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t('auth.email_label')}</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder={t('auth.email_placeholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t('auth.password_label')}</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">{t('auth.password_hint')}</p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t('common.signup')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <Link to="/pricing" className="text-sm text-primary hover:underline">
              {t('auth.view_plans_link')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
