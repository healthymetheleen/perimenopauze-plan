import { Helmet } from "react-helmet";
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
  const faqSchema = generateFAQSchema();

  return (
    <>
      <Helmet>
        <title>Perimenopauze Plan | Menstruatie Berekenen Online & Cyclus Tracking</title>
        <meta
          name="description"
          content="Bereken je menstruatie online, track je cyclus en symptomen tijdens de perimenopauze. Ontvang AI-gestuurde inzichten afgestemd op jouw hormonale fase. Start gratis."
        />
        <meta
          name="keywords"
          content="perimenopauze, cycle syncing, cyclus leven, overgang, cyclus tracking, menstruatie berekenen, menstruatie berekenen online, menstruatie calculator, cyclus berekenen, hormonen, symptomen, opvliegers, voedingsdagboek, slaap tracker, AI inzichten, vrouwengezondheid"
        />
        <link rel="canonical" href="https://www.perimenopauzeplan.nl/" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Perimenopauze Plan | Menstruatie Berekenen Online" />
        <meta
          property="og:description"
          content="Track je cyclus, bereken je menstruatie online en ontvang AI-gestuurde inzichten voor de perimenopauze."
        />
        <meta property="og:image" content="https://www.perimenopauzeplan.nl/og-image.png" />
        <meta property="og:url" content="https://www.perimenopauzeplan.nl/" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="nl_NL" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Perimenopauze Plan | Menstruatie Berekenen Online" />
        <meta
          name="twitter:description"
          content="Track je cyclus, bereken je menstruatie online en ontvang AI-gestuurde inzichten."
        />
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
