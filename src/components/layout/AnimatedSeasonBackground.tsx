import { useMemo } from 'react';

type Season = 'winter' | 'lente' | 'zomer' | 'herfst' | 'onbekend' | 'primary';

interface SeasonPalette {
  base: string;
  blobA: string;
  blobB: string;
  blobC: string;
}

// Light mode palettes
const SEASON_PALETTES: Record<Season, SeasonPalette> = {
  winter: {
    base: '#FBF4F1',
    blobA: '#A7C8FF',
    blobB: '#6EA8FF',
    blobC: '#FFFFFF',
  },
  lente: {
    base: '#FBF4F1',
    blobA: '#BFE7D2',
    blobB: '#7FC9A6',
    blobC: '#FFFFFF',
  },
  zomer: {
    base: '#FBF4F1',
    blobA: '#FFE9A8',
    blobB: '#FFD47A',
    blobC: '#FFFFFF',
  },
  herfst: {
    base: '#FBF4F1',
    blobA: '#FFD2B5',
    blobB: '#FFB089',
    blobC: '#FFFFFF',
  },
  onbekend: {
    base: '#FBF4F1',
    blobA: '#E8E4E1',
    blobB: '#D4CFC9',
    blobC: '#FFFFFF',
  },
  primary: {
    base: '#FBF4F1',
    blobA: '#D4A5C9', // dusty rose/mauve
    blobB: '#C98DB8', // deeper mauve
    blobC: '#F0E6ED', // soft pink-white
  },
};

// Dark mode palettes (more muted, deeper tones)
const SEASON_PALETTES_DARK: Record<Season, SeasonPalette> = {
  winter: {
    base: '#1a1a2e',
    blobA: '#2d4a7c',
    blobB: '#1e3a5f',
    blobC: '#3d5a80',
  },
  lente: {
    base: '#1a1a2e',
    blobA: '#2d5a4a',
    blobB: '#1e4a3f',
    blobC: '#3d6a5a',
  },
  zomer: {
    base: '#1a1a2e',
    blobA: '#5a4a2d',
    blobB: '#4a3a1e',
    blobC: '#6a5a3d',
  },
  herfst: {
    base: '#1a1a2e',
    blobA: '#5a3a2d',
    blobB: '#4a2a1e',
    blobC: '#6a4a3d',
  },
  onbekend: {
    base: '#1a1a2e',
    blobA: '#2d2d3a',
    blobB: '#1e1e2a',
    blobC: '#3d3d4a',
  },
  primary: {
    base: '#1a1a2e',
    blobA: '#4a2d4a',
    blobB: '#3a1e3a',
    blobC: '#5a3d5a',
  },
};

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const bigint = parseInt(
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h,
    16
  );
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

interface AnimatedSeasonBackgroundProps {
  season?: Season;
  isDark?: boolean;
}

export function AnimatedSeasonBackground({ season = 'onbekend', isDark = false }: AnimatedSeasonBackgroundProps) {
  const palettes = isDark ? SEASON_PALETTES_DARK : SEASON_PALETTES;
  const palette = palettes[season] ?? palettes.onbekend;

  const gradients = useMemo(() => {
    return {
      blobA: `radial-gradient(circle at 30% 20%, ${hexToRgba(palette.blobA, 0.85)} 0%, ${hexToRgba(palette.blobA, 0.3)} 40%, transparent 65%)`,
      blobB: `radial-gradient(circle at 70% 80%, ${hexToRgba(palette.blobB, 0.75)} 0%, ${hexToRgba(palette.blobB, 0.25)} 35%, transparent 60%)`,
      blobC: `radial-gradient(circle at 50% 50%, ${hexToRgba(palette.blobC, 0.6)} 0%, ${hexToRgba(palette.blobC, 0.2)} 30%, transparent 55%)`,
    };
  }, [palette]);

  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      style={{ background: palette.base }}
      aria-hidden="true"
    >
      {/* Blob A - top-left, slow float */}
      <div
        className="absolute -top-[10%] -left-[15%] w-[70%] h-[70%] rounded-full blur-[80px] animate-[seasonFloat1_18s_ease-in-out_infinite]"
        style={{ background: gradients.blobA }}
      />

      {/* Blob B - bottom-right, medium float */}
      <div
        className="absolute -bottom-[10%] -right-[15%] w-[65%] h-[65%] rounded-full blur-[70px] animate-[seasonFloat2_22s_ease-in-out_infinite]"
        style={{ background: gradients.blobB }}
      />

      {/* Blob C - center, subtle pulse */}
      <div
        className="absolute top-[20%] left-[25%] w-[50%] h-[50%] rounded-full blur-[60px] animate-[seasonFloat3_28s_ease-in-out_infinite]"
        style={{ background: gradients.blobC }}
      />

      {/* Noise texture overlay for depth */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
