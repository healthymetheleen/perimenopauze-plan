import { Lock, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PaywallCardProps {
  feature: string;
  description: string;
  benefits?: string[];
}

export function PaywallCard({ feature, description, benefits = [] }: PaywallCardProps) {
  return (
    <Card className="bg-card border-2 border-primary/20 rounded-2xl">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl">{feature}</CardTitle>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {benefits.length > 0 && (
          <ul className="space-y-2">
            {benefits.map((benefit, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        )}
        <Button asChild className="w-full btn-gradient" size="lg">
          <Link to="/pricing">
            <Sparkles className="h-4 w-4 mr-2" />
            Upgrade naar Premium
          </Link>
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          Krijg meer inzicht in je leefstijl- en welzijnspatronen · 7 dagen gratis
        </p>
      </CardContent>
    </Card>
  );
}