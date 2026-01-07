import { Link } from 'react-router-dom';
import { Shield, FileText, Target, Info, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FeedbackFormDialog } from '@/components/contact/FeedbackFormDialog';
import { Button } from '@/components/ui/button';

export function Footer() {
  const { t } = useTranslation();
  
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
              {t('footer.privacy_policy')}
            </Link>
            <Link 
              to="/terms" 
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              {t('footer.terms')}
            </Link>
            <Link 
              to="/intended-use" 
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Target className="h-3.5 w-3.5" />
              {t('footer.intended_use')}
            </Link>
          </nav>

          {/* Feedback button */}
          <FeedbackFormDialog 
            trigger={
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                <MessageCircle className="h-3.5 w-3.5" />
                {t('footer.feedback')}
              </Button>
            }
          />
        </div>

        {/* Disclaimer */}
        <div className="mt-4 pt-4 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="h-3 w-3 flex-shrink-0" />
            <span>{t('footer.disclaimer')}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
}
