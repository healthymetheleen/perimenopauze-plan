import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, Legend, BarChart, Bar, Cell
} from "recharts";
import { 
  Brain, Heart, Flame, Moon, Zap, Droplets, Scale, 
  ThermometerSun, CloudRain, Frown, Activity, Clock,
  Info, TrendingDown, Calendar, Sparkles, BookOpen
} from "lucide-react";

// Hormone data over time (age 35-55)
const hormoneData = [
  { age: 35, estrogeen: 100, progesteron: 100, fsh: 10, label: "Pre-menopauze" },
  { age: 38, estrogeen: 95, progesteron: 90, fsh: 12, label: "" },
  { age: 40, estrogeen: 85, progesteron: 75, fsh: 15, label: "Vroege perimenopauze" },
  { age: 42, estrogeen: 90, progesteron: 60, fsh: 18, label: "" },
  { age: 44, estrogeen: 70, progesteron: 45, fsh: 25, label: "" },
  { age: 45, estrogeen: 80, progesteron: 35, fsh: 30, label: "Late perimenopauze" },
  { age: 47, estrogeen: 50, progesteron: 25, fsh: 45, label: "" },
  { age: 48, estrogeen: 60, progesteron: 20, fsh: 55, label: "" },
  { age: 50, estrogeen: 30, progesteron: 10, fsh: 70, label: "" },
  { age: 51, estrogeen: 20, progesteron: 5, fsh: 85, label: "Menopauze" },
  { age: 53, estrogeen: 15, progesteron: 5, fsh: 90, label: "" },
  { age: 55, estrogeen: 10, progesteron: 5, fsh: 95, label: "Post-menopauze" },
];

// Symptom prevalence data
const symptomData = [
  { symptom: "Opvliegers", percentage: 75, category: "fysiek" },
  { symptom: "Slaapproblemen", percentage: 60, category: "fysiek" },
  { symptom: "Stemmingswisselingen", percentage: 55, category: "emotioneel" },
  { symptom: "Gewichtstoename", percentage: 50, category: "fysiek" },
  { symptom: "Vermoeidheid", percentage: 48, category: "fysiek" },
  { symptom: "Concentratieproblemen", percentage: 45, category: "cognitief" },
  { symptom: "Gewrichtspijn", percentage: 40, category: "fysiek" },
  { symptom: "Angstgevoelens", percentage: 35, category: "emotioneel" },
  { symptom: "Droge huid", percentage: 30, category: "fysiek" },
  { symptom: "Libidoverlies", percentage: 28, category: "fysiek" },
];

const categoryColors: Record<string, string> = {
  fysiek: "hsl(var(--primary))",
  emotioneel: "hsl(var(--accent))",
  cognitief: "hsl(var(--secondary))",
};

// Timeline data
const timelineData = [
  {
    phase: "Pre-menopauze",
    ageRange: "30-40 jaar",
    duration: "Jarenlang",
    description: "Stabiele hormoonspiegels met regelmatige cycli. Je lichaam functioneert zoals je gewend bent.",
    color: "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700",
  },
  {
    phase: "Vroege Perimenopauze",
    ageRange: "40-45 jaar",
    duration: "2-4 jaar",
    description: "Eerste schommelingen beginnen. Cycli kunnen korter of langer worden, eerste subtiele symptomen.",
    color: "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700",
  },
  {
    phase: "Late Perimenopauze",
    ageRange: "45-51 jaar",
    duration: "2-4 jaar",
    description: "Sterke hormoonschommelingen, onregelmatige cycli, duidelijke symptomen zoals opvliegers.",
    color: "bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700",
  },
  {
    phase: "Menopauze",
    ageRange: "~51 jaar",
    duration: "1 dag",
    description: "Het moment dat je 12 maanden geen menstruatie hebt gehad. Gemiddelde leeftijd is 51 jaar.",
    color: "bg-rose-100 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700",
  },
  {
    phase: "Post-menopauze",
    ageRange: "51+ jaar",
    duration: "Rest van je leven",
    description: "Hormonen stabiliseren op een lager niveau. Veel symptomen verminderen, maar nieuwe aandachtspunten.",
    color: "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700",
  },
];

