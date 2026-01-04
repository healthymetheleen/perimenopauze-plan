import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileText, AlertTriangle, Scale, Ban, RefreshCw } from 'lucide-react';

export default function Terms() {
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
              <FileText className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl text-gradient">Algemene Voorwaarden</CardTitle>
            <p className="text-muted-foreground mt-2">Perimenopauze Plan</p>
            <p className="text-sm text-muted-foreground">Laatst bijgewerkt: januari 2026 · Versie 1.0</p>
          </CardHeader>

          <CardContent className="prose prose-sm max-w-none pt-6 space-y-8">
            {/* 1. Dienst */}
            <section>
              <h2 className="text-lg font-semibold text-foreground">1. De Dienst</h2>
              <p className="text-muted-foreground">
                Perimenopauze Plan is een leefstijl- en zelfobservatie-app gericht op vrouwen in de 
                perimenopauze. De app helpt bij het bijhouden van cyclus, symptomen, voeding, slaap 
                en beweging, en biedt patroneninzichten ter ondersteuning van je welzijn.
              </p>
            </section>

            {/* 2. Medische Disclaimer */}
            <section>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                2. Medische Disclaimer (Belangrijk)
              </h2>
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mt-2">
                <p className="text-foreground font-medium">
                  Perimenopauze Plan is GEEN medisch hulpmiddel.
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                  <li>De app stelt <strong>geen diagnoses</strong></li>
                  <li>De app geeft <strong>geen behandeladviezen</strong></li>
                  <li>De app doet <strong>geen medische voorspellingen</strong></li>
                  <li>De app vervangt <strong>geen arts of zorgverlener</strong></li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  De informatie in deze app is bedoeld ter <strong>ondersteuning van zelfobservatie</strong> 
                  en algemene leefstijlondersteuning. Raadpleeg altijd een gekwalificeerde zorgverlener 
                  voor medische vragen, diagnoses of behandelingen.
                </p>
              </div>
            </section>

            {/* 3. Intended Use */}
            <section>
              <h2 className="text-lg font-semibold text-foreground">3. Beoogd Gebruik (Intended Use)</h2>
              <p className="text-muted-foreground">
                Deze app is bedoeld voor:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                <li>✅ Persoonlijke zelfobservatie en reflectie</li>
                <li>✅ Bijhouden van leefstijlpatronen</li>
                <li>✅ Educatie over de perimenopauze</li>
                <li>✅ Ondersteuning bij bewuste leefstijlkeuzes</li>
                <li>✅ Voorbereiding op gesprekken met je zorgverlener</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Deze app is <strong>niet</strong> bedoeld voor:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                <li>❌ Diagnosticeren van aandoeningen</li>
                <li>❌ Voorschrijven of adviseren van behandelingen</li>
                <li>❌ Monitoren van medische condities</li>
                <li>❌ Vervangen van professionele zorg</li>
              </ul>
            </section>

            {/* 4. Gebruikersverplichtingen */}
            <section>
              <h2 className="text-lg font-semibold text-foreground">4. Jouw Verplichtingen</h2>
              <p className="text-muted-foreground">Als gebruiker ga je akkoord met:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                <li>Waarheidsgetrouwe informatie invoeren</li>
                <li>De app alleen voor persoonlijk gebruik gebruiken</li>
                <li>Je accountgegevens vertrouwelijk houden</li>
                <li>De app niet misbruiken of proberen te hacken</li>
                <li>Geen content te uploaden die illegaal, schadelijk of beledigend is</li>
              </ul>
            </section>

            {/* 5. Intellectueel Eigendom */}
            <section>
              <h2 className="text-lg font-semibold text-foreground">5. Intellectueel Eigendom</h2>
              <p className="text-muted-foreground">
                Alle inhoud, ontwerp, code en functionaliteit van Perimenopauze Plan zijn beschermd 
                door auteursrecht en andere intellectuele eigendomsrechten. Je mag de app niet kopiëren, 
                reverse-engineeren of voor commerciële doeleinden gebruiken zonder schriftelijke toestemming.
              </p>
              <p className="text-muted-foreground mt-2">
                <strong>Je eigen data blijft van jou.</strong> Je behoudt alle rechten op de gegevens 
                die je invoert en kunt deze op elk moment exporteren of verwijderen.
              </p>
            </section>

            {/* 6. Aansprakelijkheidsbeperking */}
            <section>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                6. Aansprakelijkheidsbeperking
              </h2>
              <p className="text-muted-foreground">
                De app wordt geleverd "as is". Voor zover wettelijk toegestaan:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                <li>Zijn wij niet aansprakelijk voor directe of indirecte schade door gebruik van de app</li>
                <li>Garanderen wij geen ononderbroken of foutloze werking</li>
                <li>Zijn wij niet aansprakelijk voor beslissingen gebaseerd op app-informatie</li>
                <li>Is onze aansprakelijkheid beperkt tot het bedrag dat je hebt betaald voor de dienst</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Deze beperking geldt niet voor schade door opzet of grove nalatigheid onzerzijds, 
                of voor rechten die wettelijk niet kunnen worden beperkt.
              </p>
            </section>

            {/* 7. Beëindiging */}
            <section>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                7. Beëindiging
              </h2>
              <p className="text-muted-foreground">
                Je kunt op elk moment stoppen met het gebruik van de app en je account verwijderen 
                via Instellingen → Account. Wij behouden het recht om accounts te beëindigen bij:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                <li>Schending van deze voorwaarden</li>
                <li>Misbruik van de dienst</li>
                <li>Op verzoek van wetshandhaving</li>
              </ul>
            </section>

            {/* 8. Wijzigingen */}
            <section>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                8. Wijzigingen aan de Dienst
              </h2>
              <p className="text-muted-foreground">
                Wij behouden het recht om de app en deze voorwaarden te wijzigen. Bij significante 
                wijzigingen word je geïnformeerd en gevraagd opnieuw akkoord te gaan.
              </p>
            </section>

            {/* 9. Toepasselijk Recht */}
            <section>
              <h2 className="text-lg font-semibold text-foreground">9. Toepasselijk Recht</h2>
              <p className="text-muted-foreground">
                Op deze voorwaarden is Nederlands recht van toepassing. Geschillen worden voorgelegd 
                aan de bevoegde rechter in Nederland.
              </p>
            </section>

            {/* 10. Contact */}
            <section>
              <h2 className="text-lg font-semibold text-foreground">10. Contact</h2>
              <p className="text-muted-foreground">
                Vragen over deze voorwaarden? Neem contact op via de instellingen in de app.
              </p>
            </section>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Link to="/privacy">
            <Button variant="link" className="text-muted-foreground">
              Bekijk ook ons Privacybeleid →
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
