import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      
      {/* Decorative circles */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              AI-gestuurde inzichten
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Neem de regie over{" "}
              <span className="text-primary">de perimenopauze</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
              Track je cyclus, <strong>bereken je menstruatie online</strong>, en ontvang{" "}
              <strong className="text-foreground">AI-gestuurde inzichten</strong> afgestemd op jouw hormonale fase. 
              Ontdek patronen tussen je slaap, voeding en symptomen.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button asChild size="lg" className="text-lg px-8">
                <Link to="/login">
                  Start gratis proefperiode
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8">
                <Link to="/pricing">
                  Bekijk prijzen
                </Link>
              </Button>
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              ✓ 7 dagen gratis proberen &nbsp; ✓ Geen creditcard nodig &nbsp; ✓ GDPR compliant
            </p>
          </motion.div>

          {/* App mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative flex justify-center lg:justify-end"
          >
            <div className="relative">
              {/* Glow effect behind phone */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30 blur-3xl scale-90" />
              
              <img
                src="/app-mockup.png"
                alt="Perimenopauze Plan app - menstruatie berekenen online, cyclus tracking en symptomen dagboek"
                width={380}
                height={507}
                loading="eager"
                fetchPriority="high"
                className="relative w-full max-w-sm mx-auto drop-shadow-2xl rounded-3xl"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
