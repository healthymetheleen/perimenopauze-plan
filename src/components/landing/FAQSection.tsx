import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";

const faqs = [
  {
    question: "Wat is perimenopauze?",
    answer: "Perimenopauze is de overgangsperiode naar de menopauze, die meestal begint tussen je 40e en 50e levensjaar. Tijdens deze fase fluctueren je hormonen, wat kan leiden tot symptomen zoals onregelmatige menstruatie, opvliegers, slaapproblemen en stemmingswisselingen. Deze periode kan 4 tot 10 jaar duren.",
  },
  {
    question: "Hoe kan ik mijn menstruatie berekenen?",
    answer: "Met Perimenopauze Plan kun je eenvoudig je menstruatie berekenen online. Log je cyclusgegevens en de app voorspelt automatisch je volgende menstruatie. Onze slimme calculator houdt rekening met onregelmatige cycli die typisch zijn tijdens de perimenopauze, zodat je toch een betrouwbare voorspelling krijgt.",
  },
  {
    question: "Voor wie is deze app bedoeld?",
    answer: "Deze app is speciaal ontwikkeld voor vrouwen die in de perimenopauze of overgang zitten, of vermoeden dat ze deze fase ingaan. Ook vrouwen die hun cyclus willen volgen en meer inzicht willen in de relatie tussen hun hormonen, voeding en welzijn kunnen baat hebben bij de app.",
  },
  {
    question: "Hoe werkt de AI-analyse?",
    answer: "Onze AI analyseert je ingevoerde gegevens - maaltijden, slaap, symptomen en cyclusdata - om patronen te ontdekken. Je ontvangt gepersonaliseerde inzichten over hoe je voeding en leefstijl je symptomen beïnvloeden. De AI geeft suggesties die zijn afgestemd op jouw specifieke situatie en cyclusfase.",
  },
  {
    question: "Is mijn data veilig?",
    answer: "Absoluut. We nemen privacy zeer serieus. Alle data wordt versleuteld opgeslagen en verwerkt volgens de GDPR-richtlijnen. Je gezondheidsgegevens worden nooit gedeeld met derden of gebruikt voor advertenties. Je hebt altijd volledige controle over je eigen data en kunt deze op elk moment verwijderen.",
  },
  {
    question: "Wat kost de app?",
    answer: "Je kunt de app 7 dagen gratis proberen zonder creditcard. Daarna kost het Basis abonnement €7,50 per maand, waarmee je toegang hebt tot alle tracking functies. Het Premium abonnement voor €14 per maand bevat extra AI-analyses en gepersonaliseerde coaching.",
  },
  {
    question: "Kan ik de app gratis proberen?",
    answer: "Ja! Je krijgt 7 dagen gratis toegang tot alle Premium functies. Zo kun je uitgebreid testen of de app bij je past. Na de proefperiode kies je zelf of je doorgaat met een betaald abonnement.",
  },
  {
    question: "Geeft de app medisch advies?",
    answer: "Nee, Perimenopauze Plan is een wellness-app en geeft geen medisch advies. De app helpt je patronen te ontdekken en biedt algemene informatie, maar vervangt geen arts of specialist. Bij medische klachten raden we altijd aan om contact op te nemen met een zorgverlener.",
  },
];

// Generate FAQ Schema for SEO
export const generateFAQSchema = () => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
});

export const FAQSection = () => {
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
            Veelgestelde vragen
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Alles wat je wilt weten over perimenopauze en onze app
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border border-border rounded-xl px-6 data-[state=open]:border-primary/50"
              >
                <AccordionTrigger className="text-left font-semibold hover:text-primary">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};