const symptoms = {
  fysiek: [
    { icon: ThermometerSun, name: "Opvliegers", description: "Plotselinge warmtegolven, vaak met zweten" },
    { icon: Moon, name: "Slaapproblemen", description: "Moeite met inslapen of doorslapen" },
    { icon: Scale, name: "Gewichtsverandering", description: "Vooral rond de buik" },
    { icon: Droplets, name: "Droge huid & slijmvliezen", description: "Door afnemend oestrogeen" },
    { icon: Activity, name: "Hartkloppingen", description: "Onregelmatige hartslag" },
    { icon: Zap, name: "Gewrichtspijn", description: "Stijfheid en pijn in gewrichten" },
  ],
  emotioneel: [
    { icon: CloudRain, name: "Stemmingswisselingen", description: "Van blij naar verdrietig in korte tijd" },
    { icon: Frown, name: "Angst & paniek", description: "Meer gevoelig voor stress" },
    { icon: Heart, name: "Prikkelbaarheid", description: "Sneller geïrriteerd" },
    { icon: Flame, name: "Verminderd libido", description: "Minder zin in intimiteit" },
  ],
  cognitief: [
    { icon: Brain, name: "Hersenmist", description: "Concentratie- en geheugenproblemen" },
    { icon: Clock, name: "Vermoeidheid", description: "Chronische moeheid ondanks rust" },
  ],
};

const statistics = [
  { label: "Gemiddelde startleeftijd perimenopauze", value: "45 jaar", subtext: "Range: 40-48 jaar" },
  { label: "Gemiddelde duur perimenopauze", value: "4-8 jaar", subtext: "Kan variëren van 2-10 jaar" },
  { label: "Gemiddelde leeftijd menopauze", value: "51 jaar", subtext: "Range: 45-55 jaar" },
  { label: "Vrouwen met symptomen", value: "85%", subtext: "De meeste ervaren klachten" },
];

