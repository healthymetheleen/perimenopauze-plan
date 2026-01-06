import { Calendar, BookHeart, Camera, TrendingUp, Moon, Apple, Sparkles, Fingerprint } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Calendar,
    title: "Cyclus Tracking & Menstruatie Berekenen",
    description: "Bereken je menstruatie online, volg je (onregelmatige) cyclus en voorspel je volgende menstruatie met onze slimme calculator.",
  },
  {
    icon: BookHeart,
    title: "Symptoom Dagboek",
    description: "Log opvliegers, slaapproblemen, stemmingswisselingen, gewrichtsklachten en meer. Ontdek welke symptomen bij jou het meest voorkomen.",
  },
  {
    icon: Camera,
    title: "AI Voedingsanalyse",
    description: "Maak een foto van je maaltijd en ontvang direct een analyse. Krijg gepersonaliseerde suggesties afgestemd op je cyclusfase.",
    isHighlight: true,
  },
  {
    icon: TrendingUp,
    title: "Patronen & Inzichten",
    description: "Ontdek verbanden tussen je slaap, voeding, beweging en symptomen. Zie hoe je lichaam reageert op verschillende factoren.",
    isHighlight: true,
  },
  {
    icon: Moon,
    title: "Slaap Tracking",
    description: "Monitor je slaapkwaliteit en ontdek hoe hormoonschommelingen je nachtrust beïnvloeden tijdens de perimenopauze.",
  },
  {
    icon: Apple,
    title: "Gepersonaliseerde Recepten",
    description: "Ontvang receptsuggesties die passen bij je cyclusfase en helpen bij specifieke symptomen zoals opvliegers of vermoeidheid.",
  },
];

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
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Alles wat je nodig hebt voor de perimenopauze
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Van menstruatie berekenen tot <strong className="text-foreground">AI-gestuurde voedingsanalyse</strong>. 
            Eén app voor al je gezondheidsbehoeften tijdens de perimenopauze.
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
                Wat maakt deze app uniek?
              </h3>
              <p className="text-muted-foreground mb-3">
                Anders dan standaard cyclus- of gezondheidsapps, is deze app speciaal ontwikkeld 
                voor vrouwen in de perimenopauze. Onze <strong className="text-foreground">AI-gestuurde inzichten</strong> analyseren 
                jouw unieke combinatie van symptomen, slaap, voeding en cyclusdata om gepersonaliseerde 
                aanbevelingen te geven.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-primary" />
                  <span><strong className="text-foreground">Perimenopauze-specifiek</strong> — geen generieke cyclus-app</span>
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span><strong className="text-foreground">AI-gestuurde inzichten</strong> — leer patronen herkennen in jouw data</span>
                </li>
                <li className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-primary" />
                  <span><strong className="text-foreground">Foto-analyse van maaltijden</strong> — direct voedingsadvies afgestemd op je fase</span>
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
              key={feature.title}
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
                {feature.title}
                {feature.isHighlight && (
                  <span className="ml-2 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    AI
                  </span>
                )}
              </h3>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
