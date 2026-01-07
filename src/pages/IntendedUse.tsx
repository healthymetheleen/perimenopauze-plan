import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Target, Check, X, AlertTriangle, FileText } from 'lucide-react';

export default function IntendedUse() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-subtle px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <Link to="/login">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('intended_use.back')}
          </Button>
        </Link>

        <Card className="glass-strong rounded-2xl">
          <CardHeader className="text-center border-b border-border/50 pb-6">
            <div className="flex justify-center mb-4">
              <Target className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl text-gradient">{t('intended_use.title')}</CardTitle>
            <p className="text-muted-foreground mt-2">{t('intended_use.subtitle')}</p>
            <p className="text-sm text-muted-foreground">{t('intended_use.version')}</p>
          </CardHeader>

          <CardContent className="prose prose-sm max-w-none pt-6 space-y-8">
            {/* Official Intended Use Statement */}
            <section className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-foreground mt-0">
                {t('intended_use.intended_use_title')}
              </h2>
              <p className="text-muted-foreground mb-2">
                {t('intended_use.intended_use_p1')}
              </p>
              <p className="text-muted-foreground mb-2">
                {t('intended_use.intended_use_p2')}
              </p>
              <p className="text-muted-foreground mb-2">
                {t('intended_use.intended_use_p3')}
              </p>
              <p className="text-muted-foreground mb-0">
                {t('intended_use.intended_use_p4')}
              </p>
            </section>

            {/* MDR Classification */}
            <section className="bg-success/10 border border-success/30 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mt-0">
                <FileText className="h-5 w-5 text-success" />
                {t('intended_use.mdr_title')}
              </h2>
              <p className="text-foreground font-medium mb-2">
                {t('intended_use.mdr_p1')}
              </p>
              <p className="text-muted-foreground mb-0">
                {t('intended_use.mdr_p2')}
              </p>
            </section>

            {/* Product Description */}
            <section>
              <h2 className="text-lg font-semibold text-foreground">{t('intended_use.product_title')}</h2>
              <p className="text-muted-foreground">
                {t('intended_use.product_description')}
              </p>
            </section>

            {/* Intended Purpose */}
            <section>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Check className="h-5 w-5 text-success" />
                {t('intended_use.purpose_title')}
              </h2>
              <p className="text-muted-foreground">
                {t('intended_use.purpose_intro')}
              </p>
              <ul className="space-y-2 mt-3">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground"><strong>{t('intended_use.purpose_self_observation')}</strong> {t('intended_use.purpose_self_observation_desc')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground"><strong>{t('intended_use.purpose_lifestyle')}</strong> {t('intended_use.purpose_lifestyle_desc')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground"><strong>{t('intended_use.purpose_patterns')}</strong> {t('intended_use.purpose_patterns_desc')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground"><strong>{t('intended_use.purpose_education')}</strong> {t('intended_use.purpose_education_desc')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground"><strong>{t('intended_use.purpose_conversation')}</strong> {t('intended_use.purpose_conversation_desc')}</span>
                </li>
              </ul>
            </section>

            {/* Contraindications */}
            <section>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <X className="h-5 w-5 text-destructive" />
                {t('intended_use.contra_title')}
              </h2>
              <p className="text-muted-foreground">
                {t('intended_use.contra_intro')}
              </p>
              <ul className="space-y-2 mt-3">
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-destructive mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground">{t('intended_use.contra_diagnosis')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-destructive mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground">{t('intended_use.contra_treatment')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-destructive mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground">{t('intended_use.contra_monitoring')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-destructive mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground">{t('intended_use.contra_prediction')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-destructive mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground">{t('intended_use.contra_hormones')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-destructive mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground">{t('intended_use.contra_clinical')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-destructive mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground">{t('intended_use.contra_replace')}</span>
                </li>
              </ul>
            </section>

            {/* Target Users */}
            <section>
              <h2 className="text-lg font-semibold text-foreground">{t('intended_use.target_title')}</h2>
              <p className="text-muted-foreground">
                <strong>{t('intended_use.target_primary')}</strong> {t('intended_use.target_primary_desc')}
              </p>
              <p className="text-muted-foreground mt-2">
                <strong>{t('intended_use.target_age')}</strong> {t('intended_use.target_age_desc')}
              </p>
              <p className="text-muted-foreground mt-2">
                <strong>{t('intended_use.target_context')}</strong> {t('intended_use.target_context_desc')}
              </p>
            </section>

            {/* Technical Safeguards */}
            <section>
              <h2 className="text-lg font-semibold text-foreground">{t('intended_use.safeguards_title')}</h2>
              <p className="text-muted-foreground">
                {t('intended_use.safeguards_intro')}
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                <li>{t('intended_use.safeguards_1')}</li>
                <li>{t('intended_use.safeguards_2')}</li>
                <li>{t('intended_use.safeguards_3')}</li>
                <li>{t('intended_use.safeguards_4')}</li>
                <li>{t('intended_use.safeguards_5')}</li>
              </ul>
            </section>

            {/* Regulatory Basis */}
            <section>
              <h2 className="text-lg font-semibold text-foreground">{t('intended_use.regulatory_title')}</h2>
              <p className="text-muted-foreground">
                {t('intended_use.regulatory_intro')}
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                <li>{t('intended_use.regulatory_1')}</li>
                <li>{t('intended_use.regulatory_2')}</li>
                <li>{t('intended_use.regulatory_3')}</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                {t('intended_use.regulatory_conclusion')}
              </p>
            </section>

            {/* Warning */}
            <section className="bg-warning/10 border border-warning/30 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mt-0">
                <AlertTriangle className="h-5 w-5 text-warning" />
                {t('intended_use.warning_title')}
              </h2>
              <p className="text-muted-foreground mb-0">
                {t('intended_use.warning_text')}
              </p>
            </section>

            {/* Document Info */}
            <section className="text-center pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                {t('intended_use.document_info')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('intended_use.document_version')}
              </p>
            </section>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4 mt-6">
          <Link to="/privacy">
            <Button variant="link" className="text-muted-foreground">
              {t('intended_use.privacy_policy')}
            </Button>
          </Link>
          <Link to="/terms">
            <Button variant="link" className="text-muted-foreground">
              {t('intended_use.terms')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}