import { cn } from '@/lib/utils';

interface ScoreBadgeProps {
  score: number | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function ScoreBadge({ 
  score, 
  size = 'md', 
  showLabel = false,
  className 
}: ScoreBadgeProps) {
  // Handle null/undefined score
  if (score === null || score === undefined) {
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'bg-score-high text-accent-foreground';
    if (score >= 4) return 'bg-score-medium text-warning-foreground';
    return 'bg-score-low text-destructive-foreground';
  };

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-lg',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn(
        'rounded-full flex items-center justify-center font-semibold',
        getScoreColor(score),
        sizeClasses[size]
      )}>
        {score.toFixed(1)}
      </div>
      {showLabel && (
        <span className="text-sm text-muted-foreground">
          {score >= 7 ? 'Stabiel' : score >= 4 ? 'Gemiddeld' : 'Aandacht'}
        </span>
      )}
    </div>
  );
}