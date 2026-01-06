import { UserPlus, PenLine, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export const HowItWorksSection = () => {
  const { t } = useTranslation();

  const steps = [
    {
      number: 1,
      icon: UserPlus,
      titleKey: "how_it_works.step_1.title",
      descriptionKey: "how_it_works.step_1.description",
    },
    {
      number: 2,
      icon: PenLine,
      titleKey: "how_it_works.step_2.title",
      descriptionKey: "how_it_works.step_2.description",
    },
    {
      number: 3,
      icon: Sparkles,
      titleKey: "how_it_works.step_3.title",
      descriptionKey: "how_it_works.step_3.description",
    },
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('how_it_works.title')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('how_it_works.description')}
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          {/* Connection line (desktop only) */}
          <div className="hidden lg:block absolute top-24 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="relative text-center"
              >
                {/* Step number badge */}
                <div className="relative inline-flex mb-6">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <step.icon className="w-8 h-8 text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                    {step.number}
                  </span>
                </div>

                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {t(step.titleKey)}
                </h3>
                <p className="text-muted-foreground">
                  {t(step.descriptionKey)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};