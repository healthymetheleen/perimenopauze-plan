import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Area, AreaChart } from "recharts";

// Hormone data showing decline during perimenopause
const hormoneData = [
  { age: "35", estrogen: 100, progesterone: 100 },
  { age: "38", estrogen: 95, progesterone: 90 },
  { age: "40", estrogen: 85, progesterone: 75 },
  { age: "42", estrogen: 80, progesterone: 60 },
  { age: "44", estrogen: 70, progesterone: 45 },
  { age: "46", estrogen: 55, progesterone: 30 },
  { age: "48", estrogen: 40, progesterone: 20 },
  { age: "50", estrogen: 30, progesterone: 15 },
  { age: "52", estrogen: 20, progesterone: 10 },
];

export const WhatIsPerimenopauseSection = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Wat is perimenopauze?
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                <strong className="text-foreground">Perimenopauze</strong> is de overgangsperiode 
                voorafgaand aan de menopauze. Deze fase begint gemiddeld rond je 
                <strong className="text-foreground"> 40e tot 45e levensjaar</strong> en kan 
                4 tot 10 jaar duren.
              </p>
              <p>
                Tijdens de perimenopauze beginnen je hormoonspiegels te fluctueren. 
                Vooral <strong className="text-foreground">oestrogeen</strong> en{" "}
                <strong className="text-foreground">progesteron</strong> schommelen sterk, 
                wat leidt tot allerlei lichamelijke en mentale veranderingen.
              </p>
              <p>
                Deze hormonale schommelingen kunnen leiden tot onregelmatige menstruatie, 
                opvliegers, slaapproblemen, stemmingswisselingen, gewichtstoename en 
                concentratieproblemen. Het goede nieuws: met de juiste inzichten kun je 
                veel van deze klachten beter begrijpen en aanpakken.
              </p>
            </div>
          </motion.div>

          {/* Hormone graph */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-card rounded-2xl p-6 border border-border shadow-lg"
          >
            <h3 className="text-lg font-semibold text-foreground mb-2 text-center">
              Hormoonspiegels tijdens perimenopauze
            </h3>
            <p className="text-sm text-muted-foreground mb-6 text-center">
              Relatieve hormoonspiegels per leeftijd
            </p>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hormoneData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="estrogenGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="progesteroneGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="age" 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Area
                    type="monotone"
                    dataKey="estrogen"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#estrogenGradient)"
                    name="Oestrogeen"
                  />
                  <Area
                    type="monotone"
                    dataKey="progesterone"
                    stroke="hsl(var(--secondary))"
                    strokeWidth={2}
                    fill="url(#progesteroneGradient)"
                    name="Progesteron"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-sm text-muted-foreground">Oestrogeen</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-secondary" />
                <span className="text-sm text-muted-foreground">Progesteron</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
