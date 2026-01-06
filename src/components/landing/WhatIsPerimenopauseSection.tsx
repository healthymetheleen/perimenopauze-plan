import { motion } from "framer-motion";
import { XAxis, YAxis, ResponsiveContainer, LineChart, Line, ReferenceLine } from "recharts";
import { useTranslation, Trans } from "react-i18next";

// Hormone data showing fluctuations during perimenopause with more realistic patterns
const hormoneData = [
  { age: "30", estrogen: 100, progesterone: 100 },
  { age: "32", estrogen: 98, progesterone: 95 },
  { age: "35", estrogen: 95, progesterone: 90 },
  { age: "37", estrogen: 88, progesterone: 80 },
  { age: "38", estrogen: 92, progesterone: 70 },
  { age: "39", estrogen: 78, progesterone: 65 },
  { age: "40", estrogen: 85, progesterone: 55 },
  { age: "41", estrogen: 70, progesterone: 50 },
  { age: "42", estrogen: 80, progesterone: 42 },
  { age: "43", estrogen: 62, progesterone: 38 },
  { age: "44", estrogen: 72, progesterone: 32 },
  { age: "45", estrogen: 55, progesterone: 28 },
  { age: "46", estrogen: 65, progesterone: 22 },
  { age: "47", estrogen: 48, progesterone: 18 },
  { age: "48", estrogen: 58, progesterone: 15 },
  { age: "49", estrogen: 40, progesterone: 12 },
  { age: "50", estrogen: 50, progesterone: 10 },
  { age: "51", estrogen: 35, progesterone: 8 },
  { age: "52", estrogen: 28, progesterone: 6 },
  { age: "53", estrogen: 22, progesterone: 5 },
  { age: "55", estrogen: 18, progesterone: 5 },
];

export const WhatIsPerimenopauseSection = () => {
  const { t } = useTranslation();

  return (
    <section id="what-is-perimenopause" className="py-20 bg-muted/30">
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
              {t('what_is.title')}
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                <Trans 
                  i18nKey="what_is.paragraph_1"
                  components={{ strong: <strong className="text-foreground" /> }}
                />
              </p>
              <p>
                <Trans 
                  i18nKey="what_is.paragraph_2"
                  components={{ strong: <strong className="text-foreground" /> }}
                />
              </p>
              <p>
                {t('what_is.paragraph_3')}
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
              {t('what_is.chart_title')}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 text-center">
              {t('what_is.chart_subtitle')}
            </p>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hormoneData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis 
                    dataKey="age" 
                    tick={{ fontSize: 11 }} 
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    interval={3}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}%`}
                    domain={[0, 110]}
                  />
                  <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" opacity={0.3} />
                  <Line
                    type="monotone"
                    dataKey="estrogen"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={false}
                    name={t('what_is.estrogen')}
                  />
                  <Line
                    type="monotone"
                    dataKey="progesterone"
                    stroke="hsl(var(--secondary))"
                    strokeWidth={2.5}
                    dot={false}
                    name={t('what_is.progesterone')}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-sm text-muted-foreground">{t('what_is.estrogen')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-secondary" />
                <span className="text-sm text-muted-foreground">{t('what_is.progesterone')}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-4">
              {t('what_is.chart_note')}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};