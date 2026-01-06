import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { useTranslation } from "react-i18next";

export const LandingFooter = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted/50 border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="text-xl font-bold text-foreground mb-3">
              Perimenopause Plan
            </h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              {t('footer.brand_description')}
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-1 flex-wrap">
              {t('footer.made_with_love')} <Heart className="w-4 h-4 text-primary fill-primary" /> {t('footer.by')}{" "}
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
            <h4 className="font-semibold text-foreground mb-4">{t('footer.navigation')}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/pricing" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('footer.pricing')}
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('footer.login')}
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('footer.create_account')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">{t('footer.legal')}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('footer.privacy_policy')}
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('footer.terms')}
                </Link>
              </li>
              <li>
                <Link to="/intended-use" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('footer.intended_use')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {currentYear} Perimenopause Plan. {t('footer.copyright')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('footer.medical_disclaimer')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};