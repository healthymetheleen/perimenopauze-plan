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

const symptoms = [
  { icon: Flame, label: "Opvliegers", percentage: 75 },
  { icon: Moon, label: "Slaapproblemen", percentage: 60 },
  { icon: Brain, label: "Concentratieproblemen", percentage: 55 },
  { icon: Frown, label: "Stemmingswisselingen", percentage: 50 },
  { icon: Zap, label: "Vermoeidheid", percentage: 65 },
  { icon: Scale, label: "Gewichtstoename", percentage: 45 },
  { icon: Droplets, label: "Nachtelijk zweten", percentage: 55 },
  { icon: Heart, label: "Hartkloppingen", percentage: 35 },
];

export const SymptomsInfographicSection = () => {
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
            Klachten tijdens de perimenopauze in cijfers
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            <strong className="text-foreground">80-90% van de vrouwen</strong> ervaart klachten 
            tijdens de perimenopauze. Bij sommige vrouwen beginnen de eerste symptomen al{" "}
            <strong className="text-foreground">rond hun 30e</strong>. Dit zijn de meest voorkomende klachten:
          </p>
        </motion.div>

        {/* Main stat */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-md mx-auto mb-12"
        >
          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-8 text-center border border-primary/20">
            <div className="text-6xl md:text-7xl font-bold text-primary mb-2">85%</div>
            <p className="text-muted-foreground">
              van de vrouwen in de perimenopauze heeft last van één of meer klachten
            </p>
          </div>
        </motion.div>

        {/* Symptoms grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {symptoms.map((symptom, index) => (
            <motion.div
              key={symptom.label}
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
                <p className="text-sm text-muted-foreground">{symptom.label}</p>
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
          * Percentages zijn gebaseerd op gemiddelden uit wetenschappelijk onderzoek. 
          Individuele ervaringen kunnen sterk variëren.
        </motion.p>
      </div>
    </section>
  );
};
