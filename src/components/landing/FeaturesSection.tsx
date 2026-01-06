import { Calendar, BookHeart, Camera, TrendingUp, Moon, Apple } from "lucide-react";
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
  },
  {
    icon: TrendingUp,
    title: "Patronen & Inzichten",
    description: "Ontdek verbanden tussen je slaap, voeding, beweging en symptomen. Zie hoe je lichaam reageert op verschillende factoren.",
  },
  {
    icon: Moon,
    title: "Slaap Tracking",
    description: "Monitor je slaapkwaliteit en ontdek hoe hormoonschommelingen je nachtrust beïnvloeden tijdens de overgang.",
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
            Alles wat je nodig hebt voor je perimenopauze
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Van menstruatie berekenen tot AI-gestuurde voedingsanalyse. 
            Eén app voor al je gezondheidsbehoeften tijdens de overgang.
          </p>
        </div>

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
              className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {feature.title}
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
