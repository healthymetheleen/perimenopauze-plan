import { Link } from 'react-router-dom';
import { Shield, FileText, Target, Info } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-card border-t border-border py-6 mt-auto">
      <div className="container max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm">
            <Link 
              to="/privacy" 
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Shield className="h-3.5 w-3.5" />
              Privacybeleid
            </Link>
            <Link 
              to="/terms" 
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              Voorwaarden
            </Link>
            <Link 
              to="/intended-use" 
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Target className="h-3.5 w-3.5" />
              Beoogd gebruik
            </Link>
          </nav>

          {/* Disclaimer */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="h-3 w-3 flex-shrink-0" />
            <span>Geen medisch advies · Inzicht & zelfobservatie</span>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-4 pt-4 border-t border-border/50 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Perimenopauze Plan. Alle rechten voorbehouden.
          </p>
        </div>
      </div>
    </footer>
  );
}
