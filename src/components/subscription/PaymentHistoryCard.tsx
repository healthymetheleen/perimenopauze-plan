import { useState } from 'react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { 
  FileText, 
  Download, 
  ChevronDown, 
  ChevronUp,
  CreditCard,
  Receipt,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { usePaymentHistory } from '@/hooks/useMollie';
import { useToast } from '@/hooks/use-toast';

// Payment method display names
const METHOD_NAMES: Record<string, string> = {
  ideal: 'iDEAL',
  creditcard: 'Creditcard',
  bancontact: 'Bancontact',
  paypal: 'PayPal',
  applepay: 'Apple Pay',
  directdebit: 'Automatische incasso',
};

export function PaymentHistoryCard() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: payments, isLoading } = usePaymentHistory();
  const { toast } = useToast();

  const handleDownloadInvoice = (payment: typeof payments extends (infer T)[] ? T : never) => {
    // Generate a simple invoice as text/receipt
    const invoiceContent = `
FACTUUR / RECEIPT
=====================================
Perimenopauze Plan App
www.healthymetheleen.nl

Factuurnummer: ${payment.invoiceRef}
Datum: ${format(new Date(payment.paidAt), 'd MMMM yyyy', { locale: nl })}

-------------------------------------
Omschrijving: ${payment.description}
Bedrag: €${payment.amount}
Betaalmethode: ${METHOD_NAMES[payment.method] || payment.method}
Status: Betaald ✓
-------------------------------------

Bedankt voor je betaling!

Dit is een automatisch gegenereerde betalingsbevestiging.
Voor vragen: neem contact op via de app.
=====================================
`;

    // Create and download the file
    const blob = new Blob([invoiceContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${payment.invoiceRef}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Factuur gedownload',
      description: `${payment.invoiceRef} is opgeslagen.`,
    });
  };

  if (isLoading) {
    return (
      <Card className="rounded-xl">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Betalingen laden...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!payments || payments.length === 0) {
    return null; // Don't show if no payments
  }

  return (
    <Card className="rounded-xl">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-xl p-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Betalingsgeschiedenis
                <Badge variant="secondary" className="ml-2">
                  {payments.length}
                </Badge>
              </CardTitle>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="p-4 pt-0 space-y-3">
            {payments.map((payment, index) => (
              <div key={payment.id}>
                {index > 0 && <Separator className="my-3" />}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-full bg-success/10 flex-shrink-0">
                      <CheckCircle className="h-4 w-4 text-success" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {payment.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(payment.paidAt), 'd MMM yyyy', { locale: nl })}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CreditCard className="h-3 w-3" />
                          {METHOD_NAMES[payment.method] || payment.method}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ref: {payment.invoiceRef}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-semibold text-sm">
                      €{payment.amount}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownloadInvoice(payment)}
                      title="Download factuur"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="pt-2">
              <p className="text-xs text-muted-foreground text-center">
                Alleen succesvolle betalingen worden getoond
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