const Education = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-12 md:py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              <BookOpen className="w-3 h-3 mr-1" />
              Educatie
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Alles over de{" "}
              <span className="text-primary">Perimenopauze</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Een natuurlijke levensfase die elke vrouw doormaakt. Begrijpen wat er gebeurt 
              in je lichaam helpt je om deze periode met meer rust en zelfvertrouwen te doorlopen.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {statistics.map((stat, index) => (
                <Card key={index} className="bg-card/80 backdrop-blur">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 pb-12 space-y-12">
        {/* What is Perimenopause */}
        <section>
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                Wat is de perimenopauze?
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    De <strong>perimenopauze</strong> is de overgangsperiode naar de menopauze. 
                    Het woord komt van het Grieks: "peri" betekent "rondom". Het is de tijd 
                    waarin je lichaam zich voorbereidt op het stoppen van de vruchtbare jaren.
                  </p>
                  <p className="text-muted-foreground">
                    Tijdens deze fase beginnen je eierstokken minder hormonen te produceren. 
                    Dit gebeurt niet geleidelijk, maar in <strong>golven</strong> - waardoor je 
                    hormoonspiegels sterk kunnen schommelen van dag tot dag.
                  </p>
                  <p className="text-muted-foreground">
                    Deze schommelingen zijn de oorzaak van de vele symptomen die vrouwen ervaren. 
                    Het goede nieuws: zodra je door de menopauze bent, stabiliseren de hormonen 
                    weer en nemen veel klachten af.
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Wist je dat...
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      Je nog steeds zwanger kunt worden tijdens de perimenopauze
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      Stress en leefstijl invloed hebben op de ernst van symptomen
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      Elke vrouw de perimenopauze anders ervaart
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      Beweging en voeding symptomen significant kunnen verminderen
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      Je hersenen zich aanpassen aan de nieuwe hormoonbalans
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Hormone Chart */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-primary" />
                Hormoonveranderingen door de jaren
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Zo veranderen je belangrijkste hormonen tijdens de overgang
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hormoneData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorEstrogeen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorProgesteron" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorFSH" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="age" 
                      tickFormatter={(value) => `${value} jaar`}
                      className="text-xs"
                    />
                    <YAxis 
                      tickFormatter={(value) => `${value}%`}
                      className="text-xs"
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const item = hormoneData.find(d => d.age === label);
                          return (
                            <div className="bg-popover border rounded-lg shadow-lg p-3">
                              <p className="font-semibold">{label} jaar</p>
                              {item?.label && (
                                <p className="text-xs text-primary mb-2">{item.label}</p>
                              )}
                              {payload.map((entry, index) => (
                                <p key={index} className="text-sm" style={{ color: entry.color }}>
                                  {entry.name}: {entry.value}%
                                </p>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="estrogeen" 
                      name="Oestrogeen"
                      stroke="hsl(var(--primary))" 
                      fillOpacity={1} 
                      fill="url(#colorEstrogeen)" 
                      strokeWidth={2}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="progesteron" 
                      name="Progesteron"
                      stroke="hsl(var(--accent))" 
                      fillOpacity={1} 
                      fill="url(#colorProgesteron)"
                      strokeWidth={2}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="fsh" 
                      name="FSH (stijgt!)"
                      stroke="hsl(var(--secondary))" 
                      fillOpacity={1} 
                      fill="url(#colorFSH)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 grid md:grid-cols-3 gap-4">
                <div className="bg-primary/10 rounded-lg p-4">
                  <h4 className="font-semibold text-primary mb-2">Oestrogeen</h4>
                  <p className="text-sm text-muted-foreground">
                    Het "vrouwelijke" hormoon. Daalt niet geleidelijk, maar schommelt wild 
                    tijdens de perimenopauze. Dit veroorzaakt veel van de bekende symptomen.
                  </p>
                </div>
                <div className="bg-accent/10 rounded-lg p-4">
                  <h4 className="font-semibold text-accent-foreground mb-2">Progesteron</h4>
                  <p className="text-sm text-muted-foreground">
                    Het "kalmerende" hormoon. Daalt als eerste en sneller dan oestrogeen. 
                    Dit kan leiden tot angst, slaapproblemen en onregelmatige cycli.
                  </p>
                </div>
                <div className="bg-secondary/10 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">FSH</h4>
                  <p className="text-sm text-muted-foreground">
                    Follikelstimulerend hormoon. Stijgt omdat je hypofyse harder werkt 
                    om de eierstokken te stimuleren. Hoog FSH = teken van perimenopauze.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Timeline */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                De fases van de overgang
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-400 via-orange-400 to-purple-400" />
                
                <div className="space-y-8">
                  {timelineData.map((phase, index) => (
                    <div 
                      key={phase.phase}
                      className={`relative flex items-start gap-4 md:gap-8 ${
                        index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                      }`}
                    >
                      {/* Dot */}
                      <div className="absolute left-4 md:left-1/2 w-3 h-3 rounded-full bg-background border-2 border-primary transform -translate-x-1/2 mt-2" />
                      
                      {/* Content */}
                      <div className={`ml-10 md:ml-0 md:w-1/2 ${index % 2 === 0 ? "md:pr-12" : "md:pl-12"}`}>
                        <Card className={`border-2 ${phase.color}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold">{phase.phase}</h4>
                              <Badge variant="outline">{phase.ageRange}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              Duur: {phase.duration}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {phase.description}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Symptoms */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Veelvoorkomende symptomen
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Tot 85% van de vrouwen ervaart symptomen. Dit is wat je kunt verwachten.
              </p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overzicht" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-6">
                  <TabsTrigger value="overzicht">Overzicht</TabsTrigger>
                  <TabsTrigger value="fysiek">Fysiek</TabsTrigger>
                  <TabsTrigger value="emotioneel">Emotioneel</TabsTrigger>
                  <TabsTrigger value="cognitief">Cognitief</TabsTrigger>
                </TabsList>

                <TabsContent value="overzicht">
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={symptomData} 
                        layout="vertical"
                        margin={{ top: 0, right: 30, left: 100, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                        <XAxis 
                          type="number" 
                          tickFormatter={(value) => `${value}%`}
                          domain={[0, 100]}
                        />
                        <YAxis 
                          type="category" 
                          dataKey="symptom" 
                          width={100}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-popover border rounded-lg shadow-lg p-3">
                                  <p className="font-semibold">{data.symptom}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {data.percentage}% van de vrouwen
                                  </p>
                                  <Badge variant="outline" className="mt-1 text-xs">
                                    {data.category}
                                  </Badge>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar 
                          dataKey="percentage" 
                          radius={[0, 4, 4, 0]}
                        >
                          {symptomData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={categoryColors[entry.category]}
                              fillOpacity={0.8}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span className="text-sm text-muted-foreground">Fysiek</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-accent" />
                      <span className="text-sm text-muted-foreground">Emotioneel</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-secondary" />
                      <span className="text-sm text-muted-foreground">Cognitief</span>
                    </div>
                  </div>
                </TabsContent>

                {(Object.keys(symptoms) as Array<keyof typeof symptoms>).map((category) => (
                  <TabsContent key={category} value={category}>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {symptoms[category].map((symptom) => (
                        <Card key={symptom.name} className="bg-muted/50">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <symptom.icon className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <h4 className="font-medium">{symptom.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {symptom.description}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </section>

        {/* Why this happens */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                Waarom gebeurt dit?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg p-5">
                    <h4 className="font-semibold mb-3">🥚 De eierstokken</h4>
                    <p className="text-sm text-muted-foreground">
                      Je wordt geboren met ongeveer 1-2 miljoen eicellen. Tegen de tijd dat je 
                      de perimenopauze bereikt, zijn er nog maar enkele duizenden over. 
                      Je eierstokken beginnen minder efficiënt te werken en produceren 
                      minder hormonen.
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-accent/10 to-secondary/10 rounded-lg p-5">
                    <h4 className="font-semibold mb-3">🧠 De hypofyse</h4>
                    <p className="text-sm text-muted-foreground">
                      Je hersenen merken dat er minder hormonen zijn en sturen steeds sterkere 
                      signalen (FSH) naar de eierstokken. Dit "roepen" van de hersenen naar 
                      de eierstokken is deels verantwoordelijk voor opvliegers.
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-secondary/10 to-primary/10 rounded-lg p-5">
                    <h4 className="font-semibold mb-3">⚖️ De onbalans</h4>
                    <p className="text-sm text-muted-foreground">
                      Oestrogeen en progesteron werken samen als een team. Wanneer progesteron 
                      sneller daalt dan oestrogeen, ontstaat er een relatieve oestrogeen-dominantie. 
                      Dit kan leiden tot zwaardere menstruaties en stemmingswisselingen.
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg p-5">
                    <h4 className="font-semibold mb-3">🌊 De schommelingen</h4>
                    <p className="text-sm text-muted-foreground">
                      Je hormonen dalen niet in een rechte lijn, maar schommelen wild. 
                      De ene dag kun je je geweldig voelen, de volgende dag ellendig. 
                      Dit is normaal en tijdelijk - na de menopauze stabiliseert alles weer.
                    </p>
                  </div>
                </div>
              </div>
              
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-5">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-primary" />
                    Het goede nieuws
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    De perimenopauze is een <strong>tijdelijke fase</strong>. Je lichaam past 
                    zich aan de nieuwe hormoonbalans aan. Met de juiste kennis, leefstijl en 
                    ondersteuning kun je deze periode veel makkelijker doorkomen. 
                    Veel vrouwen voelen zich na de menopauze bevrijd en energieker dan ooit!
                  </p>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </section>

        {/* Call to action */}
        <section>
          <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-3">Begin met het bijhouden van jouw ervaring</h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Door je symptomen, cycli, slaap en voeding bij te houden, krijg je inzicht 
                in jouw unieke patronen. Zo kun je beter begrijpen wat voor jou werkt.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Badge variant="secondary" className="text-sm py-1.5 px-3">
                  📊 Trends ontdekken
                </Badge>
                <Badge variant="secondary" className="text-sm py-1.5 px-3">
                  🌙 Slaap verbeteren
                </Badge>
                <Badge variant="secondary" className="text-sm py-1.5 px-3">
                  🍽️ Voeding optimaliseren
                </Badge>
                <Badge variant="secondary" className="text-sm py-1.5 px-3">
                  🏃‍♀️ Beweging afstemmen
                </Badge>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default Education;
