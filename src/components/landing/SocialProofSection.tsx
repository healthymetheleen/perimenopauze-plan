import { Shield, Lock, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export const SocialProofSection = () => {
  const { t } = useTranslation();

  const trustBadges = [
    {
      icon: Shield,
      titleKey: "social_proof.gdpr_title",
      descriptionKey: "social_proof.gdpr_description",
    },
    {
      icon: Lock,
      titleKey: "social_proof.privacy_title",
      descriptionKey: "social_proof.privacy_description",
    },
    {
      icon: Heart,
      titleKey: "social_proof.women_title",
      descriptionKey: "social_proof.women_description",
    },
  ];

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <p className="text-lg text-muted-foreground">
            {t('social_proof.developed_by')}{" "}
            <a 
              href="https://www.healthymetheleen.nl" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-semibold text-foreground hover:text-primary transition-colors"
            >
              Healthy met Heleen
            </a>
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {trustBadges.map((badge, index) => (
            <motion.div
              key={badge.titleKey}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex flex-col items-center text-center p-6"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <badge.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{t(badge.titleKey)}</h3>
              <p className="text-sm text-muted-foreground">{t(badge.descriptionKey)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};