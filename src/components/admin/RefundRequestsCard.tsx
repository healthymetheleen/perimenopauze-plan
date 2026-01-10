import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertCircle,
  Euro,
  User,
  MessageSquare,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RefundRequest {
  id: string;
  owner_id: string;
  payment_id: string | null;
  amount_cents: number;
  reason: string;
  reason_details: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
}

// Reason labels
const REASON_LABELS: Record<string, string> = {
  'not_useful': 'App voldoet niet aan verwachtingen',
  'technical_issues': 'Technische problemen',
  'too_expensive': 'Te duur',
  'duplicate_payment': 'Dubbele betaling',
  'wrong_subscription': 'Verkeerd abonnement',
  'other': 'Andere reden',
};

// Status badges
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> In afwachting</Badge>;
    case 'processing':
      return <Badge variant="default" className="gap-1 bg-primary"><Loader2 className="h-3 w-3 animate-spin" /> In behandeling</Badge>;
    case 'refunded':
      return <Badge variant="default" className="gap-1 bg-success text-success-foreground"><CheckCircle className="h-3 w-3" /> Terugbetaald</Badge>;
    case 'rejected':
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Afgewezen</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function RefundRequestsCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RefundRequest | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [paymentId, setPaymentId] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // Fetch all refund requests (admin can see all)
  const { data: requests, isLoading, refetch } = useQuery({
    queryKey: ['admin-refund-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('refund_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data as unknown as RefundRequest[]) ?? [];
    },
  });

  // Process refund mutation
  const processRefund = useMutation({
    mutationFn: async ({ 
      requestId, 
      approve, 
      paymentId, 
      adminNotes 
    }: { 
      requestId: string; 
      approve: boolean; 
      paymentId?: string; 
      adminNotes?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('mollie-payments/process-refund', {
        body: { requestId, approve, paymentId, adminNotes },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, variables) => {
      toast({
        title: variables.approve ? 'Refund verwerkt' : 'Refund afgewezen',
        description: variables.approve 
          ? 'De refund is succesvol verwerkt via Mollie.' 
          : 'De refund aanvraag is afgewezen.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-refund-requests'] });
      closeDialog();
    },
    onError: (error) => {
      toast({
        title: 'Fout bij verwerken',
        description: error instanceof Error ? error.message : 'Er ging iets mis',
        variant: 'destructive',
      });
    },
  });

  const closeDialog = () => {
    setSelectedRequest(null);
    setAction(null);
    setPaymentId('');
    setAdminNotes('');
  };

  const handleApprove = (request: RefundRequest) => {
    setSelectedRequest(request);
    setAction('approve');
    setPaymentId(request.payment_id || '');
  };

  const handleReject = (request: RefundRequest) => {
    setSelectedRequest(request);
    setAction('reject');
  };

  const confirmAction = () => {
    if (!selectedRequest || !action) return;

    processRefund.mutate({
      requestId: selectedRequest.id,
      approve: action === 'approve',
      paymentId: action === 'approve' ? paymentId : undefined,
      adminNotes: adminNotes || undefined,
    });
  };

  const pendingCount = requests?.filter(r => r.status === 'pending').length || 0;

  return (
    <>
      <Card className="glass rounded-2xl">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Euro className="h-5 w-5 text-primary" />
                    Refund Aanvragen
                    {pendingCount > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {pendingCount} in afwachting
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Beheer refund verzoeken van gebruikers
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); refetch(); }}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  </button>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Laden...</span>
                </div>
              ) : !requests || requests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Euro className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Geen refund aanvragen</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((request, index) => (
                    <div key={request.id}>
                      {index > 0 && <Separator className="my-3" />}
                      <div className="p-4 rounded-lg bg-muted/50">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Header with status */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <StatusBadge status={request.status} />
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(request.created_at), 'd MMM yyyy HH:mm', { locale: nl })}
                              </span>
                            </div>

                            {/* Reason */}
                            <div className="flex items-start gap-2">
                              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium">
                                  {REASON_LABELS[request.reason] || request.reason}
                                </p>
                                {request.reason_details && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    "{request.reason_details}"
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* User & Amount */}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {request.owner_id.slice(0, 8)}...
                              </span>
                              <span className="font-medium text-foreground">
                                €{(request.amount_cents / 100).toFixed(2)}
                              </span>
                              {request.payment_id && (
                                <span className="font-mono text-xs">
                                  {request.payment_id}
                                </span>
                              )}
                            </div>

                            {/* Admin notes if processed */}
                            {request.admin_notes && (
                              <p className="text-xs text-muted-foreground italic bg-muted p-2 rounded">
                                Admin: {request.admin_notes}
                              </p>
                            )}

                            {/* Processed info */}
                            {request.processed_at && (
                              <p className="text-xs text-muted-foreground">
                                Verwerkt: {format(new Date(request.processed_at), 'd MMM yyyy HH:mm', { locale: nl })}
                              </p>
                            )}
                          </div>

                          {/* Actions for pending requests */}
                          {request.status === 'pending' && (
                            <div className="flex flex-col gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-success hover:bg-success/90 text-success-foreground gap-1"
                                onClick={() => handleApprove(request)}
                              >
                                <CheckCircle className="h-4 w-4" />
                                Goedkeuren
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1"
                                onClick={() => handleReject(request)}
                              >
                                <XCircle className="h-4 w-4" />
                                Afwijzen
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!selectedRequest && !!action} onOpenChange={(open) => !open && closeDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {action === 'approve' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-success" />
                  Refund goedkeuren?
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-destructive" />
                  Refund afwijzen?
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {selectedRequest && (
                  <div className="p-3 rounded-lg bg-muted text-sm space-y-1">
                    <p><strong>Bedrag:</strong> €{(selectedRequest.amount_cents / 100).toFixed(2)}</p>
                    <p><strong>Reden:</strong> {REASON_LABELS[selectedRequest.reason] || selectedRequest.reason}</p>
                    {selectedRequest.reason_details && (
                      <p><strong>Details:</strong> {selectedRequest.reason_details}</p>
                    )}
                  </div>
                )}

                {action === 'approve' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mollie Payment ID *</label>
                    <Input
                      placeholder="tr_xxxxxxxx"
                      value={paymentId}
                      onChange={(e) => setPaymentId(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Vind dit in je Mollie dashboard onder de betalingen van deze klant.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Admin notitie (optioneel)</label>
                  <Textarea
                    placeholder="Interne notitie..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={2}
                  />
                </div>

                {action === 'approve' && (
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-primary">Let op:</p>
                        <p className="text-muted-foreground">
                          Deze actie verwerkt de refund direct via Mollie en zet het abonnement op 'refunded'.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processRefund.isPending}>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              disabled={processRefund.isPending || (action === 'approve' && !paymentId)}
              className={action === 'approve' 
                ? 'bg-success text-success-foreground hover:bg-success/90' 
                : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              }
            >
              {processRefund.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verwerken...
                </>
              ) : action === 'approve' ? (
                'Goedkeuren & Terugbetalen'
              ) : (
                'Afwijzen'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
