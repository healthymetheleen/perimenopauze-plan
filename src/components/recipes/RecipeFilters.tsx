import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { mealTypes, seasons, cyclePhases, dietTags } from '@/hooks/useRecipes';
import { ChevronDown, Leaf, Moon, AlertCircle, Utensils, X, Save, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecipeFiltersProps {
  // Quick toggles
  autoSeasonEnabled: boolean;
  setAutoSeasonEnabled: (value: boolean) => void;
  autoCycleEnabled: boolean;
  setAutoCycleEnabled: (value: boolean) => void;
  currentSeason: string;
  currentCyclePhase: string;
  // Regular filters
  mealType: string;
  setMealType: (value: string) => void;
  // Saved allergies (persisted)
  savedAllergyTags: string[];
  toggleAllergyTag: (tag: string) => void;
  // Additional diet filters (not persisted)
  selectedDietTags: string[];
  setSelectedDietTags: (value: string[]) => void;
  onClear: () => void;
}

// All persisted tags (allergies, diet preferences, life stage)
const persistedTagValues = [
  'glutenvrij', 'zuivelvrij', 'lactosevrij', 'eivrij', 'notenvrij', 'sojavrij',
  'vegetarisch', 'veganistisch', 'pescotarisch', 'keto', 'low-carb',
  'zwangerschapsveilig', 'kinderwensvriendelijk'
];
const healthTags = ['eiwitrijk', 'vezelrijk', 'anti-inflammatoir', 'bloedsuikerstabiel', 'ijzerrijk', 'foliumzuurrijk'];

export function RecipeFilters({
  autoSeasonEnabled,
  setAutoSeasonEnabled,
  autoCycleEnabled,
  setAutoCycleEnabled,
  currentSeason,
  currentCyclePhase,
  mealType,
  setMealType,
  savedAllergyTags,
  toggleAllergyTag,
  selectedDietTags,
  setSelectedDietTags,
  onClear,
}: RecipeFiltersProps) {
  const [openSections, setOpenSections] = useState<string[]>(['quick']);

  const toggleSection = (section: string) => {
    setOpenSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const toggleDietTag = (tag: string) => {
    setSelectedDietTags(
      selectedDietTags.includes(tag)
        ? selectedDietTags.filter(t => t !== tag)
        : [...selectedDietTags, tag]
    );
  };

  const hasFilters = mealType || savedAllergyTags.length > 0 || selectedDietTags.length > 0;

  return (
    <div className="space-y-3">
      {/* Quick toggles - always visible */}
      <div className="p-3 rounded-lg bg-muted/50 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Snelle filters</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="h-4 w-4 text-primary" />
            <Label htmlFor="auto-season" className="text-sm font-medium cursor-pointer">
              Seizoensproducten
            </Label>
            {autoSeasonEnabled && currentSeason && (
              <Badge variant="secondary" className="text-xs">
                {seasons.find(s => s.value === currentSeason)?.label || currentSeason}
              </Badge>
            )}
          </div>
          <Switch
            id="auto-season"
            checked={autoSeasonEnabled}
            onCheckedChange={setAutoSeasonEnabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-primary" />
            <Label htmlFor="auto-cycle" className="text-sm font-medium cursor-pointer">
              Cyclus syncing
            </Label>
            {autoCycleEnabled && currentCyclePhase && (
              <Badge variant="secondary" className="text-xs">
                {cyclePhases.find(c => c.value === currentCyclePhase)?.label || currentCyclePhase}
              </Badge>
            )}
          </div>
          <Switch
            id="auto-cycle"
            checked={autoCycleEnabled}
            onCheckedChange={setAutoCycleEnabled}
          />
        </div>
      </div>

      {/* Active filter summary */}
      {hasFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Actief:</span>
          {mealType && (
            <Badge variant="secondary" className="gap-1">
              {mealTypes.find(m => m.value === mealType)?.label}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setMealType('')} />
            </Badge>
          )}
          {savedAllergyTags.map(tag => (
            <Badge key={tag} variant="outline" className="gap-1 border-primary/30 bg-primary/5">
              <Save className="h-2.5 w-2.5" />
              {dietTags.find(t => t.value === tag)?.label || tag}
              <X className="h-3 w-3 cursor-pointer" onClick={() => toggleAllergyTag(tag)} />
            </Badge>
          ))}
          {selectedDietTags.map(tag => (
            <Badge key={tag} variant="outline" className="gap-1">
              {dietTags.find(t => t.value === tag)?.label || tag}
              <X className="h-3 w-3 cursor-pointer" onClick={() => toggleDietTag(tag)} />
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={onClear} className="h-6 px-2 text-xs">
            Wissen
          </Button>
        </div>
      )}

      {/* Meal type section */}
      <Collapsible open={openSections.includes('meal')} onOpenChange={() => toggleSection('meal')}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-10 px-3">
            <span className="flex items-center gap-2">
              <Utensils className="h-4 w-4" />
              Maaltijdmoment
              {mealType && <Badge variant="secondary" className="ml-2 text-xs">{mealTypes.find(m => m.value === mealType)?.label}</Badge>}
            </span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", openSections.includes('meal') && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 pb-3 px-3">
          <div className="flex flex-wrap gap-2">
            {mealTypes.map((type) => (
              <Badge
                key={type.value}
                variant={mealType === type.value ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/20"
                onClick={() => setMealType(mealType === type.value ? '' : type.value)}
              >
                {type.label}
              </Badge>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Allergies & life stage section (persisted) */}
      <Collapsible open={openSections.includes('allergy')} onOpenChange={() => toggleSection('allergy')}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-10 px-3">
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              Allergieën & levensfase
              <Badge variant="outline" className="ml-1 text-[10px]">
                <Save className="h-2.5 w-2.5 mr-1" />
                wordt onthouden
              </Badge>
              {savedAllergyTags.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {savedAllergyTags.length}
                </Badge>
              )}
            </span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", openSections.includes('allergy') && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 pb-3 px-3">
          <p className="text-xs text-muted-foreground mb-3">
            Deze voorkeuren worden onthouden en automatisch toegepast
          </p>
          <div className="flex flex-wrap gap-2">
            {persistedTagValues.map((tag) => {
              const tagInfo = dietTags.find(t => t.value === tag);
              if (!tagInfo) return null;
              const isSelected = savedAllergyTags.includes(tag);
              return (
                <Badge
                  key={tag}
                  variant={isSelected ? 'default' : 'outline'}
                  className={cn(
                    "cursor-pointer",
                    isSelected && "bg-primary hover:bg-primary/90"
                  )}
                  onClick={() => toggleAllergyTag(tag)}
                >
                  {tagInfo.label}
                </Badge>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Health tags section */}
      <Collapsible open={openSections.includes('health')} onOpenChange={() => toggleSection('health')}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-10 px-3">
            <span className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4" />
              Voedingswaarden
              {selectedDietTags.filter(t => healthTags.includes(t)).length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {selectedDietTags.filter(t => healthTags.includes(t)).length}
                </Badge>
              )}
            </span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", openSections.includes('health') && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 pb-3 px-3">
          <div className="flex flex-wrap gap-2">
            {healthTags.map((tag) => {
              const tagInfo = dietTags.find(t => t.value === tag);
              if (!tagInfo) return null;
              return (
                <Badge
                  key={tag}
                  variant={selectedDietTags.includes(tag) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleDietTag(tag)}
                >
                  {tagInfo.label}
                </Badge>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
