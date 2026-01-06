import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Crown, Plus, Trash2, UserCheck, UserX, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import {
  usePremiumGrants,
  useCreatePremiumGrant,
  useTogglePremiumGrant,
  useDeletePremiumGrant,
} from '@/hooks/usePremiumGrants';

export function PremiumGrantsCard() {
  const { data: grants, isLoading } = usePremiumGrants();
  const createGrant = useCreatePremiumGrant();
  const toggleGrant = useTogglePremiumGrant();
  const deleteGrant = useDeletePremiumGrant();

  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    await createGrant.mutateAsync({
      email: email.trim(),
      reason: reason.trim() || undefined,
      expires_at: expiresAt || undefined,
    });

    setEmail('');
    setReason('');
    setExpiresAt('');
    setShowForm(false);
  };

  return (
    <Card className="glass rounded-2xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Premium Uitnodigingen
            </CardTitle>
            <CardDescription>
              Nodig gebruikers uit voor gratis premium toegang
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Toevoegen
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-muted/50 space-y-3">
            <div>
              <Label htmlFor="email">E-mailadres *</Label>
              <Input
                id="email"
                type="email"
                placeholder="gebruiker@voorbeeld.nl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="reason">Reden (optioneel)</Label>
              <Input
                id="reason"
                placeholder="bijv. Beta tester, Partner"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="expires">Vervaldatum (optioneel)</Label>
              <Input
                id="expires"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={createGrant.isPending}
              >
                {createGrant.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Toevoegen
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowForm(false)}
              >
                Annuleren
              </Button>
            </div>
          </form>
        )}

        {/* Grants List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : grants && grants.length > 0 ? (
          <div className="space-y-2">
            {grants.map((grant) => {
              const isExpired = grant.expires_at && new Date(grant.expires_at) < new Date();
              
              return (
                <div
                  key={grant.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-1.5 rounded-full ${grant.user_id ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                      {grant.user_id ? (
                        <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <UserX className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{grant.email}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {grant.reason && <span>{grant.reason}</span>}
                        {grant.expires_at && (
                          <span>
                            Verloopt: {format(new Date(grant.expires_at), 'd MMM yyyy', { locale: nl })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isExpired ? (
                      <Badge variant="destructive" className="text-xs">Verlopen</Badge>
                    ) : grant.is_active ? (
                      <Badge variant="default" className="text-xs bg-green-600">Actief</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Inactief</Badge>
                    )}

                    <Switch
                      checked={grant.is_active}
                      onCheckedChange={(checked) =>
                        toggleGrant.mutate({ id: grant.id, is_active: checked })
                      }
                      disabled={toggleGrant.isPending}
                    />

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Premium grant verwijderen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Weet je zeker dat je de premium grant voor {grant.email} wilt verwijderen?
                            De gebruiker verliest direct toegang tot premium functies.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuleren</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteGrant.mutate(grant.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Verwijderen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nog geen premium uitnodigingen
          </p>
        )}
      </CardContent>
    </Card>
  );
}
