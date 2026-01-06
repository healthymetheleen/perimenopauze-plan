import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { mealTypes, seasons, cyclePhases, dietTags } from '@/hooks/useRecipes';
import { ChevronDown, Leaf, Moon, AlertCircle, Utensils, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecipeFiltersProps {
  mealType: string;
  setMealType: (value: string) => void;
  season: string;
  setSeason: (value: string) => void;
  cyclePhase: string;
  setCyclePhase: (value: string) => void;
  selectedDietTags: string[];
  setSelectedDietTags: (value: string[]) => void;
  onClear: () => void;
}

// Group diet tags into categories
const allergyTags = ['glutenvrij', 'zuivelvrij', 'lactosevrij', 'eivrij', 'notenvrij', 'sojavrij'];
const dietPreferenceTags = ['vegetarisch', 'veganistisch', 'pescotarisch', 'keto', 'low-carb'];
const healthTags = ['eiwitrijk', 'vezelrijk', 'anti-inflammatoir', 'bloedsuikerstabiel', 'ijzerrijk', 'foliumzuurrijk'];
const lifeStageTags = ['zwangerschapsveilig', 'kinderwensvriendelijk'];

export function RecipeFilters({
  mealType,
  setMealType,
  season,
  setSeason,
  cyclePhase,
  setCyclePhase,
  selectedDietTags,
  setSelectedDietTags,
  onClear,
}: RecipeFiltersProps) {
  const [openSections, setOpenSections] = useState<string[]>(['meal']);

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

  const hasFilters = mealType || season || cyclePhase || selectedDietTags.length > 0;

  const activeFilterCount = [
    mealType ? 1 : 0,
    season ? 1 : 0,
    cyclePhase ? 1 : 0,
    selectedDietTags.length,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-2">
      {/* Quick summary of active filters */}
      {hasFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Actieve filters:</span>
          {mealType && (
            <Badge variant="secondary" className="gap-1">
              {mealTypes.find(m => m.value === mealType)?.label}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setMealType('')} />
            </Badge>
          )}
          {season && (
            <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <Leaf className="h-3 w-3" />
              {seasons.find(s => s.value === season)?.label}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setSeason('')} />
            </Badge>
          )}
          {cyclePhase && (
            <Badge variant="secondary" className="gap-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              <Moon className="h-3 w-3" />
              {cyclePhases.find(c => c.value === cyclePhase)?.label}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setCyclePhase('')} />
            </Badge>
          )}
          {selectedDietTags.map(tag => (
            <Badge key={tag} variant="outline" className="gap-1">
              {dietTags.find(t => t.value === tag)?.label || tag}
              <X className="h-3 w-3 cursor-pointer" onClick={() => toggleDietTag(tag)} />
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={onClear} className="h-6 px-2 text-xs">
            Alles wissen
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

      {/* Season section */}
      <Collapsible open={openSections.includes('season')} onOpenChange={() => toggleSection('season')}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-10 px-3">
            <span className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-green-600" />
              Seizoensproducten
              {season && <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-800">{seasons.find(s => s.value === season)?.label}</Badge>}
            </span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", openSections.includes('season') && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 pb-3 px-3">
          <p className="text-xs text-muted-foreground mb-2">
            Recepten met ingrediënten die nu in het seizoen zijn in Nederland
          </p>
          <div className="flex flex-wrap gap-2">
            {seasons.map((s) => (
              <Badge
                key={s.value}
                variant={season === s.value ? 'default' : 'outline'}
                className={cn(
                  "cursor-pointer hover:bg-green-100 dark:hover:bg-green-900",
                  season === s.value && "bg-green-600 hover:bg-green-700"
                )}
                onClick={() => setSeason(season === s.value ? '' : s.value)}
              >
                {s.label}
              </Badge>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Cycle phase section */}
      <Collapsible open={openSections.includes('cycle')} onOpenChange={() => toggleSection('cycle')}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-10 px-3">
            <span className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-purple-600" />
              Cyclus syncing
              {cyclePhase && <Badge variant="secondary" className="ml-2 text-xs bg-purple-100 text-purple-800">{cyclePhases.find(c => c.value === cyclePhase)?.label}</Badge>}
            </span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", openSections.includes('cycle') && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 pb-3 px-3">
          <p className="text-xs text-muted-foreground mb-2">
            Recepten afgestemd op je cyclusfase
          </p>
          <div className="flex flex-wrap gap-2">
            {cyclePhases.map((phase) => (
              <Badge
                key={phase.value}
                variant={cyclePhase === phase.value ? 'default' : 'outline'}
                className={cn(
                  "cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900 flex-col items-start py-2",
                  cyclePhase === phase.value && "bg-purple-600 hover:bg-purple-700"
                )}
                onClick={() => setCyclePhase(cyclePhase === phase.value ? '' : phase.value)}
              >
                <span>{phase.label}</span>
                <span className="text-[10px] opacity-70 font-normal">{phase.description}</span>
              </Badge>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Allergies section */}
      <Collapsible open={openSections.includes('allergy')} onOpenChange={() => toggleSection('allergy')}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-10 px-3">
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              Allergieën & intoleranties
              {selectedDietTags.filter(t => allergyTags.includes(t)).length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {selectedDietTags.filter(t => allergyTags.includes(t)).length}
                </Badge>
              )}
            </span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", openSections.includes('allergy') && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 pb-3 px-3">
          <div className="flex flex-wrap gap-2">
            {allergyTags.map((tag) => {
              const tagInfo = dietTags.find(t => t.value === tag);
              if (!tagInfo) return null;
              return (
                <Badge
                  key={tag}
                  variant={selectedDietTags.includes(tag) ? 'default' : 'outline'}
                  className={cn(
                    "cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900",
                    selectedDietTags.includes(tag) && "bg-amber-600 hover:bg-amber-700"
                  )}
                  onClick={() => toggleDietTag(tag)}
                >
                  {tagInfo.label}
                </Badge>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Diet preferences section */}
      <Collapsible open={openSections.includes('diet')} onOpenChange={() => toggleSection('diet')}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-10 px-3">
            <span className="flex items-center gap-2">
              🥗 Voedingsvoorkeuren
              {selectedDietTags.filter(t => dietPreferenceTags.includes(t)).length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {selectedDietTags.filter(t => dietPreferenceTags.includes(t)).length}
                </Badge>
              )}
            </span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", openSections.includes('diet') && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 pb-3 px-3">
          <div className="flex flex-wrap gap-2">
            {dietPreferenceTags.map((tag) => {
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

      {/* Health & life stage section */}
      <Collapsible open={openSections.includes('health')} onOpenChange={() => toggleSection('health')}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-10 px-3">
            <span className="flex items-center gap-2">
              💪 Gezondheid & levensfase
              {selectedDietTags.filter(t => [...healthTags, ...lifeStageTags].includes(t)).length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {selectedDietTags.filter(t => [...healthTags, ...lifeStageTags].includes(t)).length}
                </Badge>
              )}
            </span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", openSections.includes('health') && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 pb-3 px-3">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Voedingswaarden</p>
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
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Levensfase</p>
              <div className="flex flex-wrap gap-2">
                {lifeStageTags.map((tag) => {
                  const tagInfo = dietTags.find(t => t.value === tag);
                  if (!tagInfo) return null;
                  return (
                    <Badge
                      key={tag}
                      variant={selectedDietTags.includes(tag) ? 'default' : 'outline'}
                      className={cn(
                        "cursor-pointer hover:bg-pink-100 dark:hover:bg-pink-900",
                        selectedDietTags.includes(tag) && "bg-pink-600 hover:bg-pink-700"
                      )}
                      onClick={() => toggleDietTag(tag)}
                    >
                      {tagInfo.label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
