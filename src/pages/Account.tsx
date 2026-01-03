import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useToast } from '@/hooks/use-toast';
import { appClient } from '@/lib/supabase-app';
import { User, Download, Trash2, Crown, Loader2, AlertTriangle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function AccountPage() {
  const { user, signOut } = useAuth();
  const { data: entitlements } = useEntitlements();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const isPremium = entitlements?.plan === 'premium';

  const handleExport = async () => {
    if (!isPremium) { toast({ title: 'Premium functie', description: 'Upgrade naar Premium om je data te exporteren.' }); navigate('/pricing'); return; }
    setExporting(true);
    try {
      const { error } = await appClient.from('export_jobs').insert({ owner_id: user?.id, status: 'queued' });
      if (error) throw error;
      toast({ title: 'Export gestart', description: 'Je ontvangt een melding wanneer je download klaar is.' });
    } catch { toast({ title: 'Export mislukt', variant: 'destructive' }); }
    finally { setExporting(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'VERWIJDER') return;
    setDeleting(true);
    try {
      await appClient.from('audit_events').insert({ owner_id: user?.id, event_type: 'account_delete_requested', meta: { timestamp: new Date().toISOString() } });
      await signOut();
      toast({ title: 'Uitgelogd', description: 'Neem contact op met support om je account volledig te verwijderen.' });
      navigate('/');
    } catch { toast({ title: 'Er ging iets mis', variant: 'destructive' }); }
    finally { setDeleting(false); setShowDeleteDialog(false); }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-semibold text-foreground">Account</h1><p className="text-muted-foreground">Beheer je account en gegevens</p></div>
        <Card className="rounded-2xl"><CardHeader><CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5 text-primary" />Profiel</CardTitle></CardHeader><CardContent className="space-y-4"><div><p className="text-sm text-muted-foreground">E-mailadres</p><p className="font-medium">{user?.email}</p></div><div><p className="text-sm text-muted-foreground">Abonnement</p><div className="flex items-center gap-2"><p className="font-medium capitalize">{entitlements?.plan || 'Free'}</p>{isPremium && <Crown className="h-4 w-4 text-primary" />}</div></div>{!isPremium && <Button variant="outline" onClick={() => navigate('/pricing')}>Upgrade naar Premium</Button>}</CardContent></Card>
        <Card className="rounded-2xl"><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Download className="h-5 w-5 text-primary" />Data export</CardTitle><CardDescription>Download al je gegevens in JSON formaat (GDPR)</CardDescription></CardHeader><CardContent><Button variant="outline" onClick={handleExport} disabled={exporting}>{exporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Export aanvragen{!isPremium && <span className="ml-2 text-xs bg-secondary/20 text-secondary px-2 py-0.5 rounded-full">Premium</span>}</Button></CardContent></Card>
        <Card className="rounded-2xl border-destructive/20"><CardHeader><CardTitle className="text-lg flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" />Account verwijderen</CardTitle><CardDescription>Verwijder je account en alle bijbehorende gegevens permanent.</CardDescription></CardHeader><CardContent><Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>Account verwijderen</Button></CardContent></Card>
      </div>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Account permanent verwijderen?</AlertDialogTitle><AlertDialogDescription className="space-y-4"><p>Dit verwijdert al je gegevens permanent.</p><p className="font-medium">Typ "VERWIJDER" om te bevestigen:</p><input type="text" className="w-full p-2 border rounded-lg" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="VERWIJDER" /></AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuleren</AlertDialogCancel><AlertDialogAction onClick={handleDeleteAccount} disabled={deleteConfirm !== 'VERWIJDER' || deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Definitief verwijderen</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}