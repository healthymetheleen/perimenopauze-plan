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

const phases = [
  {
    season: "Winter",
    phase: "Menstruatie",
    days: "Dag 1-5",
    color: "from-blue-100 to-blue-200",
    borderColor: "border-blue-300",
    iconBg: "bg-blue-200",
    icon: Snowflake,
    expect: "Lage energie, behoefte aan rust",
    work: "Reflectie, planning, creatief werk",
    exercise: "Wandelen, zachte yoga, stretching",
    nutrition: "IJzerrijk: spinazie, rode biet, peulvruchten",
  },
  {
    season: "Lente",
    phase: "Folliculaire fase",
    days: "Dag 6-12",
    color: "from-green-100 to-green-200",
    borderColor: "border-green-300",
    iconBg: "bg-green-200",
    icon: Flower2,
    expect: "Stijgende energie, focus verbetert",
    work: "Nieuwe projecten starten, brainstormen",
    exercise: "Cardio, HIIT, groepslessen",
    nutrition: "Eiwitrijk, verse groenten, probiotica",
  },
  {
    season: "Zomer",
    phase: "Ovulatie",
    days: "Dag 13-16",
    color: "from-yellow-100 to-yellow-200",
    borderColor: "border-yellow-300",
    iconBg: "bg-yellow-200",
    icon: Sun,
    expect: "Piek energie, sociaal, zelfverzekerd",
    work: "Presentaties, onderhandelen, netwerken",
    exercise: "Intensieve training, sporten met anderen",
    nutrition: "Lichte maaltijden, antioxidanten, vezels",
  },
  {
    season: "Herfst",
    phase: "Luteale fase",
    days: "Dag 17-28",
    color: "from-orange-100 to-orange-200",
    borderColor: "border-orange-300",
    iconBg: "bg-orange-200",
    icon: Leaf,
    expect: "Dalende energie, PMS-symptomen mogelijk",
    work: "Afronden, detailwerk, administratie",
    exercise: "Pilates, zwemmen, matige cardio",
    nutrition: "Complex carbs, magnesium, B-vitamines",
  },
];

const PhaseCard = memo(({ phase, index }: { phase: typeof phases[0]; index: number }) => {
  const Icon = phase.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className={`rounded-2xl p-5 bg-gradient-to-br ${phase.color} border ${phase.borderColor}`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-full ${phase.iconBg} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-foreground/70" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{phase.season}</h3>
          <p className="text-sm text-muted-foreground">{phase.phase} · {phase.days}</p>
        </div>
      </div>
      
      <div className="space-y-3 text-sm">
        <div className="flex items-start gap-2">
          <Heart className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <span className="text-muted-foreground">{phase.expect}</span>
        </div>
        <div className="flex items-start gap-2">
          <Briefcase className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <span className="text-muted-foreground">{phase.work}</span>
        </div>
        <div className="flex items-start gap-2">
          <Dumbbell className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <span className="text-muted-foreground">{phase.exercise}</span>
        </div>
        <div className="flex items-start gap-2">
          <Utensils className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <span className="text-muted-foreground">{phase.nutrition}</span>
        </div>
      </div>
    </motion.div>
  );
});

PhaseCard.displayName = "PhaseCard";

export const CycleSyncingSection = memo(() => {
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
            Cycle Syncing
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Leef in harmonie met je cyclus
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ontdek wat je kunt verwachten de komende dagen en optimaliseer je{" "}
            <strong className="text-foreground">werk, beweging en voeding</strong> per cyclusfase. 
            Onze app geeft je dagelijks gepersonaliseerd advies.
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
          <div className="flex items-center justify-center gap-4 md:gap-8 mb-4 flex-wrap text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="text-muted-foreground">Menstruatie</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-pink-300" />
              <span className="text-muted-foreground">Verwacht</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border-2 border-green-400 bg-transparent" />
              <span className="text-muted-foreground">Vruchtbaar</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-500">★</span>
              <span className="text-muted-foreground">Ovulatie</span>
            </div>
          </div>
          
          <div className="space-y-2">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 md:gap-2">
              {["ma", "di", "wo", "do", "vr", "za", "zo"].map((day) => (
                <div key={day} className="text-center text-xs text-muted-foreground py-1">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Week 1 - Winter (Menstruatie) */}
            <div className="relative">
              <span className="absolute -left-2 md:left-0 top-1/2 -translate-y-1/2 -translate-x-full text-xs font-medium text-blue-600 hidden md:block">Winter</span>
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
              <span className="absolute -right-2 md:right-0 top-1/2 -translate-y-1/2 translate-x-full text-xs font-medium text-green-600 hidden md:block">Lente</span>
            </div>
            
            {/* Week 2 - Lente/Zomer with fertile window */}
            <div className="relative">
              <div className="grid grid-cols-7 gap-1 md:gap-2">
                <div className="aspect-square rounded-lg bg-green-100 flex items-center justify-center text-sm font-medium">12</div>
                <div className="aspect-square rounded-lg bg-green-100 flex items-center justify-center text-sm font-medium">13</div>
                {/* Fertile window with green border */}
                <div className="aspect-square rounded-lg bg-green-200 flex items-center justify-center text-sm font-medium ring-2 ring-green-500 ring-offset-1">14</div>
                <div className="aspect-square rounded-lg bg-green-200 flex items-center justify-center text-sm font-medium ring-2 ring-green-500 ring-offset-1">15</div>
                <div className="aspect-square rounded-lg bg-green-200 flex items-center justify-center text-sm font-medium ring-2 ring-green-500 ring-offset-1">16</div>
                <div className="aspect-square rounded-lg bg-green-200 flex items-center justify-center text-sm font-medium ring-2 ring-green-500 ring-offset-1">17</div>
                <div className="aspect-square rounded-lg bg-yellow-100 flex items-center justify-center text-sm font-medium">18</div>
              </div>
              <span className="absolute -right-2 md:right-0 top-1/2 -translate-y-1/2 translate-x-full text-xs font-medium text-yellow-600 hidden md:block">Zomer</span>
            </div>
            
            {/* Week 3 - Zomer/Herfst with ovulation */}
            <div className="relative">
              <span className="absolute -left-2 md:left-0 top-1/2 -translate-y-1/2 -translate-x-full text-xs font-medium text-orange-600 hidden md:block">Herfst</span>
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
            </div>
            
            {/* Week 4 - Herfst/Winter (pre-menstruation) */}
            <div className="relative">
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
          </div>
        </motion.div>

        {/* Phase Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {phases.map((phase, index) => (
            <PhaseCard key={phase.season} phase={phase} index={index} />
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
                  <h4 className="font-semibold text-blue-900">Winter</h4>
                  <p className="text-sm text-blue-800">maandag 6 januari · Folliculaire fase</p>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="bg-gradient-to-b from-blue-50 to-white p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-muted-foreground/60">ⓘ</span>
                Mogelijk: Vermoeidheid · Krampen · Lage energie
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-3 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Utensils className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">Eten vandaag</span>
                  </div>
                  <p className="text-xs text-muted-foreground">💡 IJzerrijk: spinazie, rode biet</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Dumbbell className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">Bewegen</span>
                  </div>
                  <p className="text-xs text-muted-foreground">15 min aanbevolen</p>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-center text-sm text-muted-foreground mt-4">
            Dagelijks gepersonaliseerd advies gebaseerd op jouw cyclusfase
          </p>
        </motion.div>
      </div>
    </section>
  );
});

CycleSyncingSection.displayName = "CycleSyncingSection";
