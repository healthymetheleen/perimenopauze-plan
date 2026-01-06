import { memo } from "react";
import { motion } from "framer-motion";
import { 
  Snowflake, 
  Flower2, 
  Sun, 
  Leaf,
  Dumbbell,
  Briefcase,
  Utensils,
  Heart
} from "lucide-react";
import { useTranslation, Trans } from "react-i18next";

const PhaseCard = memo(({ seasonKey, icon: Icon, index, color, borderColor, iconBg }: { 
  seasonKey: string; 
  icon: React.ElementType; 
  index: number;
  color: string;
  borderColor: string;
  iconBg: string;
}) => {
  const { t } = useTranslation();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className={`rounded-2xl p-5 bg-gradient-to-br ${color} border ${borderColor}`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-foreground/70" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{t(`cycle_syncing.seasons.${seasonKey}`)}</h3>
          <p className="text-sm text-muted-foreground">
            {t(`cycle_syncing.phases.${seasonKey === 'winter' ? 'menstruation' : seasonKey === 'spring' ? 'follicular' : seasonKey === 'summer' ? 'ovulation' : 'luteal'}`)} · {t(`cycle_syncing.${seasonKey}.days`)}
          </p>
        </div>
      </div>
      
      <div className="space-y-3 text-sm">
        <div className="flex items-start gap-2">
          <Heart className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <span className="text-muted-foreground">{t(`cycle_syncing.${seasonKey}.expect`)}</span>
        </div>
        <div className="flex items-start gap-2">
          <Briefcase className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <span className="text-muted-foreground">{t(`cycle_syncing.${seasonKey}.work`)}</span>
        </div>
        <div className="flex items-start gap-2">
          <Dumbbell className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <span className="text-muted-foreground">{t(`cycle_syncing.${seasonKey}.exercise`)}</span>
        </div>
        <div className="flex items-start gap-2">
          <Utensils className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <span className="text-muted-foreground">{t(`cycle_syncing.${seasonKey}.nutrition`)}</span>
        </div>
      </div>
    </motion.div>
  );
});

PhaseCard.displayName = "PhaseCard";

const phases = [
  { seasonKey: "winter", icon: Snowflake, color: "from-blue-100 to-blue-200", borderColor: "border-blue-300", iconBg: "bg-blue-200" },
  { seasonKey: "spring", icon: Flower2, color: "from-green-100 to-green-200", borderColor: "border-green-300", iconBg: "bg-green-200" },
  { seasonKey: "summer", icon: Sun, color: "from-yellow-100 to-yellow-200", borderColor: "border-yellow-300", iconBg: "bg-yellow-200" },
  { seasonKey: "autumn", icon: Leaf, color: "from-orange-100 to-orange-200", borderColor: "border-orange-300", iconBg: "bg-orange-200" },
];

