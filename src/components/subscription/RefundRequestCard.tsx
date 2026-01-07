import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  RotateCcw, Clock, CheckCircle, XCircle, AlertCircle, 
  Loader2, ChevronDown, Send
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useRefundStatus, useRequestRefund } from '@/hooks/useMollie';
import { useToast } from '@/hooks/use-toast';

const REFUND_REASONS = [
  { value: 'not_using', label: 'Ik gebruik de app niet meer' },
  { value: 'too_expensive', label: 'Te duur voor mijn budget' },
  { value: 'not_what_expected', label: 'Niet wat ik verwachtte' },
  { value: 'technical_issues', label: 'Technische problemen' },
  { value: 'found_alternative', label: 'Ik gebruik een andere app' },
  { value: 'accidental_purchase', label: 'Per ongeluk aangeschaft' },
  { value: 'double_payment', label: 'Dubbel betaald' },
  { value: 'other', label: 'Anders' },
];

const STATUS_CONFIG = {
  pending: { 
    icon: Clock, 
    label: 'In behandeling', 
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    description: 'Je aanvraag wordt beoordeeld (max 2 werkdagen)'
  },
  processing: { 
    icon: Loader2, 
    label: 'Wordt verwerkt', 
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    description: 'De refund wordt verwerkt bij de bank'
  },
  approved: { 
    icon: CheckCircle, 
    label: 'Goedgekeurd', 
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    description: 'Je refund is goedgekeurd'
  },
  refunded: { 
    icon: CheckCircle, 
    label: 'Terugbetaald', 
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    description: 'Het bedrag is teruggestort (5-10 werkdagen)'
  },
  rejected: { 
    icon: XCircle, 
    label: 'Afgewezen', 
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    description: 'Je aanvraag is helaas afgewezen'
  },
};

export function RefundRequestCard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: refundData, isLoading } = useRefundStatus();
  const requestRefund = useRequestRefund();

  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [reasonDetails, setReasonDetails] = useState('');

  const eligibility = refundData?.eligibility;
  const requests = refundData?.requests || [];
  const latestRequest = requests[0];

  const handleSubmitRequest = async () => {
    if (!selectedReason) {
      toast({ title: 'Selecteer een reden', variant: 'destructive' });
      return;
    }

    try {
      await requestRefund.mutateAsync({
        reason: REFUND_REASONS.find(r => r.value === selectedReason)?.label || selectedReason,
        reasonDetails: reasonDetails.trim() || undefined,
      });

      toast({
        title: 'Aanvraag verzonden',
        description: 'We nemen binnen 2 werkdagen contact op.',
      });

      setShowConfirmDialog(false);
      setSelectedReason('');
      setReasonDetails('');
    } catch (error) {
      toast({
        title: 'Fout bij verzenden',
        description: error instanceof Error ? error.message : 'Probeer het opnieuw',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="rounded-xl">
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // If user has a pending/processing request, show status
  if (latestRequest && ['pending', 'processing'].includes(latestRequest.status)) {
    const statusInfo = STATUS_CONFIG[latestRequest.status as keyof typeof STATUS_CONFIG];
    const StatusIcon = statusInfo.icon;

    return (
      <Card className="rounded-xl border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-primary" />
            Refund aanvraag
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${latestRequest.status === 'processing' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
                <StatusIcon className={`h-4 w-4 ${latestRequest.status === 'processing' ? 'text-blue-600 dark:text-blue-400 animate-spin' : 'text-yellow-600 dark:text-yellow-400'}`} />
              </div>
              <div>
                <p className="font-medium">{statusInfo.label}</p>
                <p className="text-xs text-muted-foreground">
                  Aangevraagd op {format(new Date(latestRequest.created_at), 'd MMMM yyyy', { locale: nl })}
                </p>
              </div>
            </div>
            <Badge className={statusInfo.color}>
              €{(latestRequest.amount_cents / 100).toFixed(2)}
            </Badge>
          </div>

          <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            <p>{statusInfo.description}</p>
          </div>

          <div className="text-xs text-muted-foreground">
            <p><strong>Reden:</strong> {latestRequest.reason}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If recently refunded, show confirmation
  if (latestRequest?.status === 'refunded') {
    return (
      <Card className="rounded-xl border-green-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium text-green-700 dark:text-green-400">Refund verwerkt</p>
              <p className="text-xs text-muted-foreground">
                €{(latestRequest.amount_cents / 100).toFixed(2)} teruggestort op {format(new Date(latestRequest.processed_at || latestRequest.created_at), 'd MMMM', { locale: nl })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show refund request form if eligible
  return (
    <Card className="rounded-xl">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-xl">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
                Refund aanvragen
              </CardTitle>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            {eligibility?.isWithinWindow && (
              <CardDescription className="text-xs">
                Nog {eligibility.daysRemaining} {eligibility.daysRemaining === 1 ? 'dag' : 'dagen'} bedenktijd
              </CardDescription>
            )}
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {!eligibility?.canRequest ? (
              <div className="space-y-3">
                {!eligibility?.isWithinWindow && (
                  <div className="p-3 rounded-lg bg-muted/50 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <p>De 14-daagse bedenktijd is verstreken.</p>
                      <p className="text-xs mt-1">
                        Voor bijzondere gevallen kun je contact opnemen via het contactformulier.
                      </p>
                    </div>
                  </div>
                )}
                {eligibility?.hasRecentRefund && (
                  <div className="p-3 rounded-lg bg-muted/50 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      Je hebt recent al een refund ontvangen. Een nieuwe aanvraag is pas over 6 maanden mogelijk.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-sm">
                    Je kunt binnen 14 dagen na aankoop een volledige refund aanvragen. 
                    Na goedkeuring wordt het bedrag binnen 5-10 werkdagen teruggestort.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Reden voor refund *</Label>
                  <Select value={selectedReason} onValueChange={setSelectedReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer een reden..." />
                    </SelectTrigger>
                    <SelectContent>
                      {REFUND_REASONS.map(reason => (
                        <SelectItem key={reason.value} value={reason.value}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Toelichting (optioneel)</Label>
                  <Textarea 
                    placeholder="Vertel ons meer zodat we kunnen verbeteren..."
                    value={reasonDetails}
                    onChange={(e) => setReasonDetails(e.target.value)}
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {reasonDetails.length}/500
                  </p>
                </div>

                <Button 
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={!selectedReason || requestRefund.isPending}
                  className="w-full"
                >
                  {requestRefund.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verzenden...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Refund aanvragen
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Previous requests history */}
            {requests.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Eerdere aanvragen</p>
                  {requests.slice(0, 3).map(request => {
                    const statusInfo = STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                    return (
                      <div key={request.id} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {format(new Date(request.created_at), 'd MMM yyyy', { locale: nl })}
                        </span>
                        <Badge variant="secondary" className={`text-xs ${statusInfo.color}`}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refund aanvragen?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Je vraagt een refund aan van <strong>€7,50</strong>.
              </p>
              <p>
                Na goedkeuring wordt je abonnement beëindigd en verlies je toegang tot alle premium functies.
              </p>
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p><strong>Reden:</strong> {REFUND_REASONS.find(r => r.value === selectedReason)?.label}</p>
                {reasonDetails && <p className="mt-1 text-muted-foreground">{reasonDetails}</p>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSubmitRequest}
              disabled={requestRefund.isPending}
            >
              {requestRefund.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verzenden...
                </>
              ) : (
                'Ja, aanvragen'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}