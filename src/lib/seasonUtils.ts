// Weather season detection based on date and hemisphere

export type Hemisphere = 'north' | 'south';

// Get hemisphere based on latitude
export function getHemisphereFromLatitude(latitude: number | null): Hemisphere {
  if (latitude === null) return 'north'; // Default to northern hemisphere
  return latitude >= 0 ? 'north' : 'south';
}

// Get current weather season based on month and hemisphere
export function getWeatherSeason(hemisphere: Hemisphere = 'north'): string {
  const month = new Date().getMonth(); // 0-11
  
  if (hemisphere === 'north') {
    // Northern hemisphere seasons (Netherlands, etc.)
    if (month >= 2 && month <= 4) return 'lente';     // March - May
    if (month >= 5 && month <= 7) return 'zomer';     // June - August
    if (month >= 8 && month <= 10) return 'herfst';   // September - November
    return 'winter';                                    // December - February
  } else {
    // Southern hemisphere - opposite seasons
    if (month >= 2 && month <= 4) return 'herfst';
    if (month >= 5 && month <= 7) return 'winter';
    if (month >= 8 && month <= 10) return 'lente';
    return 'zomer';
  }
}

// Seasonal ingredient suggestions per season
export const seasonalIngredients: Record<string, string[]> = {
  lente: ['asperges', 'rabarber', 'spinazie', 'jonge wortelen', 'radijs', 'paksoi', 'aardbeien'],
  zomer: ['tomaten', 'courgette', 'paprika', 'bessen', 'perziken', 'komkommer', 'aubergine'],
  herfst: ['pompoen', 'boerenkool', 'spruitjes', 'paddenstoelen', 'appels', 'peren', 'knolselderij'],
  winter: ['spruitjes', 'kool', 'pastinaak', 'aardpeer', 'prei', 'citrus', 'wortel'],
};

// Get meal type based on current hour
export function getMealTypeFromTime(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'ontbijt';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 18) return 'tussendoortje';
  if (hour >= 18 && hour < 22) return 'diner';
  return 'snack';
}

// Get user's location (returns null if not available or denied)
export async function getUserLocation(): Promise<{ latitude: number; longitude: number } | null> {
  if (!navigator.geolocation) {
    return null;
  }
  
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        // User denied or error - return null
        resolve(null);
      },
      { timeout: 5000, maximumAge: 3600000 } // Cache for 1 hour
    );
  });
}

// Get hemisphere with geolocation fallback
export async function detectHemisphere(): Promise<Hemisphere> {
  try {
    const location = await getUserLocation();
    if (location) {
      return getHemisphereFromLatitude(location.latitude);
    }
  } catch {
    // Ignore geolocation errors
  }
  
  // Default to northern hemisphere (Netherlands focus)
  return 'north';
}
