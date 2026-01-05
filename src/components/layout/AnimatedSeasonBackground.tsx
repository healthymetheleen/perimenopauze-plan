import { useMemo } from 'react';

type Season = 'winter' | 'lente' | 'zomer' | 'herfst' | 'onbekend';

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
      blobA: `radial-gradient(circle at 30% 20%, ${hexToRgba(palette.blobA, 0.55)} 0%, transparent 55%)`,
      blobB: `radial-gradient(circle at 70% 80%, ${hexToRgba(palette.blobB, 0.45)} 0%, transparent 50%)`,
      blobC: `radial-gradient(circle at 50% 50%, ${hexToRgba(palette.blobC, 0.35)} 0%, transparent 45%)`,
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
        className="absolute -top-1/4 -left-1/4 w-3/4 h-3/4 rounded-full blur-3xl opacity-80 animate-[seasonFloat1_18s_ease-in-out_infinite]"
        style={{ background: gradients.blobA }}
      />

      {/* Blob B - bottom-right, medium float */}
      <div
        className="absolute -bottom-1/4 -right-1/4 w-2/3 h-2/3 rounded-full blur-3xl opacity-70 animate-[seasonFloat2_22s_ease-in-out_infinite]"
        style={{ background: gradients.blobB }}
      />

      {/* Blob C - center, subtle pulse */}
      <div
        className="absolute top-1/4 left-1/4 w-1/2 h-1/2 rounded-full blur-3xl opacity-50 animate-[seasonFloat3_28s_ease-in-out_infinite]"
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
