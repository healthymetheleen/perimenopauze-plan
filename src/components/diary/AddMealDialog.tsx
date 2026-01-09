import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAIUsage } from '@/hooks/useAIUsage';
import { useConsent } from '@/hooks/useConsent';
import { useImageCompression, formatBytes, COMPRESSION_PRESETS } from '@/hooks/useImageCompression';
import { ImageCropper } from './ImageCropper';
import { Loader2, Type, Camera, Mic, Check, Edit2, Crop, AlertTriangle, Info } from 'lucide-react';
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
  grams?: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  processing_level?: number;
}

interface MealTotals {
  kcal_min?: number;
  kcal_max?: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  alcohol_g?: number | null;
  caffeine_mg?: number | null;
}

interface MealAnalysis {
  description: string;
  items?: MealItem[];
  totals?: MealTotals;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  ultra_processed_level?: number | null;
  confidence: number; // 0.0 - 1.0
  missing_info?: string[];
  clarification_question?: string | null;
  verification_questions?: VerificationQuestion[];
  quality_flags?: QualityFlags;
  notes?: string;
  // New fields for cost tracking
  model_used?: string;
  tokens_used?: number;
  cost_eur?: number;
}

type AnalysisStep = 'idle' | 'compressing' | 'analyzing' | 'clarifying' | 'done';

