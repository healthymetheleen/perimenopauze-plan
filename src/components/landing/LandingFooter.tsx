import { Link } from "react-router-dom";
import { Heart } from "lucide-react";

export const LandingFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted/50 border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="text-xl font-bold text-foreground mb-3">
              Perimenopauze Plan
            </h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              De app die je helpt grip te krijgen op je perimenopauze. 
              Track je cyclus, bereken je menstruatie online, en ontvang 
              AI-gestuurde inzichten voor een betere gezondheid.
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-1 flex-wrap">
              Gemaakt met <Heart className="w-4 h-4 text-primary fill-primary" /> door{" "}
              <a 
                href="https://www.healthymetheleen.nl" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                Healthy met Heleen
              </a>
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Navigatie</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/pricing" className="text-muted-foreground hover:text-primary transition-colors">
                  Prijzen
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-muted-foreground hover:text-primary transition-colors">
                  Inloggen
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-muted-foreground hover:text-primary transition-colors">
                  Account aanmaken
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Juridisch</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                  Privacybeleid
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                  Algemene voorwaarden
                </Link>
              </li>
              <li>
                <Link to="/intended-use" className="text-muted-foreground hover:text-primary transition-colors">
                  Beoogd gebruik
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {currentYear} Perimenopauze Plan. Alle rechten voorbehouden.
            </p>
            <p className="text-xs text-muted-foreground">
              Deze app geeft geen medisch advies. Raadpleeg bij klachten altijd een arts.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