export const CycleSyncingSection = memo(() => {
  const { t } = useTranslation();
  
  const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-3 py-1 text-sm font-medium text-primary bg-primary/10 rounded-full mb-4">
            {t('cycle_syncing.badge')}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('cycle_syncing.title')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            <Trans 
              i18nKey="cycle_syncing.description"
              components={{ strong: <strong className="text-foreground" /> }}
            />
          </p>
        </motion.div>

        {/* Cycle Calendar Visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 p-4 md:p-6 bg-card rounded-2xl border border-border shadow-sm max-w-4xl mx-auto"
        >
          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="text-muted-foreground">{t('cycle_syncing.legend.menstruation')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-pink-300" />
              <span className="text-muted-foreground">{t('cycle_syncing.legend.expected')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border-2 border-green-400 bg-transparent" />
              <span className="text-muted-foreground">{t('cycle_syncing.legend.fertile')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-500">★</span>
              <span className="text-muted-foreground">{t('cycle_syncing.legend.ovulation')}</span>
            </div>
          </div>
          
          {/* Season legend */}
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 mb-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-blue-200" />
              <span className="text-muted-foreground">{t('cycle_syncing.seasons.winter')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-green-200" />
              <span className="text-muted-foreground">{t('cycle_syncing.seasons.spring')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-yellow-200" />
              <span className="text-muted-foreground">{t('cycle_syncing.seasons.summer')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-orange-200" />
              <span className="text-muted-foreground">{t('cycle_syncing.seasons.autumn')}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 md:gap-2">
              {dayKeys.map((day) => (
                <div key={day} className="text-center text-xs text-muted-foreground py-1">
                  {t(`cycle_syncing.days.${day}`)}
                </div>
              ))}
            </div>
            
            {/* Week 1 - Winter (Menstruatie) */}
            <div className="grid grid-cols-7 gap-1 md:gap-2">
              <div className="aspect-square rounded-lg bg-blue-100 flex items-center justify-center text-sm font-medium relative">
                <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-red-400" />
                5
              </div>
              <div className="aspect-square rounded-lg bg-blue-100 flex items-center justify-center text-sm font-medium border-2 border-primary relative">
                <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-red-400" />
                6
              </div>
              <div className="aspect-square rounded-lg bg-blue-100 flex items-center justify-center text-sm font-medium relative">
                <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-red-400" />
                7
              </div>
              <div className="aspect-square rounded-lg bg-blue-100 flex items-center justify-center text-sm font-medium relative">
                <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-red-400" />
                8
              </div>
              <div className="aspect-square rounded-lg bg-blue-50 flex items-center justify-center text-sm font-medium">9</div>
              <div className="aspect-square rounded-lg bg-green-100 flex items-center justify-center text-sm font-medium">10</div>
              <div className="aspect-square rounded-lg bg-green-100 flex items-center justify-center text-sm font-medium">11</div>
            </div>
            
            {/* Week 2 - Lente/Zomer with fertile window */}
            <div className="grid grid-cols-7 gap-1 md:gap-2">
              <div className="aspect-square rounded-lg bg-green-100 flex items-center justify-center text-sm font-medium">12</div>
              <div className="aspect-square rounded-lg bg-green-100 flex items-center justify-center text-sm font-medium">13</div>
              <div className="aspect-square rounded-lg bg-green-200 flex items-center justify-center text-sm font-medium ring-2 ring-green-500 ring-offset-1">14</div>
              <div className="aspect-square rounded-lg bg-green-200 flex items-center justify-center text-sm font-medium ring-2 ring-green-500 ring-offset-1">15</div>
              <div className="aspect-square rounded-lg bg-green-200 flex items-center justify-center text-sm font-medium ring-2 ring-green-500 ring-offset-1">16</div>
              <div className="aspect-square rounded-lg bg-green-200 flex items-center justify-center text-sm font-medium ring-2 ring-green-500 ring-offset-1">17</div>
              <div className="aspect-square rounded-lg bg-yellow-100 flex items-center justify-center text-sm font-medium">18</div>
            </div>
            
            {/* Week 3 - Zomer/Herfst with ovulation */}
            <div className="grid grid-cols-7 gap-1 md:gap-2">
              <div className="aspect-square rounded-lg bg-yellow-100 flex items-center justify-center text-sm font-medium relative ring-2 ring-green-500 ring-offset-1">
                <span className="absolute top-0.5 right-0.5 text-yellow-500 text-xs">★</span>
                19
              </div>
              <div className="aspect-square rounded-lg bg-yellow-100 flex items-center justify-center text-sm font-medium ring-2 ring-green-500 ring-offset-1">20</div>
              <div className="aspect-square rounded-lg bg-orange-100 flex items-center justify-center text-sm font-medium">21</div>
              <div className="aspect-square rounded-lg bg-orange-100 flex items-center justify-center text-sm font-medium">22</div>
              <div className="aspect-square rounded-lg bg-orange-100 flex items-center justify-center text-sm font-medium">23</div>
              <div className="aspect-square rounded-lg bg-orange-100 flex items-center justify-center text-sm font-medium">24</div>
              <div className="aspect-square rounded-lg bg-orange-100 flex items-center justify-center text-sm font-medium">25</div>
            </div>
            
            {/* Week 4 - Herfst/Winter (pre-menstruation) */}
            <div className="grid grid-cols-7 gap-1 md:gap-2">
              <div className="aspect-square rounded-lg bg-orange-100 flex items-center justify-center text-sm font-medium">26</div>
              <div className="aspect-square rounded-lg bg-orange-100 flex items-center justify-center text-sm font-medium">27</div>
              <div className="aspect-square rounded-lg bg-orange-50 flex items-center justify-center text-sm font-medium">28</div>
              <div className="aspect-square rounded-lg bg-pink-100 flex items-center justify-center text-sm font-medium">29</div>
              <div className="aspect-square rounded-lg bg-pink-100 flex items-center justify-center text-sm font-medium">30</div>
              <div className="aspect-square rounded-lg bg-pink-100 flex items-center justify-center text-sm font-medium">31</div>
              <div className="aspect-square rounded-lg bg-blue-100 flex items-center justify-center text-sm font-medium relative">
                <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-red-400" />
                1
              </div>
            </div>
          </div>
        </motion.div>

        {/* Phase Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {phases.map((phase, index) => (
            <PhaseCard 
              key={phase.seasonKey} 
              seasonKey={phase.seasonKey} 
              icon={phase.icon} 
              index={index}
              color={phase.color}
              borderColor={phase.borderColor}
              iconBg={phase.iconBg}
            />
          ))}
        </div>

        {/* Daily Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-12 max-w-2xl mx-auto"
        >
          <div className="rounded-2xl overflow-hidden shadow-lg border border-border">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-200 to-blue-300 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center">
                  <Snowflake className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900">{t('cycle_syncing.seasons.winter')}</h4>
                  <p className="text-sm text-blue-800">{t('cycle_syncing.dashboard_preview.date')}</p>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="bg-gradient-to-b from-blue-50 to-white p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-muted-foreground/60">ⓘ</span>
                {t('cycle_syncing.dashboard_preview.possible')}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-3 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Utensils className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">{t('cycle_syncing.dashboard_preview.eating_today')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('cycle_syncing.dashboard_preview.eating_tip')}</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Dumbbell className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">{t('cycle_syncing.dashboard_preview.movement')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('cycle_syncing.dashboard_preview.movement_tip')}</p>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-center text-sm text-muted-foreground mt-4">
            {t('cycle_syncing.daily_advice')}
          </p>
        </motion.div>
      </div>
    </section>
  );
});

CycleSyncingSection.displayName = "CycleSyncingSection";