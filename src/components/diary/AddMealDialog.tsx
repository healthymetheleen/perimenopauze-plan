import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAIUsage } from '@/hooks/useAIUsage';
import { useConsent } from '@/hooks/useConsent';
import { ImageCropper } from './ImageCropper';
import { Loader2, Type, Camera, Mic, Check, Edit2, Crop } from 'lucide-react';
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

export function AddMealDialog({ open, onOpenChange, dayId: initialDayId, selectedDate, onDateChange }: AddMealDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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
    setAnalysis(null);
    setEditableAnalysis(null);
    setShowConfirmation(false);
    setTime(new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }));
    setMealDate(selectedDate);
    setCurrentDayId(initialDayId);
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

  // Analyze meal with AI
  const analyzeMeal = async (text?: string, imageBase64?: string) => {
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

  // Compress and resize image to reduce memory usage
  const compressImage = (file: File, maxWidth: number = 1024, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions while maintaining aspect ratio
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  // Handle photo upload with compression - show cropper first
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Check file size and compress if needed
      if (file.size > 2 * 1024 * 1024) { // > 2MB
        toast({
          title: 'Foto wordt gecomprimeerd...',
          description: 'Een moment geduld.',
        });
      }
      
      const compressedBase64 = await compressImage(file, 1024, 0.7);
      setRawImage(compressedBase64);
      setShowCropper(true); // Show cropper first
    } catch (error) {
      toast({
        title: 'Foto kon niet worden geladen',
        description: 'Probeer een andere foto of verklein de bestandsgrootte.',
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
        ai_ultra_processed_level_raw: editableAnalysis.ultra_processed_level ?? null,
        items: editableAnalysis.items || [],
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

  const confidenceColors = {
    high: 'bg-success/20 text-success-foreground',
    medium: 'bg-warning/20 text-warning-foreground',
    low: 'bg-destructive/20 text-destructive-foreground',
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
              {aiUsage.remaining} van {aiUsage.limit} AI analyses vandaag
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
                      Overslaan (hele foto gebruiken)
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
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="h-8 w-8 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                    
                    {/* Extra beschrijving veld */}
                    <div className="space-y-2">
                      <Label htmlFor="photo-description">Extra details (optioneel)</Label>
                      <Input
                        id="photo-description"
                        placeholder="Bijv: volkoren brood, havermelk, biologisch"
                        value={photoDescription}
                        onChange={(e) => setPhotoDescription(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Voeg details toe zoals: volkoren/spelt, volle/magere melk, biologisch, etc.
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setImagePreview(null);
                          setRawImage(null);
                          setPhotoDescription('');
                        }}
                        className="flex-1"
                      >
                        Andere foto
                      </Button>
                      <Button
                        onClick={handlePhotoAnalyze}
                        disabled={isAnalyzing}
                        className="flex-1"
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
                    </div>
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
                      <span className="text-xs text-muted-foreground">Je kunt daarna bijsnijden naar het bord</span>
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
