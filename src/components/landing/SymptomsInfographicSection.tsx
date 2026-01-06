import { motion } from "framer-motion";
import { 
  Flame, 
  Moon, 
  Brain, 
  Heart, 
  Scale, 
  Droplets,
  Frown,
  Zap
} from "lucide-react";
import { useTranslation, Trans } from "react-i18next";

export const SymptomsInfographicSection = () => {
  const { t } = useTranslation();

  const symptoms = [
    { icon: Flame, labelKey: "symptoms.hot_flashes", percentage: 75 },
    { icon: Moon, labelKey: "symptoms.sleep_problems", percentage: 60 },
    { icon: Brain, labelKey: "symptoms.concentration", percentage: 55 },
    { icon: Frown, labelKey: "symptoms.mood_swings", percentage: 50 },
    { icon: Zap, labelKey: "symptoms.fatigue", percentage: 65 },
    { icon: Scale, labelKey: "symptoms.weight_gain", percentage: 45 },
    { icon: Droplets, labelKey: "symptoms.night_sweats", percentage: 55 },
    { icon: Heart, labelKey: "symptoms.heart_palpitations", percentage: 35 },
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('symptoms.title')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            <Trans 
              i18nKey="symptoms.description"
              components={{ strong: <strong className="text-foreground" /> }}
            />
          </p>
        </motion.div>

        {/* Symptoms grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {symptoms.map((symptom, index) => (
            <motion.div
              key={symptom.labelKey}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="bg-card rounded-xl p-4 border border-border hover:border-primary/50 transition-colors"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <symptom.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">
                  {symptom.percentage}%
                </div>
                <p className="text-sm text-muted-foreground">{t(symptom.labelKey)}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center text-sm text-muted-foreground mt-8 max-w-xl mx-auto"
        >
          {t('symptoms.disclaimer')}
        </motion.p>
      </div>
    </section>
  );
};