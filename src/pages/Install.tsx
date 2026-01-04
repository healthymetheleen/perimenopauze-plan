import { useState, useEffect } from 'react';
import { Download, Check, Smartphone, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass-strong rounded-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 rounded-2xl overflow-hidden mb-4 shadow-lg">
            <img src="/pwa-192x192.png" alt="Perimenopauze Plan" className="w-full h-full object-cover" />
          </div>
          <CardTitle className="text-2xl text-gradient">Perimenopauze Plan</CardTitle>
          <CardDescription>
            Installeer de app voor de beste ervaring
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isInstalled ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/20 text-success-foreground">
                <Check className="h-5 w-5" />
                <span className="font-medium">App is geïnstalleerd!</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Je kunt de app nu openen vanaf je startscherm.
              </p>
              <Button asChild className="w-full btn-gradient">
                <a href="/login">Open App</a>
              </Button>
            </div>
          ) : isIOS ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Om te installeren op iPhone/iPad:
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                  <Share className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm">1. Tik op de deel-knop onderaan Safari</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                  <Smartphone className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm">2. Kies "Zet op beginscherm"</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm">3. Tik op "Voeg toe"</span>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full">
                <a href="/login">Ga naar login</a>
              </Button>
            </div>
          ) : deferredPrompt ? (
            <div className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  Werkt offline
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  Snelle toegang vanaf je startscherm
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  Volledig scherm ervaring
                </li>
              </ul>
              <Button onClick={handleInstall} className="w-full btn-gradient" size="lg">
                <Download className="h-5 w-5 mr-2" />
                Installeer App
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Open deze pagina in Chrome of Safari om de app te installeren.
              </p>
              <Button asChild variant="outline" className="w-full">
                <a href="/login">Ga naar login</a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
