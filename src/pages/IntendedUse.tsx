import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Target, Check, X, AlertTriangle, FileText } from 'lucide-react';

export default function IntendedUse() {
  return (
    <div className="min-h-screen bg-gradient-subtle px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <Link to="/login">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug
          </Button>
        </Link>

        <Card className="glass-strong rounded-2xl">
          <CardHeader className="text-center border-b border-border/50 pb-6">
            <div className="flex justify-center mb-4">
              <Target className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl text-gradient">Intended Use Statement</CardTitle>
            <p className="text-muted-foreground mt-2">Perimenopauze Plan</p>
            <p className="text-sm text-muted-foreground">Versie 1.0 · Classificatie: Niet-medisch hulpmiddel</p>
          </CardHeader>

          <CardContent className="prose prose-sm max-w-none pt-6 space-y-8">
            {/* Official Intended Use Statement */}
            <section className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-foreground mt-0">
                Beoogd gebruik (Intended Use)
              </h2>
              <p className="text-muted-foreground mb-2">
                Deze app is bedoeld om gebruikers inzicht te geven in leefstijl- en cyclusgerelateerde 
                patronen, zoals voeding, welzijn en ervaren klachten.
              </p>
              <p className="text-muted-foreground mb-2">
                De app ondersteunt zelfobservatie en bewustwording en is gericht op preventie en leefstijl.
              </p>
              <p className="text-muted-foreground mb-2">
                De app stelt geen medische diagnoses, doet geen prognoses en biedt geen ondersteuning 
                bij medische behandelingen of therapiekeuzes.
              </p>
              <p className="text-muted-foreground mb-0">
                De informatie en inzichten die de app biedt zijn niet bedoeld ter vervanging van 
                professioneel medisch advies.
              </p>
            </section>

            {/* MDR Classification */}
            <section className="bg-success/10 border border-success/30 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mt-0">
                <FileText className="h-5 w-5 text-success" />
                MDR/IVDR Classificatie
              </h2>
              <p className="text-foreground font-medium mb-2">
                Perimenopauze Plan is <strong>GEEN medisch hulpmiddel</strong> in de zin van de 
                EU Verordening Medische Hulpmiddelen (MDR 2017/745).
              </p>
              <p className="text-muted-foreground mb-0">
                De software valt buiten de scope van de MDR omdat het geen medisch doel heeft 
                en niet bedoeld is voor diagnose, preventie, monitoring, voorspelling, prognose, 
                behandeling of verlichting van ziekte.
              </p>
            </section>

            {/* Product Description */}
            <section>
              <h2 className="text-lg font-semibold text-foreground">1. Productbeschrijving</h2>
              <p className="text-muted-foreground">
                Perimenopauze Plan is een mobiele/web applicatie voor leefstijlondersteuning en 
                zelfobservatie, specifiek ontworpen voor vrouwen in de perimenopauze. De app 
                stelt gebruikers in staat om persoonlijke gegevens bij te houden en patronen 
                te herkennen ter ondersteuning van hun algehele welzijn.
              </p>
            </section>

            {/* Intended Purpose */}
            <section>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Check className="h-5 w-5 text-success" />
                2. Beoogd Gebruik (Intended Purpose)
              </h2>
              <p className="text-muted-foreground">
                De app is bedoeld voor:
              </p>
              <ul className="space-y-2 mt-3">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground"><strong>Zelfobservatie:</strong> Bijhouden van menstruatiecyclus, symptomen, stemming en energieniveau</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground"><strong>Leefstijlregistratie:</strong> Vastleggen van voeding, slaap en beweging</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground"><strong>Patronenherkenning:</strong> Visualisatie van trends in eigen data</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground"><strong>Educatie:</strong> Algemene informatie over de perimenopauze</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground"><strong>Gespreksvoorbereiding:</strong> Data-export voor gesprekken met zorgverleners</span>
                </li>
              </ul>
            </section>

            {/* Contraindications */}
            <section>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <X className="h-5 w-5 text-destructive" />
                3. Niet-Beoogd Gebruik (Contraindications)
              </h2>
              <p className="text-muted-foreground">
                De app is <strong>NIET</strong> bedoeld voor:
              </p>
              <ul className="space-y-2 mt-3">
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-destructive mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground">Diagnosticeren van medische aandoeningen of ziekten</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-destructive mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground">Voorschrijven of adviseren van behandelingen of medicatie</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-destructive mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground">Medische monitoring van patiënten</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-destructive mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground">Voorspellen van medische risico's of prognoses</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-destructive mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground">Bepalen of beïnvloeden van hormoonwaarden</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-destructive mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground">Ondersteunen van klinische besluitvorming door zorgverleners</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-destructive mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground">Vervangen van professioneel medisch advies</span>
                </li>
              </ul>
            </section>

            {/* Target Users */}
            <section>
              <h2 className="text-lg font-semibold text-foreground">4. Doelgroep</h2>
              <p className="text-muted-foreground">
                <strong>Primaire gebruikers:</strong> Vrouwen in de perimenopauze die hun leefstijl 
                en welzijn willen ondersteunen door zelfobservatie en bewuste keuzes.
              </p>
              <p className="text-muted-foreground mt-2">
                <strong>Leeftijdscategorie:</strong> Volwassenen (18+)
              </p>
              <p className="text-muted-foreground mt-2">
                <strong>Gebruikscontext:</strong> Persoonlijk/thuisgebruik, niet in klinische setting
              </p>
            </section>

            {/* Technical Safeguards */}
            <section>
              <h2 className="text-lg font-semibold text-foreground">5. Technische Waarborgen</h2>
              <p className="text-muted-foreground">
                De volgende maatregelen zijn geïmplementeerd om niet-medisch gebruik te waarborgen:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                <li>AI-guardrails die medische claims, diagnoses en behandeladviezen blokkeren</li>
                <li>Expliciete disclaimers bij alle output</li>
                <li>Consent flow met medische disclaimer vóór eerste gebruik</li>
                <li>Geen koppeling met medische apparatuur of zorgsystemen</li>
                <li>Geen claims over effectiviteit bij aandoeningen</li>
              </ul>
            </section>

            {/* Regulatory Basis */}
            <section>
              <h2 className="text-lg font-semibold text-foreground">6. Regulatoire Basis</h2>
              <p className="text-muted-foreground">
                Deze classificatie is gebaseerd op:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                <li>EU Verordening 2017/745 (MDR) - Artikel 2, definitie van medisch hulpmiddel</li>
                <li>MDCG 2019-11 Guidance on Qualification and Classification of Software</li>
                <li>MDCG 2021-24 Guidance on classification of medical devices</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                De app voldoet niet aan de MDR-definitie van een medisch hulpmiddel omdat het 
                primaire doel <strong>leefstijlondersteuning en educatie</strong> is, niet 
                diagnose, behandeling of monitoring van ziekte.
              </p>
            </section>

            {/* Warning */}
            <section className="bg-warning/10 border border-warning/30 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mt-0">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Belangrijke Waarschuwing
              </h2>
              <p className="text-muted-foreground mb-0">
                Als je medische klachten hebt of je zorgen maakt over je gezondheid, neem dan 
                altijd contact op met een gekwalificeerde zorgverlener. De informatie in deze 
                app is geen vervanging voor professioneel medisch advies, diagnose of behandeling.
              </p>
            </section>

            {/* Document Info */}
            <section className="text-center pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                Dit document dient als formele vastlegging van het beoogd gebruik van 
                Perimenopauze Plan conform EU-regelgeving.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Versie 1.0 · Datum: januari 2026
              </p>
            </section>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4 mt-6">
          <Link to="/privacy">
            <Button variant="link" className="text-muted-foreground">
              Privacybeleid
            </Button>
          </Link>
          <Link to="/terms">
            <Button variant="link" className="text-muted-foreground">
              Algemene Voorwaarden
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
