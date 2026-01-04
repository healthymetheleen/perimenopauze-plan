import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useExportData, useDeleteAccount } from '@/hooks/useConsent';
import { useToast } from '@/hooks/use-toast';
import { 
  User, Download, Trash2, Crown, Loader2, AlertTriangle, 
  Shield, Info, FileText, CheckCircle 
} from 'lucide-react';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AccountPage() {
  const { user, signOut } = useAuth();
  const { data: entitlements } = useEntitlements();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const exportData = useExportData();
  const deleteAccount = useDeleteAccount();
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  
  const isPremium = entitlements?.can_use_trends || entitlements?.can_use_patterns;

  const handleExport = async () => {
    try {
      const data = await exportData.mutateAsync();
      
      // Create and download JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `perimenopauze-plan-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Export succesvol',
        description: 'Je gegevens zijn gedownload als JSON bestand.',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export mislukt',
        description: 'Er ging iets mis bij het exporteren. Probeer het opnieuw.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'VERWIJDER') return;
    
    try {
      await deleteAccount.mutateAsync();
      toast({
        title: 'Account verwijderd',
        description: 'Al je gegevens zijn permanent verwijderd.',
      });
      navigate('/login');
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Verwijderen mislukt',
        description: 'Er ging iets mis. Neem contact op met support.',
        variant: 'destructive',
      });
    }
    setShowDeleteDialog(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6 bg-gradient-subtle min-h-screen -m-4 p-4 sm:-m-6 sm:p-6">
        <div>
          <h1 className="text-2xl font-semibold text-gradient">Account</h1>
          <p className="text-muted-foreground">Beheer je account en gegevens</p>
        </div>

        {/* Privacy Info */}
        <Alert className="glass border-primary/20">
          <Shield className="h-4 w-4 text-primary" />
          <AlertDescription>
            <strong>Je privacy is belangrijk.</strong> We verwerken je gezondheidsdata alleen om 
            jou te helpen. AI ontvangt alleen geanonimiseerde statistieken. Je hebt volledige 
            controle over je gegevens.
          </AlertDescription>
        </Alert>

        {/* Profile */}
        <Card className="glass rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Profiel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">E-mailadres</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Abonnement</p>
              <div className="flex items-center gap-2">
                <p className="font-medium capitalize">
                  {isPremium ? 'Premium' : 'Gratis'}
                </p>
                {isPremium && <Crown className="h-4 w-4 text-primary" />}
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate('/subscription')}
              className="mt-2"
            >
              {isPremium ? 'Beheer abonnement' : 'Start 7 dagen gratis'}
            </Button>
          </CardContent>
        </Card>

        {/* Data Rights (GDPR) */}
        <Card className="glass rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Jouw gegevens (AVG/GDPR)
            </CardTitle>
            <CardDescription>
              Je hebt het recht om je gegevens in te zien, te downloaden en te verwijderen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-success mt-0.5" />
              <div>
                <p className="font-medium text-sm">Data retentie</p>
                <p className="text-sm text-muted-foreground">
                  Eetdagboeken en symptomen worden automatisch na 12 maanden verwijderd. 
                  AI-logs worden na 6 maanden verwijderd.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Info className="h-5 w-5 text-info mt-0.5" />
              <div>
                <p className="font-medium text-sm">AI privacy</p>
                <p className="text-sm text-muted-foreground">
                  AI ontvangt alleen geanonimiseerde statistieken (gemiddelden, frequenties). 
                  Geen namen, datums of herleidbare informatie.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Export */}
        <Card className="glass rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Data exporteren
            </CardTitle>
            <CardDescription>
              Download al je gegevens in JSON formaat. Dit is jouw recht onder de AVG.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              onClick={handleExport} 
              disabled={exportData.isPending}
              className="w-full sm:w-auto"
            >
              {exportData.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Download className="h-4 w-4 mr-2" />
              Download mijn gegevens
            </Button>
          </CardContent>
        </Card>

        {/* Delete Account */}
        <Card className="glass rounded-2xl border-destructive/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Account verwijderen
            </CardTitle>
            <CardDescription>
              Verwijder je account en alle bijbehorende gegevens permanent. Dit kan niet ongedaan 
              worden gemaakt.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Account verwijderen
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Account permanent verwijderen?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>Dit verwijdert permanent:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Je profiel en accountgegevens</li>
                  <li>Alle eetdagboeken en maaltijden</li>
                  <li>Cyclusdata en symptoomlogs</li>
                  <li>Slaapregistraties</li>
                  <li>Alle andere opgeslagen data</li>
                </ul>
                <p className="font-medium">Typ "VERWIJDER" om te bevestigen:</p>
                <input
                  type="text"
                  className="w-full p-3 border rounded-lg bg-background"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="VERWIJDER"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirm('')}>
              Annuleren
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirm !== 'VERWIJDER' || deleteAccount.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAccount.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Definitief verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
