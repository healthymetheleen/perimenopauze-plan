import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { WhatIsPerimenopauseSection } from "@/components/landing/WhatIsPerimenopauseSection";
import { SymptomsInfographicSection } from "@/components/landing/SymptomsInfographicSection";
import { CycleSyncingSection } from "@/components/landing/CycleSyncingSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { SocialProofSection } from "@/components/landing/SocialProofSection";
import { FAQSection, generateFAQSchema } from "@/components/landing/FAQSection";
import { CTASection } from "@/components/landing/CTASection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { getDomainForLanguage } from "@/i18n/config";

// Structured Data for SEO
const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Perimenopauze Plan",
  applicationCategory: "HealthApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "AggregateOffer",
    lowPrice: "7.50",
    highPrice: "14.00",
    priceCurrency: "EUR",
    offerCount: 2,
  },
  description:
    "AI-gestuurde app voor vrouwen in de perimenopauze. Track je cyclus, bereken je menstruatie online, log symptomen en ontvang gepersonaliseerde inzichten.",
  author: {
    "@type": "Organization",
    name: "Healthy met Heleen",
    url: "https://www.healthymetheleen.nl",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "150",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Healthy met Heleen",
  url: "https://www.healthymetheleen.nl",
  logo: "https://www.perimenopauzeplan.nl/favicon.svg",
  description:
    "Healthy met Heleen ontwikkelt digitale oplossingen voor vrouwengezondheid, met focus op de perimenopauze.",
};

const Landing = () => {
  const { t, i18n } = useTranslation();
  const faqSchema = generateFAQSchema();
  const currentLang = i18n.language || 'nl';
  const isEnglish = currentLang === 'en';

  // Get canonical URL based on current language
  const canonicalUrl = isEnglish 
    ? "https://www.perimenopause-plan.com/"
    : "https://www.perimenopauzeplan.nl/";

  return (
    <>
      <Helmet>
        <html lang={currentLang} />
        <title>{t('meta.title')}</title>
        <meta name="description" content={t('meta.description')} />
        <meta
          name="keywords"
          content="perimenopauze, cycle syncing, cyclus leven, overgang, cyclus tracking, menstruatie berekenen, menstruatie berekenen online, menstruatie calculator, cyclus berekenen, hormonen, symptomen, opvliegers, voedingsdagboek, slaap tracker, AI inzichten, vrouwengezondheid"
        />
        <link rel="canonical" href={canonicalUrl} />
        
        {/* hreflang tags for international SEO */}
        <link rel="alternate" hrefLang="nl" href={getDomainForLanguage('nl') + '/'} />
        <link rel="alternate" hrefLang="en" href={getDomainForLanguage('en') + '/'} />
        <link rel="alternate" hrefLang="x-default" href={getDomainForLanguage('en') + '/'} />
        
        {/* Open Graph */}
        <meta property="og:title" content={t('meta.og_title')} />
        <meta property="og:description" content={t('meta.og_description')} />
        <meta property="og:image" content="https://www.perimenopauzeplan.nl/og-image.png" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content={isEnglish ? "en_US" : "nl_NL"} />
        {isEnglish && <meta property="og:locale:alternate" content="nl_NL" />}
        {!isEnglish && <meta property="og:locale:alternate" content="en_US" />}
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={t('meta.og_title')} />
        <meta name="twitter:description" content={t('meta.twitter_description')} />
        <meta name="twitter:image" content="https://www.perimenopauzeplan.nl/og-image.png" />

        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(softwareApplicationSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(organizationSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <LandingHeader />
        <main className="pt-16">
          <HeroSection />
          <section id="what-is-perimenopause">
            <WhatIsPerimenopauseSection />
          </section>
          <section id="symptoms">
            <SymptomsInfographicSection />
          </section>
          <section id="cycle-syncing">
            <CycleSyncingSection />
          </section>
          <section id="functies">
            <FeaturesSection />
          </section>
          <section id="how-it-works">
            <HowItWorksSection />
          </section>
          <SocialProofSection />
          <section id="faq">
            <FAQSection />
          </section>
          <CTASection />
        </main>
        <LandingFooter />
      </div>
    </>
  );
};

export default Landing;