export function AddMealDialog({ open, onOpenChange, dayId: initialDayId, selectedDate, onDateChange }: AddMealDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Input states
  const [inputMethod, setInputMethod] = useState<'text' | 'photo' | 'voice'>('text');
  const [description, setDescription] = useState('');
  const [photoDescription, setPhotoDescription] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [rawImage, setRawImage] = useState<string | null>(null); // Original image before crop
  const [showCropper, setShowCropper] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>('idle');
  const [clarificationAnswer, setClarificationAnswer] = useState('');
  const [mealDate, setMealDate] = useState(selectedDate);
  const [currentDayId, setCurrentDayId] = useState(initialDayId);

  // Analysis result state
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Editable fields for confirmation
  const [editableAnalysis, setEditableAnalysis] = useState<MealAnalysis | null>(null);
  const [time, setTime] = useState(new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }));

  // Media recorder ref
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Update currentDayId when initialDayId changes
  useEffect(() => {
    setCurrentDayId(initialDayId);
  }, [initialDayId]);

  // Reset mealDate when selectedDate changes (dialog opens)
  useEffect(() => {
    setMealDate(selectedDate);
  }, [selectedDate]);

  const resetForm = () => {
    setDescription('');
    setPhotoDescription('');
    setImagePreview(null);
    setRawImage(null);
    setShowCropper(false);
    setTranscription(null);
    setIsTranscribing(false);
    setAnalysis(null);
    setEditableAnalysis(null);
    setShowConfirmation(false);
    setAnalysisStep('idle');
    setClarificationAnswer('');
    setTime(new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }));
    setMealDate(selectedDate);
    setCurrentDayId(initialDayId);
    resetCompression();
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Get or create diary day for a specific date
  const getOrCreateDayId = async (date: string): Promise<string> => {
    if (!user) throw new Error('Not authenticated');
    
    // Check if day exists
    const { data: existingDay } = await supabase
      .from('diary_days')
      .select('id')
      .eq('owner_id', user.id)
      .eq('day_date', date)
      .maybeSingle();
    
    if (existingDay) {
      return existingDay.id;
    }
    
    // Create new day
    const { data: newDay, error } = await supabase
      .from('diary_days')
      .insert([{
        owner_id: user.id,
        day_date: date,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }])
      .select('id')
      .single();
    
    if (error) throw error;
    return newDay.id;
  };

  const handleDateChange = async (newDate: string) => {
    setMealDate(newDate);
    // Don't call onDateChange here - it would reset the parent and lose our data
    // Only update the dayId for the selected date
    try {
      const dayId = await getOrCreateDayId(newDate);
      setCurrentDayId(dayId);
    } catch (error) {
      toast({
        title: 'Kon dag niet aanmaken',
        description: 'Probeer het opnieuw',
        variant: 'destructive',
      });
    }
  };

  const { data: aiUsage } = useAIUsage();
  const { consent } = useConsent();
  const hasAIConsent = consent?.accepted_ai_processing ?? false;
  const hasPhotoConsent = consent?.accepted_photo_analysis ?? false;
  
  // Image compression hook
  const { compressImage: compressWithHook, progress: compressionProgress, reset: resetCompression } = useImageCompression();

  // Analyze meal with AI
  const analyzeMeal = async (text?: string, imageBase64?: string, isClarification = false) => {
    // Check AI usage limit
    if (aiUsage && aiUsage.remaining <= 0) {
      toast({
        title: 'AI limiet bereikt',
        description: `Je hebt je dagelijkse limiet van ${aiUsage.limit} AI analyses bereikt. Vul handmatig in of probeer het morgen opnieuw.`,
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStep(isClarification ? 'clarifying' : 'analyzing');
    
    try {
      // Build the description with clarification if provided
      let fullDescription = text;
      if (isClarification && analysis?.description) {
        fullDescription = `${analysis.description}. Extra info: ${text}`;
      }
      
      // Use supabase.functions.invoke which automatically includes auth header
      const { data: result, error } = await supabase.functions.invoke('analyze-meal', {
        body: {
          description: fullDescription,
          imageBase64: imageBase64,
          hasAIConsent: hasAIConsent,
          mealTime: time,
          language: i18n.language,
        },
      });

      if (error) {
        throw new Error(error.message || 'Analyse mislukt');
      }

      if (result.error) {
        if (result.error === 'limit_exceeded') {
          throw new Error(result.message || 'Dagelijkse AI-limiet bereikt');
        }
        if (result.error === 'rate_limit') {
          throw new Error(result.message || 'Te veel verzoeken. Probeer het later opnieuw.');
        }
        if (result.error === 'service_error' || result.error === 'service_unavailable') {
          throw new Error(result.message || 'De AI-service is tijdelijk niet beschikbaar.');
        }
        throw new Error(result.message || result.error);
      }

      setAnalysis(result);
      setEditableAnalysis(result);
      
      // Check if we need clarification (low confidence < 65%)
      const confidence = typeof result.confidence === 'number' ? result.confidence : 0.5;
      if (confidence < 0.65 && result.clarification_question && !isClarification) {
        setAnalysisStep('clarifying');
        // Show clarification UI but don't go to confirmation yet
        toast({
          title: 'Meer details nodig',
          description: 'De AI is niet zeker genoeg. Beantwoord de vraag voor een betere analyse.',
        });
      } else {
        setShowConfirmation(true);
        setAnalysisStep('done');
        
        // Show success toast with cost info
        const costDisplay = result.cost_eur ? `€${result.cost_eur.toFixed(4)}` : '';
        toast({
          title: `${result.description?.substring(0, 30)}...`,
          description: `${result.kcal || '?'} kcal ${costDisplay ? `(${costDisplay})` : ''}`,
        });
      }
      
      // Invalidate AI usage cache
      queryClient.invalidateQueries({ queryKey: ['ai-usage'] });
    } catch (error) {
      toast({
        title: 'Analyse mislukt',
        description: error instanceof Error ? error.message : 'Probeer het opnieuw',
        variant: 'destructive',
      });
      setAnalysisStep('idle');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle clarification answer
  const handleClarificationSubmit = () => {
    if (!clarificationAnswer.trim()) return;
    analyzeMeal(clarificationAnswer, imagePreview || undefined, true);
    setClarificationAnswer('');
  };

  // Skip clarification and use current analysis
  const skipClarification = () => {
    if (analysis) {
      setShowConfirmation(true);
      setAnalysisStep('done');
    }
  };

  // Handle text submit
  const handleTextSubmit = () => {
    if (!description.trim()) return;
    analyzeMeal(description);
  };

  // Reset compression state when dialog closes
  useEffect(() => {
    if (!open) {
      resetCompression();
    }
  }, [open, resetCompression]);

  // Handle photo upload with compression - show cropper first
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Use the compression hook with meal preset (max 80kb WebP)
      const result = await compressWithHook(file, COMPRESSION_PRESETS.meal);
      
      if (!result) {
        throw new Error(compressionProgress.error || 'Compressie mislukt');
      }
      
      setRawImage(result.base64);
      setShowCropper(true); // Show cropper first
    } catch (error) {
      toast({
        title: 'Foto kon niet worden geladen',
        description: error instanceof Error ? error.message : 'Probeer een andere foto of verklein de bestandsgrootte.',
        variant: 'destructive',
      });
    }
  };

  // Handle crop complete
  const handleCropComplete = (croppedImage: string) => {
    setImagePreview(croppedImage);
    setShowCropper(false);
  };

  // Skip cropping
  const handleSkipCrop = () => {
    setImagePreview(rawImage);
    setRawImage(null);
    setShowCropper(false);
  };

  // Analyze photo with optional description
  const handlePhotoAnalyze = () => {
    if (!imagePreview) return;
    analyzeMeal(photoDescription || undefined, imagePreview);
  };

  // Handle voice recording with audio level metering
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Set up audio level metering
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      analyser.fftSize = 256;
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Start level monitoring
      const updateLevel = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalizedLevel = Math.min(100, (average / 128) * 100);
        setAudioLevel(normalizedLevel);
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        // Clean up audio level monitoring
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        analyserRef.current = null;
        setAudioLevel(0);

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        // Convert to base64 and send to transcription API
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          
          setIsTranscribing(true);
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
              // Show transcription preview instead of auto-analyzing
              setTranscription(result.text);
            } else {
              throw new Error('Geen tekst herkend');
            }
          } catch (error) {
            toast({
              title: 'Spraak niet herkend',
              description: error instanceof Error ? error.message : 'Probeer het opnieuw',
              variant: 'destructive',
            });
          } finally {
            setIsTranscribing(false);
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
      // Cleanup will happen in onstop handler
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Save meal to database
  const saveMeal = useMutation({
    mutationFn: async () => {
      if (!user || !editableAnalysis) throw new Error('Not authenticated');
      
      // Ensure we have a valid day_id - create day if it doesn't exist
      let dayIdToUse = currentDayId;
      
      if (!dayIdToUse) {
        console.log('No dayId found, creating day for date:', mealDate);
        dayIdToUse = await getOrCreateDayId(mealDate);
        setCurrentDayId(dayIdToUse);
      }
      
      console.log('Saving meal with dayId:', dayIdToUse, 'date:', mealDate);
      
      const safeUltraProcessedLevel =
        typeof editableAnalysis.ultra_processed_level === 'number'
          ? Math.min(3, Math.max(0, editableAnalysis.ultra_processed_level))
          : null;

      const qualityFlags = {
        ai_description: editableAnalysis.description,
        ai_confidence: editableAnalysis.confidence,
        ai_kcal_min: editableAnalysis.totals?.kcal_min ?? null,
        ai_kcal_max: editableAnalysis.totals?.kcal_max ?? null,
        ai_missing_info: editableAnalysis.missing_info || [],
        ai_ultra_processed_level_raw: editableAnalysis.ultra_processed_level ?? null,
        items: editableAnalysis.items || [],
        alcohol_g: editableAnalysis.totals?.alcohol_g ?? null,
        caffeine_mg: editableAnalysis.totals?.caffeine_mg ?? null,
        has_protein: editableAnalysis.quality_flags?.has_protein ?? false,
        has_fiber: editableAnalysis.quality_flags?.has_fiber ?? false,
        has_vegetables: editableAnalysis.quality_flags?.has_vegetables ?? false,
        is_ultra_processed: editableAnalysis.quality_flags?.is_ultra_processed ?? false,
        is_late_meal: editableAnalysis.quality_flags?.is_late_meal ?? false,
      };

      const { error } = await supabase
        .from('meals')
        .insert([
          {
            owner_id: user.id,
            day_id: dayIdToUse,
            time_local: time,
            kcal: editableAnalysis.kcal,
            protein_g: editableAnalysis.protein_g,
            carbs_g: editableAnalysis.carbs_g,
            fat_g: editableAnalysis.fat_g,
            fiber_g: editableAnalysis.fiber_g,
            ultra_processed_level: safeUltraProcessedLevel,
            source: 'ai',
            quality_flags: qualityFlags as unknown as Json,
          },
        ]);
      
      if (error) {
        console.error('Error saving meal:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({ title: 'Maaltijd opgeslagen' });
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['daily-scores'] });
      queryClient.invalidateQueries({ queryKey: ['diary-day'] });
      handleClose();
    },
    onError: (error) => {
      console.error('Save meal error:', error);
      toast({ 
        title: 'Kon maaltijd niet opslaan', 
        description: error instanceof Error ? error.message : 'Probeer het opnieuw',
        variant: 'destructive' 
      });
    },
  });

  const updateEditableField = (field: keyof MealAnalysis, value: string) => {
    if (!editableAnalysis) return;
    const numValue = value === '' ? null : parseFloat(value);
    setEditableAnalysis({ ...editableAnalysis, [field]: numValue });
  };

  // Convert numeric confidence to display values
  const getConfidenceDisplay = (conf: number) => {
    if (conf >= 0.75) return { label: t('addMeal.confidenceHigh'), color: 'bg-success/20 text-success-foreground' };
    if (conf >= 0.5) return { label: t('addMeal.confidenceMedium'), color: 'bg-warning/20 text-warning-foreground' };
    return { label: t('addMeal.confidenceLow'), color: 'bg-destructive/20 text-destructive-foreground' };
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>
            {showConfirmation ? t('addMeal.confirmMeal') : t('addMeal.title')}
          </DialogTitle>
          {!showConfirmation && aiUsage && (
            <p className="text-xs text-muted-foreground">
              {t('addMeal.aiCreditsRemaining', { count: aiUsage.remaining })}
            </p>
          )}
        </DialogHeader>

        {!showConfirmation ? (
          <div className="space-y-4">
            <Tabs value={inputMethod} onValueChange={(v) => setInputMethod(v as "text" | "photo" | "voice")}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="text" className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  {t('addMeal.tabDescribe')}
                </TabsTrigger>
                <TabsTrigger value="photo" className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  {t('addMeal.tabPhoto')}
                </TabsTrigger>
                <TabsTrigger value="voice" className="flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  {t('addMeal.tabVoice')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="description">{t('addMeal.describeLabel')}</Label>
                  <Textarea
                    id="description"
                    placeholder={t('addMeal.describePlaceholder')}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleTextSubmit();
                      }
                    }}
                    rows={2}
                    className="min-h-[60px] resize-none"
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
                      {t('addMeal.analyzing')}
                    </>
                  ) : (
                    t('addMeal.analyze')
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="photo" className="space-y-4 mt-4">
                {/* Photo consent check */}
                {!hasPhotoConsent && (
                  <Alert className="bg-warning/10 border-warning/30">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-sm">
                      <strong>{t('addMeal.photoConsentWarning')}</strong> {t('addMeal.photoConsentLink')}
                    </AlertDescription>
                  </Alert>
                )}

                {hasPhotoConsent && (
                  <>
                    {/* GDPR camera instructions - photos are NOT stored */}
                    <Alert className="bg-info/5 border-info/20">
                      <Info className="h-4 w-4 text-info" />
                      <AlertDescription className="text-xs text-muted-foreground">
                        <strong>Privacy:</strong> {t('addMeal.photoPrivacy')}
                      </AlertDescription>
                    </Alert>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    
                    {showCropper && rawImage ? (
                      <div className="space-y-4">
                        <ImageCropper
                          imageSrc={rawImage}
                          onCropComplete={handleCropComplete}
                          onCancel={() => {
                            setRawImage(null);
                            setShowCropper(false);
                          }}
                        />
                        <Button
                          variant="ghost"
                          className="w-full text-muted-foreground"
                          onClick={handleSkipCrop}
                        >
                          {t('addMeal.skipCrop')}
                        </Button>
                      </div>
                    ) : imagePreview ? (
                      <div className="space-y-4">
                        <div className="relative rounded-lg overflow-hidden">
                          <img 
                            src={imagePreview} 
                            alt="Maaltijd preview" 
                            className="w-full h-48 object-cover"
                          />
                          {isAnalyzing && (
                            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                              <Loader2 className="h-8 w-8 animate-spin text-white" />
                              <p className="text-white text-sm font-medium">
                                {analysisStep === 'analyzing' && '60% - Analyseren...'}
                                {analysisStep === 'clarifying' && '80% - Verduidelijken...'}
                              </p>
                            </div>
                          )}
                          {/* Show compression result badge */}
                          {compressionProgress.status === 'done' && compressionProgress.compressedSize && !isAnalyzing && (
                            <div className="absolute bottom-2 right-2 bg-green-500/90 text-white text-xs px-2 py-1 rounded-md font-medium">
                              {formatBytes(compressionProgress.originalSize)} → {formatBytes(compressionProgress.compressedSize)}
                            </div>
                          )}
                        </div>
                        
                        {/* Clarification question UI */}
                        {analysisStep === 'clarifying' && analysis?.clarification_question && !isAnalyzing && (
                          <Alert className="bg-warning/10 border-warning/30">
                            <AlertTriangle className="h-4 w-4 text-warning" />
                            <AlertDescription className="space-y-3">
                              <p className="text-sm font-medium">{analysis.clarification_question}</p>
                              <div className="flex gap-2">
                                <Input
                                  placeholder={t('addMeal.clarificationPlaceholder')}
                                  value={clarificationAnswer}
                                  onChange={(e) => setClarificationAnswer(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleClarificationSubmit()}
                                  className="flex-1"
                                />
                                <Button size="sm" onClick={handleClarificationSubmit}>
                                  {t('addMeal.confirm')}
                                </Button>
                              </div>
                              <Button variant="ghost" size="sm" onClick={skipClarification} className="w-full text-muted-foreground">
                                {t('addMeal.skipClarification')}
                              </Button>
                            </AlertDescription>
                          </Alert>
                        )}
                        
                        {/* Extra beschrijving veld - only show if not in clarification mode */}
                        {analysisStep !== 'clarifying' && (
                          <div className="space-y-2">
                            <Label htmlFor="photo-description">{t('addMeal.extraDetails')}</Label>
                            <Input
                              id="photo-description"
                              placeholder={t('addMeal.extraDetailsPlaceholder')}
                              value={photoDescription}
                              onChange={(e) => setPhotoDescription(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                              {t('addMeal.extraDetailsHint')}
                            </p>
                          </div>
                        )}
                        
                        {analysisStep !== 'clarifying' && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setImagePreview(null);
                                setRawImage(null);
                                setPhotoDescription('');
                                resetCompression();
                                setAnalysisStep('idle');
                              }}
                              className="flex-1"
                            >
                              {t('addMeal.anotherPhoto')}
                            </Button>
                            <Button
                              onClick={handlePhotoAnalyze}
                              disabled={isAnalyzing}
                              className="flex-1"
                            >
                              {isAnalyzing ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  {t('addMeal.analyzing')}
                                </>
                              ) : (
                                t('addMeal.analyze')
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : compressionProgress.status === 'compressing' ? (
                      <div className="w-full h-32 border-2 border-dashed border-primary rounded-lg flex flex-col items-center justify-center gap-3 bg-primary/5">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <div className="text-center space-y-2 w-full px-4">
                          <p className="text-sm font-medium">{t('addMeal.compressing')}</p>
                          <Progress value={compressionProgress.progress} className="h-2" />
                          <p className="text-xs text-muted-foreground">
                            {formatBytes(compressionProgress.originalSize)} → optimaliseren
                          </p>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full h-32 border-dashed hover:border-primary transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Camera className="h-8 w-8 text-muted-foreground" />
                          <span className="text-muted-foreground">{t('addMeal.takeOrChoosePhoto')}</span>
                          <span className="text-xs text-muted-foreground">{t('addMeal.maxSize')}</span>
                        </div>
                      </Button>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="voice" className="space-y-4 mt-4">
                <div className="flex flex-col items-center gap-4 py-4">
                  {isTranscribing ? (
                    <>
                      <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-sm font-medium">{t('addMeal.voiceRecognizing')}</p>
                        <p className="text-xs text-muted-foreground">{t('addMeal.voicePleaseWait')}</p>
                      </div>
                    </>
                  ) : isAnalyzing ? (
                    <>
                      <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-sm font-medium">{t('addMeal.voiceAnalyzing')}</p>
                        <p className="text-xs text-muted-foreground">{t('addMeal.voiceAnalyzingHint')}</p>
                      </div>
                    </>
                  ) : transcription ? (
                    <div className="w-full space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="transcription">{t('addMeal.voiceRecognizedText')}</Label>
                        <div className="p-3 rounded-lg bg-muted/50 border">
                          <p className="text-sm italic text-muted-foreground mb-2">"{transcription}"</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t('addMeal.voiceAdjustHint')}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="voice-description">{t('addMeal.voiceMealDescription')}</Label>
                        <Input
                          id="voice-description"
                          placeholder={t('addMeal.voiceAdjustPlaceholder')}
                          value={description || transcription}
                          onChange={(e) => setDescription(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setTranscription(null);
                            setDescription('');
                          }}
                        >
                          {t('addMeal.voiceRecordAgain')}
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={() => analyzeMeal(description || transcription)}
                          disabled={isAnalyzing}
                        >
                          {t('addMeal.analyze')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative">
                        <Button
                          size="lg"
                          variant={isRecording ? 'destructive' : 'default'}
                          className="h-20 w-20 rounded-full relative z-10"
                          onClick={isRecording ? stopRecording : startRecording}
                        >
                          <Mic className={`h-8 w-8 ${isRecording ? 'animate-pulse' : ''}`} />
                        </Button>
                        {/* Audio level ring indicator */}
                        {isRecording && (
                          <div 
                            className="absolute inset-0 rounded-full border-4 border-destructive/50 transition-transform duration-75"
                            style={{
                              transform: `scale(${1 + (audioLevel / 100) * 0.4})`,
                              opacity: 0.3 + (audioLevel / 100) * 0.7,
                            }}
                          />
                        )}
                      </div>
                      
                      {/* Audio level bars */}
                      {isRecording && (
                        <div className="flex items-end gap-1 h-8 w-32">
                          {[...Array(8)].map((_, i) => {
                            const threshold = (i + 1) * 12.5;
                            const isActive = audioLevel >= threshold;
                            return (
                              <div
                                key={i}
                                className={`flex-1 rounded-full transition-all duration-75 ${
                                  isActive 
                                    ? i < 3 ? 'bg-green-500' : i < 6 ? 'bg-yellow-500' : 'bg-red-500'
                                    : 'bg-muted'
                                }`}
                                style={{
                                  height: `${20 + i * 10}%`,
                                }}
                              />
                            );
                          })}
                        </div>
                      )}

                      <p className="text-sm text-muted-foreground text-center">
                        {isRecording ? t('addMeal.voiceTapToStop') : t('addMeal.voiceTapToSpeak')}
                      </p>
                      {!isRecording && (
                        <Alert className="bg-muted/50 border-muted">
                          <Info className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            {t('addMeal.voiceMicPermissionHint')}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="space-y-4">
            {/* AI Analysis result */}
            {editableAnalysis && (
              <>
                {/* AI Analysis result with range and confidence */}
                <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-sm">{editableAnalysis.description}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${getConfidenceDisplay(editableAnalysis.confidence).color}`}>
                      {Math.round(editableAnalysis.confidence * 100)}% {getConfidenceDisplay(editableAnalysis.confidence).label}
                    </span>
                  </div>
                  
                  {/* Calorie range if available */}
                  {editableAnalysis.totals?.kcal_min && editableAnalysis.totals?.kcal_max && (
                    <p className="text-sm text-muted-foreground">
                      {t('addMeal.estimated')}: <span className="font-medium">{editableAnalysis.totals.kcal_min} - {editableAnalysis.totals.kcal_max} kcal</span>
                    </p>
                  )}
                  
                  {/* Missing info warnings */}
                  {editableAnalysis.missing_info && editableAnalysis.missing_info.length > 0 && (
                    <div className="text-xs text-warning-foreground bg-warning/10 px-2 py-1.5 rounded">
                      ⚠️ {t('addMeal.missing')}: {editableAnalysis.missing_info.join(', ')}
                    </div>
                  )}
                  
                  {/* Clarification question for low confidence */}
                  {editableAnalysis.clarification_question && editableAnalysis.confidence < 0.5 && (
                    <Alert className="mt-2 bg-info/10 border-info/30">
                      <Info className="h-4 w-4 text-info" />
                      <AlertDescription className="text-sm">
                        <strong>{t('addMeal.clarificationNeeded')}:</strong> {editableAnalysis.clarification_question}
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('addMeal.clarificationHint')}
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">{t('addMeal.date')}</Label>
                    <Input 
                      id="date" 
                      type="date" 
                      value={mealDate} 
                      onChange={(e) => handleDateChange(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">{t('addMeal.time')}</Label>
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
                    <Label htmlFor="kcal">{t('addMeal.calories')}</Label>
                    <Input
                      id="kcal"
                      type="number"
                      value={editableAnalysis.kcal ?? ''}
                      onChange={(e) => updateEditableField('kcal', e.target.value)}
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="protein">{t('addMeal.protein')}</Label>
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
                    <Label htmlFor="carbs">{t('addMeal.carbs')}</Label>
                    <Input
                      id="carbs"
                      type="number"
                      value={editableAnalysis.carbs_g ?? ''}
                      onChange={(e) => updateEditableField('carbs_g', e.target.value)}
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fat">{t('addMeal.fat')}</Label>
                    <Input
                      id="fat"
                      type="number"
                      value={editableAnalysis.fat_g ?? ''}
                      onChange={(e) => updateEditableField('fat_g', e.target.value)}
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fiber">{t('addMeal.fiber')}</Label>
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
                    {t('addMeal.back')}
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
                    {t('addMeal.confirmMeal')}
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
