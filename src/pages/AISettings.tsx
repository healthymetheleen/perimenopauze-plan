import { useState, useEffect, useRef, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState } from '@/components/ui/loading-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAIPrompts, useUpdateAIPrompt, AIPrompt } from '@/hooks/useAIPrompts';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useDebouncedCallback } from '@/hooks/useDebounce';
import { useTranslation } from 'react-i18next';
import { 
  Bot, Info, Loader2, CheckCircle2, Utensils, Heart, Sparkles, ChefHat
} from 'lucide-react';

const CATEGORY_INFO = {
  nutrition: { icon: Utensils, label: 'Voeding', color: 'bg-green-500/10 text-green-600' },
  cycle: { icon: Heart, label: 'Cyclus', color: 'bg-pink-500/10 text-pink-600' },
  insights: { icon: Sparkles, label: 'Inzichten', color: 'bg-purple-500/10 text-purple-600' },
  recipes: { icon: ChefHat, label: 'Recepten', color: 'bg-orange-500/10 text-orange-600' },
};

export default function AISettingsPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: prompts, isLoading } = useAIPrompts();
  const updatePrompt = useUpdateAIPrompt();
  
  const [editedPrompts, setEditedPrompts] = useState<Record<string, { nl: string; en: string }>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, 'idle' | 'saving' | 'saved'>>({});
  const isInitialized = useRef(false);

  const language = i18n.language?.startsWith('en') ? 'en' : 'nl';

  // Initialize edited prompts from data
  useEffect(() => {
    if (prompts && !isInitialized.current) {
      const initial: Record<string, { nl: string; en: string }> = {};
      prompts.forEach(p => {
        initial[p.id] = { nl: p.prompt_nl, en: p.prompt_en };
      });
      setEditedPrompts(initial);
      isInitialized.current = true;
    }
  }, [prompts]);

  // Auto-save function
  const performSave = useCallback(async (id: string, nl: string, en: string) => {
    setSaveStatus(prev => ({ ...prev, [id]: 'saving' }));
    try {
      await updatePrompt.mutateAsync({ id, prompt_nl: nl, prompt_en: en });
      setSaveStatus(prev => ({ ...prev, [id]: 'saved' }));
      setTimeout(() => setSaveStatus(prev => ({ ...prev, [id]: 'idle' })), 2000);
    } catch {
      setSaveStatus(prev => ({ ...prev, [id]: 'idle' }));
      toast({ title: 'Opslaan mislukt', variant: 'destructive' });
    }
  }, [updatePrompt, toast]);

  const debouncedSave = useDebouncedCallback(performSave, 1500);

  const handlePromptChange = (id: string, lang: 'nl' | 'en', value: string) => {
    setEditedPrompts(prev => {
      const updated = { ...prev, [id]: { ...prev[id], [lang]: value } };
      debouncedSave(id, updated[id].nl, updated[id].en);
      return updated;
    });
  };

  // Redirect non-admins
  if (!adminLoading && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isLoading || adminLoading) {
    return (
      <AppLayout>
        <LoadingState message="AI prompts laden..." />
      </AppLayout>
    );
  }

  // Group prompts by category
  const groupedPrompts = (prompts || []).reduce((acc, prompt) => {
    if (!acc[prompt.category]) acc[prompt.category] = [];
    acc[prompt.category].push(prompt);
    return acc;
  }, {} as Record<string, AIPrompt[]>);

  const categories = Object.keys(groupedPrompts);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto pb-20">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gradient flex items-center gap-2">
            <Bot className="h-6 w-6" />
            AI Instellingen
          </h1>
          <p className="text-muted-foreground">
            Bekijk en bewerk alle AI prompts die in de app worden gebruikt
          </p>
        </div>

        <Alert className="glass border-primary/30">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            <strong>Let op:</strong> Wijzigingen aan deze prompts beïnvloeden direct hoe de AI communiceert met gebruikers. 
            Wijzigingen worden automatisch opgeslagen na 1,5 seconde typen.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue={categories[0]} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${categories.length}, 1fr)` }}>
            {categories.map(cat => {
              const info = CATEGORY_INFO[cat as keyof typeof CATEGORY_INFO];
              const Icon = info?.icon || Bot;
              return (
                <TabsTrigger key={cat} value={cat} className="flex items-center gap-1.5">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{info?.label || cat}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {categories.map(cat => (
            <TabsContent key={cat} value={cat} className="space-y-4 mt-4">
              {groupedPrompts[cat].map(prompt => {
                const status = saveStatus[prompt.id] || 'idle';
                const edited = editedPrompts[prompt.id];
                
                return (
                  <Card key={prompt.id} className="glass rounded-2xl">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {prompt.name}
                            {status === 'saving' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                            {status === 'saved' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                          </CardTitle>
                          <CardDescription className="text-sm mt-1">
                            {prompt.description}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {prompt.prompt_key}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">NL</Badge>
                          <span className="text-xs text-muted-foreground">Nederlandse prompt</span>
                        </div>
                        <Textarea
                          value={edited?.nl || ''}
                          onChange={(e) => handlePromptChange(prompt.id, 'nl', e.target.value)}
                          rows={8}
                          className="font-mono text-xs resize-y min-h-[120px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">EN</Badge>
                          <span className="text-xs text-muted-foreground">English prompt</span>
                        </div>
                        <Textarea
                          value={edited?.en || ''}
                          onChange={(e) => handlePromptChange(prompt.id, 'en', e.target.value)}
                          rows={8}
                          className="font-mono text-xs resize-y min-h-[120px]"
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
