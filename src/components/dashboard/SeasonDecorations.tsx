import { Snowflake, Leaf, Sun, Wind } from 'lucide-react';

interface SeasonDecorationsProps {
  season: string;
}

// Large, visible floating decorative elements per season
export function SeasonDecorations({ season }: SeasonDecorationsProps) {
  if (season === 'onbekend') return null;

  const decorations = {
    winter: {
      icon: Snowflake,
      count: 6,
      colorClass: 'text-blue-500 dark:text-blue-400',
    },
    lente: {
      icon: Leaf,
      count: 5,
      colorClass: 'text-green-600 dark:text-green-400',
    },
    zomer: {
      icon: Sun,
      count: 4,
      colorClass: 'text-amber-500 dark:text-amber-400',
    },
    herfst: {
      icon: Wind,
      count: 6,
      colorClass: 'text-orange-500 dark:text-orange-400',
    },
  };

  const config = decorations[season as keyof typeof decorations];
  if (!config) return null;

  const Icon = config.icon;

  // Large, spread positions for visibility
  const positions = [
    { top: '-20px', right: '10px', delay: '0s', size: 'h-8 w-8' },
    { top: '0px', right: '-15px', delay: '0.5s', size: 'h-6 w-6' },
    { top: '-30px', right: '50px', delay: '1s', size: 'h-7 w-7' },
    { top: '10px', right: '80px', delay: '1.5s', size: 'h-5 w-5' },
    { top: '-15px', right: '110px', delay: '2s', size: 'h-6 w-6' },
    { top: '5px', right: '140px', delay: '2.5s', size: 'h-4 w-4' },
  ];

  return (
    <div className="absolute inset-0 overflow-visible pointer-events-none" style={{ width: '200px', height: '60px' }}>
      {positions.slice(0, config.count).map((pos, i) => (
        <div
          key={i}
          className="absolute animate-float"
          style={{
            top: pos.top,
            right: pos.right,
            animationDelay: pos.delay,
            animationDuration: `${3 + i * 0.3}s`,
          }}
        >
          <Icon className={`${pos.size} ${config.colorClass} drop-shadow-md`} />
        </div>
      ))}
    </div>
  );
}
