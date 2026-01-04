import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Shield, Database, Lock, UserCheck, Trash2, Download, Globe } from 'lucide-react';

export default function PrivacyPolicy() {
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
              <Shield className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl text-gradient">Privacybeleid</CardTitle>
            <p className="text-muted-foreground mt-2">Perimenopauze Plan</p>
            <p className="text-sm text-muted-foreground">Laatst bijgewerkt: januari 2026 · Versie 1.0</p>
          </CardHeader>

          <CardContent className="prose prose-sm max-w-none pt-6 space-y-8">
            {/* Intro */}
            <section>
              <p className="text-foreground leading-relaxed">
                Bij Perimenopauze Plan nemen we je privacy uiterst serieus. Dit privacybeleid legt uit 
                welke gegevens we verzamelen, waarom we dat doen, en hoe we jouw rechten beschermen 
                conform de Algemene Verordening Gegevensbescherming (AVG/GDPR).
              </p>
            </section>

            {/* 1. Verwerkingsverantwoordelijke */}
            <section>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                1. Verwerkingsverantwoordelijke
              </h2>
              <p className="text-muted-foreground">
                Perimenopauze Plan is verantwoordelijk voor de verwerking van je persoonsgegevens. 
                Voor vragen over privacy kun je contact opnemen via de instellingen in de app.
              </p>
            </section>

            {/* 2. Welke gegevens verzamelen we */}
            <section>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                2. Welke gegevens verzamelen we
              </h2>
              
              <h3 className="text-base font-medium text-foreground mt-4">Accountgegevens</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>E-mailadres (voor authenticatie)</li>
                <li>Weergavenaam (optioneel)</li>
              </ul>

              <h3 className="text-base font-medium text-foreground mt-4">Gezondheidsgegevens (bijzondere persoonsgegevens)</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Cyclusgegevens (menstruatiedata, cycluslengte)</li>
                <li>Symptomen en klachten</li>
                <li>Eetdagboek (maaltijden, voedingswaarden)</li>
                <li>Slaapgegevens (duur, kwaliteit)</li>
                <li>Bewegingsgegevens (stappen)</li>
                <li>Stemming en energieniveau</li>
              </ul>

              <h3 className="text-base font-medium text-foreground mt-4">Technische gegevens</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Tijdzone (voor correcte weergave)</li>
                <li>Toestemmingsregistraties</li>
              </ul>
            </section>

            {/* 3. Rechtsgrond */}
            <section>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                3. Rechtsgrond voor verwerking
              </h2>
              <p className="text-muted-foreground">
                Wij verwerken je gegevens op basis van:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                <li><strong>Uitdrukkelijke toestemming (Art. 6(1)(a) en 9(2)(a) AVG)</strong> – Je geeft 
                  expliciete toestemming voor de verwerking van gezondheidsgegevens voordat je de app gebruikt.</li>
                <li><strong>Uitvoering overeenkomst (Art. 6(1)(b) AVG)</strong> – Om de dienst te leveren 
                  die je hebt aangevraagd.</li>
              </ul>
            </section>

            {/* 4. Doeleinden */}
            <section>
              <h2 className="text-lg font-semibold text-foreground">4. Doeleinden van verwerking</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Bijhouden van je persoonlijke dagboek</li>
                <li>Herkennen van patronen in je cyclus en symptomen</li>
                <li>Bieden van gepersonaliseerde inzichten (met AI-ondersteuning, indien toegestaan)</li>
                <li>Verbeteren van de app-ervaring</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                <strong>Wij verkopen of delen je gegevens nooit met derden voor commerciële doeleinden.</strong>
              </p>
            </section>

            {/* 5. AI-verwerking */}
            <section>
              <h2 className="text-lg font-semibold text-foreground">5. AI-verwerking</h2>
              <p className="text-muted-foreground">
                Indien je toestemming geeft voor AI-ondersteuning:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                <li>AI ontvangt alleen geanonimiseerde, geaggregeerde statistieken</li>
                <li>Geen herleidbare persoonsgegevens worden naar AI gestuurd</li>
                <li>AI-verwerking gebeurt via beveiligde servers (OpenAI API via Supabase Edge Functions)</li>
                <li>Je kunt AI-toestemming op elk moment intrekken</li>
              </ul>
            </section>

            {/* 6. Bewaartermijnen */}
            <section>
              <h2 className="text-lg font-semibold text-foreground">6. Bewaartermijnen</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Gezondheidsgegevens: maximaal 12 maanden actief, daarna automatisch verwijderd</li>
                <li>AI-gebruikslogboek: maximaal 6 maanden</li>
                <li>Accountgegevens: tot je je account verwijdert</li>
              </ul>
            </section>

            {/* 7. Beveiliging */}
            <section>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                7. Beveiliging en datalocatie
              </h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li><strong>Data locatie:</strong> Alle gegevens worden opgeslagen op servers in de Europese Unie</li>
                <li><strong>Encryptie:</strong> Data is versleuteld in rust en tijdens transport (TLS/HTTPS)</li>
                <li><strong>Toegangscontrole:</strong> Row Level Security zorgt dat je alleen je eigen data ziet</li>
                <li><strong>Authenticatie:</strong> Beveiligde login met wachtwoord-hashing</li>
              </ul>
            </section>

            {/* 8. Jouw rechten */}
            <section>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                8. Jouw rechten (AVG Artikelen 15-22)
              </h2>
              <p className="text-muted-foreground">Je hebt de volgende rechten:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                <li><strong>Recht op inzage (Art. 15)</strong> – Bekijk welke gegevens we van je hebben</li>
                <li><strong>Recht op rectificatie (Art. 16)</strong> – Corrigeer onjuiste gegevens</li>
                <li><strong>Recht op verwijdering (Art. 17)</strong> – Verwijder al je gegevens</li>
                <li><strong>Recht op beperking (Art. 18)</strong> – Beperk de verwerking</li>
                <li><strong>Recht op dataportabiliteit (Art. 20)</strong> – Exporteer je data in JSON-formaat</li>
                <li><strong>Recht om toestemming in te trekken</strong> – Op elk moment, zonder opgaaf van reden</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Je kunt deze rechten uitoefenen via <strong>Instellingen → Account</strong> in de app.
              </p>
            </section>

            {/* 9. Verwijdering */}
            <section>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                9. Account en data verwijderen
              </h2>
              <p className="text-muted-foreground">
                Via <strong>Instellingen → Account → Account verwijderen</strong> kun je al je gegevens 
                permanent verwijderen. Dit is onomkeerbaar en verwijdert:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                <li>Al je dagboekgegevens</li>
                <li>Cyclusgegevens en symptomen</li>
                <li>Slaap- en bewegingsgegevens</li>
                <li>Je accountprofiel</li>
                <li>Alle toestemmingsregistraties</li>
              </ul>
            </section>

            {/* 10. Subverwerkers */}
            <section>
              <h2 className="text-lg font-semibold text-foreground">10. Subverwerkers</h2>
              <p className="text-muted-foreground">We gebruiken de volgende dienstverleners:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                <li><strong>Supabase (EU)</strong> – Database, authenticatie, bestandsopslag</li>
                <li><strong>Lovable (hosting)</strong> – Frontend hosting</li>
                <li><strong>OpenAI</strong> – AI-analyse (alleen met toestemming, geanonimiseerde data)</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Met alle subverwerkers zijn verwerkersovereenkomsten afgesloten.
              </p>
            </section>

            {/* 11. Klachten */}
            <section>
              <h2 className="text-lg font-semibold text-foreground">11. Klachten</h2>
              <p className="text-muted-foreground">
                Als je een klacht hebt over de verwerking van je persoonsgegevens, kun je contact 
                opnemen via de app of een klacht indienen bij de Autoriteit Persoonsgegevens 
                (<a href="https://autoriteitpersoonsgegevens.nl" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">autoriteitpersoonsgegevens.nl</a>).
              </p>
            </section>

            {/* 12. Wijzigingen */}
            <section>
              <h2 className="text-lg font-semibold text-foreground">12. Wijzigingen</h2>
              <p className="text-muted-foreground">
                Dit privacybeleid kan worden bijgewerkt. Bij significante wijzigingen word je 
                gevraagd opnieuw toestemming te geven. Je kunt de huidige versie altijd raadplegen 
                via deze pagina.
              </p>
            </section>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Link to="/terms">
            <Button variant="link" className="text-muted-foreground">
              Bekijk ook onze Algemene Voorwaarden →
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
