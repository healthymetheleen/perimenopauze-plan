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
      count: 5,
      colorClass: 'text-blue-400 dark:text-blue-300',
    },
    lente: {
      icon: Leaf,
      count: 4,
      colorClass: 'text-green-500 dark:text-green-400',
    },
    zomer: {
      icon: Sun,
      count: 3,
      colorClass: 'text-amber-400 dark:text-amber-300',
    },
    herfst: {
      icon: Wind,
      count: 5,
      colorClass: 'text-orange-400 dark:text-orange-300',
    },
  };

  const config = decorations[season as keyof typeof decorations];
  if (!config) return null;

  const Icon = config.icon;

  // Position and animation variants for floating elements - spread around badge
  const positions = [
    { top: '-12px', right: '-12px', delay: '0s', size: 'h-4 w-4', opacity: '0.8' },
    { top: '4px', right: '-24px', delay: '0.7s', size: 'h-3 w-3', opacity: '0.6' },
    { top: '-16px', right: '16px', delay: '1.4s', size: 'h-3 w-3', opacity: '0.7' },
    { top: '8px', right: '32px', delay: '2.1s', size: 'h-2.5 w-2.5', opacity: '0.5' },
    { top: '-8px', right: '48px', delay: '2.8s', size: 'h-2 w-2', opacity: '0.4' },
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
            animationDuration: `${3 + i * 0.4}s`,
            opacity: pos.opacity,
          }}
        >
          <Icon className={`${pos.size} ${config.colorClass} drop-shadow-sm`} />
        </div>
      ))}
    </div>
  );
}
