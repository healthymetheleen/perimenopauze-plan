import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAIUsage, trackAIUsage } from '@/hooks/useAIUsage';
import { useConsent } from '@/hooks/useConsent';
import { Loader2, Type, Camera, Mic, Check, Edit2 } from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';

interface AddMealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayId: string;
  selectedDate: string;
  onDateChange?: (date: string) => void;
}

interface VerificationQuestion {
  question: string;
  options: string[];
  affects: string;
}

interface QualityFlags {
  has_protein?: boolean;
  has_fiber?: boolean;
  has_vegetables?: boolean;
  is_ultra_processed?: boolean;
  is_late_meal?: boolean;
}

interface MealItem {
  name: string;
  category: string;
  attributes?: string[];
  quantity: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  processing_level?: number;
}

interface MealAnalysis {
  description: string;
  items?: MealItem[];
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  ultra_processed_level?: number | null;
  confidence: 'high' | 'medium' | 'low';
  verification_questions?: VerificationQuestion[];
  quality_flags?: QualityFlags;
  notes?: string;
}

export function AddMealDialog({ open, onOpenChange, dayId, selectedDate, onDateChange }: AddMealDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Input states
  const [inputMethod, setInputMethod] = useState<'text' | 'photo' | 'voice'>('text');
  const [description, setDescription] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mealDate, setMealDate] = useState(selectedDate);

  // Analysis result state
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Editable fields for confirmation
  const [editableAnalysis, setEditableAnalysis] = useState<MealAnalysis | null>(null);
  const [time, setTime] = useState(new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }));

  // Media recorder ref
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const resetForm = () => {
    setDescription('');
    setImagePreview(null);
    setAnalysis(null);
    setEditableAnalysis(null);
    setShowConfirmation(false);
    setTime(new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }));
    setMealDate(selectedDate);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleDateChange = (newDate: string) => {
    setMealDate(newDate);
    onDateChange?.(newDate);
  };

  const { data: aiUsage } = useAIUsage();
  const { consent } = useConsent();
  const hasAIConsent = consent?.accepted_ai_processing ?? false;

  // Analyze meal with AI
  const analyzeMeal = async (text?: string, imageBase64?: string) => {
    // Check AI usage limit
    if (aiUsage && aiUsage.remaining <= 0) {
      toast({
        title: 'AI limiet bereikt',
        description: `Je hebt je maandelijkse limiet van ${aiUsage.limit} AI analyses bereikt. Vul handmatig in of wacht tot volgende maand.`,
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      // Use supabase.functions.invoke which automatically includes auth header
      const { data: result, error } = await supabase.functions.invoke('analyze-meal', {
        body: {
          description: text,
          imageBase64: imageBase64,
          hasAIConsent: hasAIConsent,
        },
      });

      if (error) {
        throw new Error(error.message || 'Analyse mislukt');
      }

      if (result.error) {
        if (result.error === 'limit_exceeded') {
          throw new Error(result.message || 'Dagelijkse AI-limiet bereikt');
        }
        throw new Error(result.message || result.error);
      }

      setAnalysis(result);
      setEditableAnalysis(result);
      setShowConfirmation(true);
      
      // Invalidate AI usage cache
      queryClient.invalidateQueries({ queryKey: ['ai-usage'] });
    } catch (error) {
      toast({
        title: 'Analyse mislukt',
        description: error instanceof Error ? error.message : 'Probeer het opnieuw',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle text submit
  const handleTextSubmit = () => {
    if (!description.trim()) return;
    analyzeMeal(description);
  };

  // Handle photo upload
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      analyzeMeal(undefined, base64);
    };
    reader.readAsDataURL(file);
  };

  // Handle voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        // Convert to base64 and send to transcription API
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          
          setIsAnalyzing(true);
          try {
            // Use supabase.functions.invoke which automatically includes auth header
            const { data: result, error } = await supabase.functions.invoke('voice-to-text', {
              body: { audio: base64Audio },
            });
            
            if (error) {
              throw new Error(error.message || 'Transcriptie mislukt');
            }
            
            if (result.error) {
              if (result.error === 'limit_exceeded') {
                throw new Error(result.message || 'Dagelijkse AI-limiet bereikt');
              }
              throw new Error(result.error);
            }
            
            if (result.text) {
              setDescription(result.text);
              // Auto-analyze the transcribed text
              analyzeMeal(result.text);
            }
          } catch (error) {
            toast({
              title: 'Spraak niet herkend',
              description: error instanceof Error ? error.message : 'Probeer het opnieuw',
              variant: 'destructive',
            });
            setIsAnalyzing(false);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: 'Microfoon niet beschikbaar',
        description: 'Geef toestemming voor de microfoon of gebruik een andere invoermethode.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Save meal to database
  const saveMeal = useMutation({
    mutationFn: async () => {
      if (!user || !editableAnalysis) throw new Error('Not authenticated');
      
      const qualityFlags = {
        ai_description: editableAnalysis.description,
        ai_confidence: editableAnalysis.confidence,
        items: editableAnalysis.items || [],
        has_protein: editableAnalysis.quality_flags?.has_protein ?? false,
        has_fiber: editableAnalysis.quality_flags?.has_fiber ?? false,
        has_vegetables: editableAnalysis.quality_flags?.has_vegetables ?? false,
        is_ultra_processed: editableAnalysis.quality_flags?.is_ultra_processed ?? false,
        is_late_meal: editableAnalysis.quality_flags?.is_late_meal ?? false,
      };
      
      const { error } = await supabase
        .from('meals')
        .insert([{
          owner_id: user.id,
          day_id: dayId,
          time_local: time,
          kcal: editableAnalysis.kcal,
          protein_g: editableAnalysis.protein_g,
          carbs_g: editableAnalysis.carbs_g,
          fat_g: editableAnalysis.fat_g,
          fiber_g: editableAnalysis.fiber_g,
          ultra_processed_level: editableAnalysis.ultra_processed_level ?? null,
          source: 'ai',
          quality_flags: qualityFlags as unknown as Json,
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Maaltijd opgeslagen' });
      queryClient.invalidateQueries({ queryKey: ['meals', dayId] });
      queryClient.invalidateQueries({ queryKey: ['daily-scores'] });
      handleClose();
    },
    onError: () => {
      toast({ title: 'Kon maaltijd niet opslaan', variant: 'destructive' });
    },
  });

  const updateEditableField = (field: keyof MealAnalysis, value: string) => {
    if (!editableAnalysis) return;
    const numValue = value === '' ? null : parseFloat(value);
    setEditableAnalysis({ ...editableAnalysis, [field]: numValue });
  };

  const confidenceColors = {
    high: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-red-100 text-red-800',
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>
            {showConfirmation ? 'Bevestig maaltijd' : 'Maaltijd toevoegen'}
          </DialogTitle>
          {!showConfirmation && aiUsage && (
            <p className="text-xs text-muted-foreground">
              {aiUsage.remaining} van {aiUsage.limit} AI analyses deze maand
            </p>
          )}
        </DialogHeader>

        {!showConfirmation ? (
          <div className="space-y-4">
            <Tabs value={inputMethod} onValueChange={(v) => setInputMethod(v as any)}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="text" className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Beschrijf
                </TabsTrigger>
                <TabsTrigger value="photo" className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Foto
                </TabsTrigger>
                <TabsTrigger value="voice" className="flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  Spreek in
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Beschrijf je maaltijd</Label>
                  <Input
                    id="description"
                    placeholder="Bijv: 2 boterhammen met kaas en een glas melk"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                  />
                </div>
                <Button 
                  onClick={handleTextSubmit} 
                  disabled={!description.trim() || isAnalyzing}
                  className="w-full"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyseren...
                    </>
                  ) : (
                    'Analyseer'
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="photo" className="space-y-4 mt-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                
                {imagePreview ? (
                  <div className="relative rounded-lg overflow-hidden">
                    <img 
                      src={imagePreview} 
                      alt="Maaltijd preview" 
                      className="w-full h-48 object-cover"
                    />
                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-32 border-dashed"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Camera className="h-8 w-8 text-muted-foreground" />
                      <span className="text-muted-foreground">Maak of kies een foto</span>
                    </div>
                  </Button>
                )}
              </TabsContent>

              <TabsContent value="voice" className="space-y-4 mt-4">
                <div className="flex flex-col items-center gap-4 py-8">
                  <Button
                    size="lg"
                    variant={isRecording ? 'destructive' : 'default'}
                    className="h-20 w-20 rounded-full"
                    onClick={isRecording ? stopRecording : startRecording}
                  >
                    <Mic className={`h-8 w-8 ${isRecording ? 'animate-pulse' : ''}`} />
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    {isRecording ? 'Tap om te stoppen' : 'Tap om in te spreken'}
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="space-y-4">
            {/* AI Analysis result */}
            {editableAnalysis && (
              <>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{editableAnalysis.description}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${confidenceColors[editableAnalysis.confidence]}`}>
                      {editableAnalysis.confidence === 'high' ? 'Zeker' : editableAnalysis.confidence === 'medium' ? 'Redelijk' : 'Onzeker'}
                    </span>
                  </div>
                  {editableAnalysis.notes && (
                    <p className="text-sm text-muted-foreground">{editableAnalysis.notes}</p>
                  )}
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Datum</Label>
                    <Input 
                      id="date" 
                      type="date" 
                      value={mealDate} 
                      onChange={(e) => handleDateChange(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Tijd</Label>
                    <Input 
                      id="time" 
                      type="time" 
                      value={time} 
                      onChange={(e) => setTime(e.target.value)} 
                    />
                  </div>
                </div>

                {/* Editable nutrition values */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="kcal">Calorieën</Label>
                    <Input
                      id="kcal"
                      type="number"
                      value={editableAnalysis.kcal ?? ''}
                      onChange={(e) => updateEditableField('kcal', e.target.value)}
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="protein">Eiwit (g)</Label>
                    <Input
                      id="protein"
                      type="number"
                      value={editableAnalysis.protein_g ?? ''}
                      onChange={(e) => updateEditableField('protein_g', e.target.value)}
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="carbs">Koolh. (g)</Label>
                    <Input
                      id="carbs"
                      type="number"
                      value={editableAnalysis.carbs_g ?? ''}
                      onChange={(e) => updateEditableField('carbs_g', e.target.value)}
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fat">Vet (g)</Label>
                    <Input
                      id="fat"
                      type="number"
                      value={editableAnalysis.fat_g ?? ''}
                      onChange={(e) => updateEditableField('fat_g', e.target.value)}
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fiber">Vezels (g)</Label>
                    <Input
                      id="fiber"
                      type="number"
                      value={editableAnalysis.fiber_g ?? ''}
                      onChange={(e) => updateEditableField('fiber_g', e.target.value)}
                      min="0"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowConfirmation(false)}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Terug
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={() => saveMeal.mutate()}
                    disabled={saveMeal.isPending}
                  >
                    {saveMeal.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Bevestigen
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
