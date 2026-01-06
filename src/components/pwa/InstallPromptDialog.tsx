import { useState, useEffect } from 'react';
import { Download, Smartphone, Share, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePwaInstall } from '@/hooks/usePwaInstall';

interface InstallPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstalled?: () => void;
}

export function InstallPromptDialog({ open, onOpenChange, onInstalled }: InstallPromptDialogProps) {
  const { isIOS, isInstalled, canTriggerInstall, triggerInstall } = usePwaInstall();
  const [installing, setInstalling] = useState(false);

  // Close dialog if already installed
  useEffect(() => {
    if (isInstalled && open) {
      onInstalled?.();
      onOpenChange(false);
    }
  }, [isInstalled, open, onInstalled, onOpenChange]);

  const handleInstall = async () => {
    setInstalling(true);
    const success = await triggerInstall();
    setInstalling(false);
    
    if (success) {
      onInstalled?.();
      onOpenChange(false);
    }
  };

  const handleSkip = () => {
    // Remember that user skipped, don't show again this session
    sessionStorage.setItem('pwa-install-skipped', 'true');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl overflow-hidden mb-3 shadow-lg">
            <img src="/pwa-192x192.png" alt="Perimenopauze Plan" className="w-full h-full object-cover" />
          </div>
          <DialogTitle className="text-xl">Installeer de app</DialogTitle>
          <DialogDescription>
            Krijg de beste ervaring met snelle toegang vanaf je startscherm
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Benefits */}
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-muted-foreground">
              <Check className="h-4 w-4 text-success flex-shrink-0" />
              Direct openen vanaf je startscherm
            </li>
            <li className="flex items-center gap-2 text-muted-foreground">
              <Check className="h-4 w-4 text-success flex-shrink-0" />
              Werkt offline
            </li>
            <li className="flex items-center gap-2 text-muted-foreground">
              <Check className="h-4 w-4 text-success flex-shrink-0" />
              Volledig scherm, geen browser-balk
            </li>
          </ul>

          {isIOS ? (
            /* iOS Instructions */
            <div className="space-y-3 pt-2">
              <p className="text-sm font-medium text-center">Zo installeer je op iPhone/iPad:</p>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Share className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm">Tik op de <strong>deel-knop</strong> onderaan Safari</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Smartphone className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm">Kies <strong>"Zet op beginscherm"</strong></span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm">Tik op <strong>"Voeg toe"</strong></span>
                </div>
              </div>
            </div>
          ) : canTriggerInstall ? (
            /* Android/Chrome - can trigger native prompt */
            <Button 
              onClick={handleInstall} 
              className="w-full btn-gradient" 
              size="lg"
              disabled={installing}
            >
              <Download className="h-5 w-5 mr-2" />
              {installing ? 'Installeren...' : 'Installeer nu'}
            </Button>
          ) : (
            /* Fallback for other browsers */
            <div className="text-center text-sm text-muted-foreground">
              <p>Open deze pagina in Chrome of Safari om te installeren.</p>
            </div>
          )}

          {/* Skip button */}
          <Button 
            variant="ghost" 
            className="w-full text-muted-foreground" 
            onClick={handleSkip}
          >
            Later installeren
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
