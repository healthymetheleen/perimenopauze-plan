import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { LoadingState } from '@/components/ui/loading-state';
import { sanitizeImageUrl } from '@/lib/sanitize';
import { 
  Plus, Pencil, Trash2, Moon, Wind, Sun, Leaf, 
  Dumbbell, Image, Upload, Sparkles, RefreshCw, Loader2, Music, Volume2
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  useAdminMeditations,
  useAdminExercises,
  useCreateMeditation,
  useUpdateMeditation,
  useDeleteMeditation,
  useCreateExercise,
  useUpdateExercise,
  useDeleteExercise,
  uploadContentImage,
  uploadMeditationAudio,
  formatFileSize,
  AUDIO_UPLOAD_CONFIG,
  type Meditation,
  type Exercise,
  type MeditationInsert,
  type ExerciseInsert,
} from '@/hooks/useContent';
import { supabase } from '@/integrations/supabase/client';

const categoryIcons = {
  sleep: Moon,
  stress: Wind,
  energy: Sun,
  cycle: Leaf,
};

const categoryLabels = {
  sleep: 'Slaap',
  stress: 'Stress',
  energy: 'Energie',
  cycle: 'Cyclus',
};

const phaseLabels = {
  menstrual: 'Menstruatie (Winter)',
  follicular: 'Folliculair (Lente)',
  ovulatory: 'Ovulatie (Zomer)',
  luteal: 'Luteaal (Herfst)',
};

const difficultyLabels = {
  beginner: 'Beginner',
  intermediate: 'Gemiddeld',
  advanced: 'Gevorderd',
};

