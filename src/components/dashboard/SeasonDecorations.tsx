import { Snowflake, Leaf, Sun, Wind } from 'lucide-react';

interface SeasonDecorationsProps {
  season: string;
}

// Subtle floating decorative elements per season
export function SeasonDecorations({ season }: SeasonDecorationsProps) {
  if (season === 'onbekend') return null;

  const decorations = {
    winter: {
      icon: Snowflake,
      count: 4,
      colorClass: 'text-blue-300/60 dark:text-blue-400/40',
    },
    lente: {
      icon: Leaf,
      count: 3,
      colorClass: 'text-green-300/60 dark:text-green-400/40',
    },
    zomer: {
      icon: Sun,
      count: 2,
      colorClass: 'text-amber-300/60 dark:text-amber-400/40',
    },
    herfst: {
      icon: Wind,
      count: 4,
      colorClass: 'text-orange-300/60 dark:text-orange-400/40',
    },
  };

  const config = decorations[season as keyof typeof decorations];
  if (!config) return null;

  const Icon = config.icon;

  // Position and animation variants for floating elements
  const positions = [
    { top: '-2px', right: '-8px', delay: '0s', size: 'h-3 w-3' },
    { top: '8px', right: '-20px', delay: '0.5s', size: 'h-2.5 w-2.5' },
    { top: '-8px', right: '20px', delay: '1s', size: 'h-2 w-2' },
    { top: '4px', right: '40px', delay: '1.5s', size: 'h-2 w-2' },
  ];

  return (
    <div className="absolute inset-0 overflow-visible pointer-events-none">
      {positions.slice(0, config.count).map((pos, i) => (
        <div
          key={i}
          className="absolute animate-float"
          style={{
            top: pos.top,
            right: pos.right,
            animationDelay: pos.delay,
            animationDuration: `${3 + i * 0.5}s`,
          }}
        >
          <Icon className={`${pos.size} ${config.colorClass}`} />
        </div>
      ))}
    </div>
  );
}
