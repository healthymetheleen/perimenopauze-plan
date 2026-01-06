import { Shield, Lock, Heart } from "lucide-react";
import { motion } from "framer-motion";

const trustBadges = [
  {
    icon: Shield,
    title: "GDPR Compliant",
    description: "Je data wordt veilig opgeslagen volgens Europese privacywetgeving",
  },
  {
    icon: Lock,
    title: "Privacy-first",
    description: "Je gezondheidsgegevens worden nooit gedeeld met derden",
  },
  {
    icon: Heart,
    title: "Door vrouwen, voor vrouwen",
    description: "Ontwikkeld met begrip voor de unieke uitdagingen van de perimenopauze",
  },
];

export const SocialProofSection = () => {
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
            Ontwikkeld door{" "}
            <span className="font-semibold text-foreground">Healthy Me Theleen</span>
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {trustBadges.map((badge, index) => (
            <motion.div
              key={badge.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex flex-col items-center text-center p-6"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <badge.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{badge.title}</h3>
              <p className="text-sm text-muted-foreground">{badge.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
