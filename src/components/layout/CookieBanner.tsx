import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Cookie, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const COOKIE_CONSENT_KEY = 'cookie-consent-accepted';

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookies
    const hasAccepted = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!hasAccepted) {
      // Small delay to prevent flash on page load
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    setIsVisible(false);
  };

  const declineCookies = () => {
    // Still set the key so we don't show the banner again
    localStorage.setItem(COOKIE_CONSENT_KEY, 'essential-only');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
      <Card className="max-w-2xl mx-auto glass-strong rounded-2xl shadow-lg border-primary/20">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
              <Cookie className="h-5 w-5 text-primary" />
            </div>
            
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-medium text-foreground">Cookies & Privacy</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Wij gebruiken alleen essentiële cookies voor de werking van de app. 
                  We gebruiken geen tracking of advertentiecookies. Meer informatie vind je in ons{' '}
                  <Link to="/privacy" className="text-primary hover:underline">
                    privacybeleid
                  </Link>.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={acceptCookies}
                  size="sm"
                  className="btn-gradient"
                >
                  Akkoord
                </Button>
                <Button 
                  onClick={declineCookies}
                  variant="outline"
                  size="sm"
                >
                  Alleen essentieel
                </Button>
              </div>
            </div>

            <button 
              onClick={declineCookies}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Sluiten"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
