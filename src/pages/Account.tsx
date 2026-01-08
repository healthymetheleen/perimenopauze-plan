import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useExportData, useDeleteAccount } from '@/hooks/useConsent';
import { useToast } from '@/hooks/use-toast';
import { 
  User, Download, Trash2, Crown, Loader2, AlertTriangle, 
  Shield, Info, FileText, CheckCircle, LogOut, CreditCard 
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
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const { data: entitlements } = useEntitlements();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const exportData = useExportData();
  const deleteAccount = useDeleteAccount();
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  
  const isPremium = entitlements?.can_use_trends || entitlements?.can_use_patterns;
  
  const deleteConfirmWord = i18n.language === 'en' ? 'DELETE' : 'VERWIJDER';

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
        title: t('account.export_success'),
        description: t('account.export_success_desc'),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t('account.export_error'),
        description: t('account.export_error_desc'),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== deleteConfirmWord) return;
    
    try {
      await deleteAccount.mutateAsync();
      toast({
        title: t('account.delete_success'),
        description: t('account.delete_success_desc'),
      });
      navigate('/login');
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: t('account.delete_error'),
        description: t('account.delete_error_desc'),
        variant: 'destructive',
      });
    }
    setShowDeleteDialog(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gradient">{t('account.title')}</h1>
          <p className="text-muted-foreground">{t('account.subtitle')}</p>
        </div>

        {/* Privacy Info */}
        <Alert className="glass border-primary/20">
          <Shield className="h-4 w-4 text-primary" />
          <AlertDescription>
            <strong>{t('account.privacy_notice')}</strong> {t('account.privacy_desc')}
          </AlertDescription>
        </Alert>

        {/* Account & Subscription */}
        <Card className="glass rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {t('settings.account_subscription')}
            </CardTitle>
            <CardDescription>{t('settings.account_subscription_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('settings.email')}</Label>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label className="flex items-center gap-2">
                  {isPremium && <Crown className="h-4 w-4 text-primary" />}
                  {t('settings.current_subscription')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {isPremium 
                    ? t('settings.premium_access')
                    : entitlements?.trial_days_remaining && entitlements.trial_days_remaining > 0
                      ? t('settings.trial_remaining', { 
                          days: entitlements.trial_days_remaining, 
                          dayWord: entitlements.trial_days_remaining === 1 ? t('settings.day') : t('settings.days') 
                        })
                      : t('settings.free_limited')}
                </p>
              </div>
              <Button variant="outline" asChild className="glass">
                <Link to="/subscription">
                  <CreditCard className="h-4 w-4 mr-2" />
                  {isPremium ? t('common.manage') : t('common.upgrade')}
                </Link>
              </Button>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('settings.account_management')}</Label>
                <p className="text-sm text-muted-foreground">{t('settings.account_management_desc')}</p>
              </div>
              <Button variant="outline" onClick={() => document.getElementById('data-section')?.scrollIntoView({ behavior: 'smooth' })} className="glass">
                <Shield className="h-4 w-4 mr-2" />
                {t('common.manage')}
              </Button>
            </div>
            
            <Separator />
            
            <Button variant="outline" onClick={() => signOut()} className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              {t('common.logout')}
            </Button>
          </CardContent>
        </Card>

        {/* Data Rights (GDPR) */}
        <Card id="data-section" className="glass rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {t('account.gdpr_title')}
            </CardTitle>
            <CardDescription>
              {t('account.gdpr_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-success mt-0.5" />
              <div>
                <p className="font-medium text-sm">{t('account.retention_title')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('account.retention_desc')}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Info className="h-5 w-5 text-info mt-0.5" />
              <div>
                <p className="font-medium text-sm">{t('account.ai_privacy_title')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('account.ai_privacy_desc')}
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
              {t('account.export_title')}
            </CardTitle>
            <CardDescription>
              {t('account.export_desc')}
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
              {t('account.download_data')}
            </Button>
          </CardContent>
        </Card>

        {/* Delete Account */}
        <Card className="glass rounded-2xl border-destructive/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              {t('account.delete_title')}
            </CardTitle>
            <CardDescription>
              {t('account.delete_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('account.delete_button')}
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
              {t('account.delete_confirm_title')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>{t('account.delete_confirm_desc')}</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>{t('account.delete_item_profile')}</li>
                  <li>{t('account.delete_item_diary')}</li>
                  <li>{t('account.delete_item_cycle')}</li>
                  <li>{t('account.delete_item_sleep')}</li>
                  <li>{t('account.delete_item_other')}</li>
                </ul>
                <p className="font-medium">{t('account.delete_type_confirm')}</p>
                <input
                  type="text"
                  className="w-full p-3 border rounded-lg bg-background"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder={deleteConfirmWord}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirm('')}>
              {t('account.delete_cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirm !== deleteConfirmWord || deleteAccount.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAccount.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('account.delete_final')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