// Meditation Form Dialog
function MeditationFormDialog({ 
  meditation, 
  onClose 
}: { 
  meditation?: Meditation; 
  onClose: () => void;
}) {
  const { toast } = useToast();
  const createMutation = useCreateMeditation();
  const updateMutation = useUpdateMeditation();
  
  const [formData, setFormData] = useState<Partial<MeditationInsert>>({
    title: meditation?.title || '',
    description: meditation?.description || '',
    duration: meditation?.duration || '',
    category: meditation?.category || 'sleep',
    image_url: meditation?.image_url || '',
    audio_url: meditation?.audio_url || '',
    cycle_season: meditation?.cycle_season || null,
    sort_order: meditation?.sort_order || 0,
    is_active: meditation?.is_active ?? true,
  });
  
  const [uploading, setUploading] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [audioUploadProgress, setAudioUploadProgress] = useState(0);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const url = await uploadContentImage(file, 'meditations');
      setFormData(prev => ({ ...prev, image_url: url }));
      toast({ title: 'Afbeelding geüpload!' });
    } catch (error) {
      toast({ title: 'Upload mislukt', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingAudio(true);
    setAudioUploadProgress(0);
    
    try {
      const url = await uploadMeditationAudio(file, setAudioUploadProgress);
      setFormData(prev => ({ ...prev, audio_url: url }));
      toast({ 
        title: 'Audio geüpload!', 
        description: `${formatFileSize(file.size)} - ${file.name}` 
      });
    } catch (error) {
      toast({ 
        title: 'Upload mislukt', 
        description: error instanceof Error ? error.message : 'Onbekende fout',
        variant: 'destructive' 
      });
    } finally {
      setUploadingAudio(false);
      setAudioUploadProgress(0);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.duration || !formData.category) {
      toast({ title: 'Vul alle verplichte velden in', variant: 'destructive' });
      return;
    }

    try {
      if (meditation) {
        await updateMutation.mutateAsync({ id: meditation.id, ...formData });
        toast({ title: 'Meditatie bijgewerkt!' });
      } else {
        await createMutation.mutateAsync(formData as MeditationInsert);
        toast({ title: 'Meditatie toegevoegd!' });
      }
      onClose();
    } catch (error) {
      toast({ title: 'Er ging iets mis', variant: 'destructive' });
    }
  };

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{meditation ? 'Meditatie bewerken' : 'Nieuwe meditatie'}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Titel *</Label>
          <Input 
            value={formData.title} 
            onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
            placeholder="Bodyscan voor de nacht"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Beschrijving</Label>
          <Textarea 
            value={formData.description || ''} 
            onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
            placeholder="Een zachte reis door je lichaam..."
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Duur *</Label>
            <Input 
              value={formData.duration} 
              onChange={e => setFormData(p => ({ ...p, duration: e.target.value }))}
              placeholder="15 min"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Categorie *</Label>
            <Select 
              value={formData.category} 
              onValueChange={v => setFormData(p => ({ ...p, category: v as Meditation['category'] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Cyclus seizoen (optioneel)</Label>
          <Select 
            value={formData.cycle_season || 'none'} 
            onValueChange={v => setFormData(p => ({ ...p, cycle_season: v === 'none' ? null : v as Meditation['cycle_season'] }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecteer seizoen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Geen specifiek seizoen</SelectItem>
              <SelectItem value="winter">Winter (Menstruatie)</SelectItem>
              <SelectItem value="lente">Lente (Folliculair)</SelectItem>
              <SelectItem value="zomer">Zomer (Ovulatie)</SelectItem>
              <SelectItem value="herfst">Herfst (Luteaal)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Afbeelding</Label>
          <div className="flex gap-2">
            <Input 
              value={formData.image_url || ''} 
              onChange={e => setFormData(p => ({ ...p, image_url: e.target.value }))}
              placeholder="URL of upload"
            />
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <Button variant="outline" size="icon" disabled={uploading} asChild>
                <span><Upload className="h-4 w-4" /></span>
              </Button>
            </label>
          </div>
          {sanitizeImageUrl(formData.image_url) && (
            <img src={sanitizeImageUrl(formData.image_url)} alt="Preview" className="w-full h-32 object-cover rounded-lg mt-2" />
          )}
        </div>
        
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            Audio bestand
          </Label>
          <div className="flex gap-2">
            <Input 
              value={formData.audio_url || ''} 
              onChange={e => setFormData(p => ({ ...p, audio_url: e.target.value }))}
              placeholder="URL of upload een bestand"
              className="flex-1"
            />
            <label className="cursor-pointer">
              <input 
                type="file" 
                accept={AUDIO_UPLOAD_CONFIG.acceptString}
                className="hidden" 
                onChange={handleAudioUpload} 
                disabled={uploadingAudio}
              />
              <Button variant="outline" size="icon" disabled={uploadingAudio} asChild>
                <span>{uploadingAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}</span>
              </Button>
            </label>
          </div>
          {uploadingAudio && (
            <div className="space-y-1">
              <Progress value={audioUploadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">Uploaden... {audioUploadProgress}%</p>
            </div>
          )}
          {formData.audio_url && !uploadingAudio && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <Volume2 className="h-4 w-4 text-primary" />
              <audio controls src={formData.audio_url} className="h-8 flex-1" />
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Max {AUDIO_UPLOAD_CONFIG.maxSizeMB}MB. Ondersteunde formaten: MP3, WAV, M4A, AAC, OGG
          </p>
        </div>
        
        <div className="flex items-center justify-between">
          <Label>Actief (zichtbaar voor gebruikers)</Label>
          <Switch 
            checked={formData.is_active} 
            onCheckedChange={v => setFormData(p => ({ ...p, is_active: v }))}
          />
        </div>
        
        <Button 
          onClick={handleSubmit} 
          className="w-full btn-gradient"
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {meditation ? 'Opslaan' : 'Toevoegen'}
        </Button>
      </div>
    </DialogContent>
  );
}

// Exercise Form Dialog
function ExerciseFormDialog({ 
  exercise, 
  onClose 
}: { 
  exercise?: Exercise; 
  onClose: () => void;
}) {
  const { toast } = useToast();
  const createMutation = useCreateExercise();
  const updateMutation = useUpdateExercise();
  
  const [formData, setFormData] = useState<Partial<ExerciseInsert>>({
    name: exercise?.name || '',
    name_dutch: exercise?.name_dutch || '',
    description: exercise?.description || '',
    duration: exercise?.duration || '',
    benefits: exercise?.benefits || [],
    image_url: exercise?.image_url || '',
    video_url: exercise?.video_url || '',
    difficulty: exercise?.difficulty || 'beginner',
    cycle_phase: exercise?.cycle_phase || 'menstrual',
    sort_order: exercise?.sort_order || 0,
    is_active: exercise?.is_active ?? true,
  });
  
  const [benefitInput, setBenefitInput] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const url = await uploadContentImage(file, 'exercises');
      setFormData(prev => ({ ...prev, image_url: url }));
      toast({ title: 'Afbeelding geüpload!' });
    } catch (error) {
      toast({ title: 'Upload mislukt', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const addBenefit = () => {
    if (benefitInput.trim()) {
      setFormData(p => ({ ...p, benefits: [...(p.benefits || []), benefitInput.trim()] }));
      setBenefitInput('');
    }
  };

  const removeBenefit = (index: number) => {
    setFormData(p => ({ ...p, benefits: (p.benefits || []).filter((_, i) => i !== index) }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.name_dutch || !formData.duration || !formData.cycle_phase) {
      toast({ title: 'Vul alle verplichte velden in', variant: 'destructive' });
      return;
    }

    try {
      if (exercise) {
        await updateMutation.mutateAsync({ id: exercise.id, ...formData });
        toast({ title: 'Oefening bijgewerkt!' });
      } else {
        await createMutation.mutateAsync(formData as ExerciseInsert);
        toast({ title: 'Oefening toegevoegd!' });
      }
      onClose();
    } catch (error) {
      toast({ title: 'Er ging iets mis', variant: 'destructive' });
    }
  };

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{exercise ? 'Oefening bewerken' : 'Nieuwe oefening'}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Naam (Engels) *</Label>
            <Input 
              value={formData.name} 
              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              placeholder="Child's Pose"
            />
          </div>
          <div className="space-y-2">
            <Label>Naam (NL) *</Label>
            <Input 
              value={formData.name_dutch} 
              onChange={e => setFormData(p => ({ ...p, name_dutch: e.target.value }))}
              placeholder="Kindhouding"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Beschrijving</Label>
          <Textarea 
            value={formData.description || ''} 
            onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
            placeholder="Kniel op de grond..."
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Duur *</Label>
            <Input 
              value={formData.duration} 
              onChange={e => setFormData(p => ({ ...p, duration: e.target.value }))}
              placeholder="2-5 min"
            />
          </div>
          <div className="space-y-2">
            <Label>Moeilijkheid *</Label>
            <Select 
              value={formData.difficulty} 
              onValueChange={v => setFormData(p => ({ ...p, difficulty: v as Exercise['difficulty'] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(difficultyLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Cyclusfase *</Label>
          <Select 
            value={formData.cycle_phase} 
            onValueChange={v => setFormData(p => ({ ...p, cycle_phase: v as Exercise['cycle_phase'] }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(phaseLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Voordelen</Label>
          <div className="flex gap-2">
            <Input 
              value={benefitInput} 
              onChange={e => setBenefitInput(e.target.value)}
              placeholder="Ontspant de onderrug"
              onKeyPress={e => e.key === 'Enter' && addBenefit()}
            />
            <Button variant="outline" onClick={addBenefit}>+</Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.benefits?.map((benefit, i) => (
              <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => removeBenefit(i)}>
                {benefit} ×
              </Badge>
            ))}
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Afbeelding</Label>
          <div className="flex gap-2">
            <Input 
              value={formData.image_url || ''} 
              onChange={e => setFormData(p => ({ ...p, image_url: e.target.value }))}
              placeholder="URL of upload"
            />
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <Button variant="outline" size="icon" disabled={uploading} asChild>
                <span><Upload className="h-4 w-4" /></span>
              </Button>
            </label>
          </div>
          {sanitizeImageUrl(formData.image_url) && (
            <img src={sanitizeImageUrl(formData.image_url)} alt="Preview" className="w-full h-32 object-cover rounded-lg mt-2" />
          )}
        </div>
        
        <div className="space-y-2">
          <Label>Video URL (optioneel)</Label>
          <Input 
            value={formData.video_url || ''} 
            onChange={e => setFormData(p => ({ ...p, video_url: e.target.value }))}
            placeholder="https://youtube.com/..."
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label>Actief (zichtbaar voor gebruikers)</Label>
          <Switch 
            checked={formData.is_active} 
            onCheckedChange={v => setFormData(p => ({ ...p, is_active: v }))}
          />
        </div>
        
        <Button 
          onClick={handleSubmit} 
          className="w-full btn-gradient"
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {exercise ? 'Opslaan' : 'Toevoegen'}
        </Button>
      </div>
    </DialogContent>
  );
}

export default function ContentAdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: meditations, isLoading: meditationsLoading } = useAdminMeditations();
  const { data: exercises, isLoading: exercisesLoading } = useAdminExercises();
  const deleteMeditation = useDeleteMeditation();
  const deleteExercise = useDeleteExercise();
  
  const [editingMeditation, setEditingMeditation] = useState<Meditation | undefined>();
  const [editingExercise, setEditingExercise] = useState<Exercise | undefined>();
  const [showMeditationDialog, setShowMeditationDialog] = useState(false);
  const [showExerciseDialog, setShowExerciseDialog] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const handleDeleteMeditation = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze meditatie wilt verwijderen?')) return;
    try {
      await deleteMeditation.mutateAsync(id);
      toast({ title: 'Meditatie verwijderd' });
    } catch {
      toast({ title: 'Verwijderen mislukt', variant: 'destructive' });
    }
  };

  const handleDeleteExercise = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze oefening wilt verwijderen?')) return;
    try {
      await deleteExercise.mutateAsync(id);
      toast({ title: 'Oefening verwijderd' });
    } catch {
      toast({ title: 'Verwijderen mislukt', variant: 'destructive' });
    }
  };

  const handleRegenerateImage = async (exercise: Exercise) => {
    setRegeneratingId(exercise.id);
    try {
      const { data, error } = await supabase.functions.invoke('regenerate-exercise-image', {
        body: {
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          cyclePhase: exercise.cycle_phase,
        },
      });

      if (error) throw error;
      
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['admin-exercises'] });
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      
      toast({ title: 'Afbeelding opnieuw gegenereerd!' });
    } catch (error) {
      console.error('Regenerate error:', error);
      toast({ title: 'Genereren mislukt', description: 'Probeer het opnieuw', variant: 'destructive' });
    } finally {
      setRegeneratingId(null);
    }
  };

  if (meditationsLoading || exercisesLoading) {
    return (
      <AppLayout>
        <LoadingState message="Content laden..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gradient">Content Beheer</h1>
          <p className="text-muted-foreground">Beheer meditaties en oefeningen</p>
        </div>

        <Tabs defaultValue="meditations" className="space-y-4">
          <TabsList className="w-full glass">
            <TabsTrigger value="meditations" className="flex-1">
              <Sparkles className="h-4 w-4 mr-2" />
              Meditaties ({meditations?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="exercises" className="flex-1">
              <Dumbbell className="h-4 w-4 mr-2" />
              Oefeningen ({exercises?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Meditations Tab */}
          <TabsContent value="meditations" className="space-y-4">
            <Dialog open={showMeditationDialog} onOpenChange={setShowMeditationDialog}>
              <DialogTrigger asChild>
                <Button className="btn-gradient" onClick={() => setEditingMeditation(undefined)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nieuwe meditatie
                </Button>
              </DialogTrigger>
              <MeditationFormDialog 
                meditation={editingMeditation} 
                onClose={() => {
                  setShowMeditationDialog(false);
                  setEditingMeditation(undefined);
                }}
              />
            </Dialog>

            <div className="grid gap-4">
              {meditations?.map(meditation => {
                const Icon = categoryIcons[meditation.category];
                return (
                  <Card key={meditation.id} className={`glass rounded-xl ${!meditation.is_active ? 'opacity-60' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {meditation.image_url ? (
                          <img src={meditation.image_url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                            <Image className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">{meditation.title}</h3>
                            {!meditation.is_active && <Badge variant="outline">Inactief</Badge>}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Icon className="h-4 w-4" />
                            <span>{categoryLabels[meditation.category]}</span>
                            <span>•</span>
                            <span>{meditation.duration}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setEditingMeditation(meditation);
                              setShowMeditationDialog(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteMeditation(meditation.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              {(!meditations || meditations.length === 0) && (
                <Card className="glass rounded-xl">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Nog geen meditaties. Klik op "Nieuwe meditatie" om te beginnen.
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Exercises Tab */}
          <TabsContent value="exercises" className="space-y-4">
            <Dialog open={showExerciseDialog} onOpenChange={setShowExerciseDialog}>
              <DialogTrigger asChild>
                <Button className="btn-gradient" onClick={() => setEditingExercise(undefined)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nieuwe oefening
                </Button>
              </DialogTrigger>
              <ExerciseFormDialog 
                exercise={editingExercise} 
                onClose={() => {
                  setShowExerciseDialog(false);
                  setEditingExercise(undefined);
                }}
              />
            </Dialog>

            <div className="grid gap-4">
              {exercises?.map(exercise => (
                <Card key={exercise.id} className={`glass rounded-xl ${!exercise.is_active ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="relative group">
                        {exercise.image_url ? (
                          <img src={exercise.image_url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                            <Image className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/60 rounded-lg"
                          onClick={() => handleRegenerateImage(exercise)}
                          disabled={regeneratingId === exercise.id}
                          title="Afbeelding opnieuw genereren"
                        >
                          {regeneratingId === exercise.id ? (
                            <Loader2 className="h-5 w-5 text-white animate-spin" />
                          ) : (
                            <RefreshCw className="h-5 w-5 text-white" />
                          )}
                        </Button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{exercise.name_dutch}</h3>
                          {!exercise.is_active && <Badge variant="outline">Inactief</Badge>}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <span>{phaseLabels[exercise.cycle_phase]}</span>
                          <span>•</span>
                          <span>{exercise.duration}</span>
                          <span>•</span>
                          <span>{difficultyLabels[exercise.difficulty]}</span>
                        </div>
                        {exercise.description && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                            {exercise.description.split('\n')[0]}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleRegenerateImage(exercise)}
                          disabled={regeneratingId === exercise.id}
                          title="Afbeelding opnieuw genereren"
                        >
                          {regeneratingId === exercise.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4 text-primary" />
                          )}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setEditingExercise(exercise);
                            setShowExerciseDialog(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteExercise(exercise.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {(!exercises || exercises.length === 0) && (
                <Card className="glass rounded-xl">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Nog geen oefeningen. Klik op "Nieuwe oefening" om te beginnen.
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
