import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lightbulb, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface FeedbackFormDialogProps {
  trigger?: React.ReactNode;
}

export function FeedbackFormDialog({ trigger }: FeedbackFormDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  // Pre-fill email if logged in
  const userEmail = user?.email || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !message.trim()) {
      toast({
        title: t('feedback.fill_all_fields'),
        variant: 'destructive',
      });
      return;
    }

    const emailToUse = email.trim() || userEmail;
    if (!emailToUse) {
      toast({
        title: t('feedback.email_required'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          type: 'feedback',
          name: name.trim(),
          email: emailToUse,
          subject: subject.trim() || undefined,
          message: message.trim(),
        },
      });

      if (error) throw error;

      toast({
        title: t('feedback.success_title'),
        description: t('feedback.success_description'),
      });

      // Reset form
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
      setOpen(false);
    } catch (error: unknown) {
      console.error('Feedback form error:', error);
      toast({
        title: t('feedback.error_title'),
        description: error instanceof Error ? error.message : t('feedback.error_description'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            {t('footer.feedback')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            {t('feedback.title')}
          </DialogTitle>
          <DialogDescription>
            {t('feedback.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="feedback-name">{t('feedback.name_label')}</Label>
            <Input
              id="feedback-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('feedback.name_placeholder')}
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-email">{t('feedback.email_label')}</Label>
            <Input
              id="feedback-email"
              type="email"
              value={email || userEmail}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('feedback.email_placeholder')}
              maxLength={255}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-subject">{t('feedback.subject_label')}</Label>
            <Input
              id="feedback-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('feedback.subject_placeholder')}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-message">{t('feedback.message_label')}</Label>
            <Textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('feedback.message_placeholder')}
              rows={4}
              maxLength={5000}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {t('feedback.submit')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}