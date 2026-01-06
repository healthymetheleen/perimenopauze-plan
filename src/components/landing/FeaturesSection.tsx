import { Calendar, BookHeart, Camera, TrendingUp, Moon, Apple, Sparkles, Fingerprint } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation, Trans } from "react-i18next";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export const FeaturesSection = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: Calendar,
      titleKey: "features.cycle_tracking.title",
      descriptionKey: "features.cycle_tracking.description",
    },
    {
      icon: BookHeart,
      titleKey: "features.symptom_diary.title",
      descriptionKey: "features.symptom_diary.description",
    },
    {
      icon: Camera,
      titleKey: "features.ai_nutrition.title",
      descriptionKey: "features.ai_nutrition.description",
      isHighlight: true,
    },
    {
      icon: TrendingUp,
      titleKey: "features.patterns.title",
      descriptionKey: "features.patterns.description",
      isHighlight: true,
    },
    {
      icon: Moon,
      titleKey: "features.sleep.title",
      descriptionKey: "features.sleep.description",
    },
    {
      icon: Apple,
      titleKey: "features.recipes.title",
      descriptionKey: "features.recipes.description",
    },
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('features.title')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            <Trans 
              i18nKey="features.description"
              components={{ strong: <strong className="text-foreground" /> }}
            />
          </p>
        </div>

        {/* Unique value proposition */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 rounded-2xl p-6 md:p-8 border border-primary/20 mb-12 max-w-4xl mx-auto"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {t('features.unique_title')}
              </h3>
              <p className="text-muted-foreground mb-3">
                <Trans 
                  i18nKey="features.unique_description"
                  components={{ strong: <strong className="text-foreground" /> }}
                />
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-primary" />
                  <span>
                    <Trans 
                      i18nKey="features.unique_point_1"
                      components={{ strong: <strong className="text-foreground" /> }}
                    />
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>
                    <Trans 
                      i18nKey="features.unique_point_2"
                      components={{ strong: <strong className="text-foreground" /> }}
                    />
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-primary" />
                  <span>
                    <Trans 
                      i18nKey="features.unique_point_3"
                      components={{ strong: <strong className="text-foreground" /> }}
                    />
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.titleKey}
              variants={itemVariants}
              className={`group p-6 rounded-2xl bg-card border hover:shadow-lg transition-all duration-300 ${
                feature.isHighlight 
                  ? "border-primary/30 bg-gradient-to-br from-card to-primary/5" 
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                feature.isHighlight 
                  ? "bg-primary/20 group-hover:bg-primary/30" 
                  : "bg-primary/10 group-hover:bg-primary/20"
              }`}>
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {t(feature.titleKey)}
                {feature.isHighlight && (
                  <span className="ml-2 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    AI
                  </span>
                )}
              </h3>
              <p className="text-muted-foreground">
                {t(feature.descriptionKey)}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};