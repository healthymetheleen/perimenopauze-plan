// Import all exercise images for use in the app
import menstrualChildsPose from '@/assets/exercises/menstrual-childs-pose.webp';
import menstrualLegsUpWall from '@/assets/exercises/menstrual-legs-up-wall.webp';
import menstrualRecliningButterfly from '@/assets/exercises/menstrual-reclining-butterfly.webp';
import follicularCatCow from '@/assets/exercises/follicular-cat-cow.webp';
import follicularWarrior2 from '@/assets/exercises/follicular-warrior2.webp';
import follicularSunSalutation from '@/assets/exercises/follicular-sun-salutation.webp';
import ovulatoryDancer from '@/assets/exercises/ovulatory-dancer.webp';
import ovulatoryCrow from '@/assets/exercises/ovulatory-crow.webp';
import ovulatoryHalfMoon from '@/assets/exercises/ovulatory-half-moon.webp';
import lutealForwardFold from '@/assets/exercises/luteal-forward-fold.webp';
import lutealPigeon from '@/assets/exercises/luteal-pigeon.webp';
import lutealSpinalTwist from '@/assets/exercises/luteal-spinal-twist.webp';

// Map exercise names to their local images
export const exerciseImageMap: Record<string, string> = {
  "Child's Pose": menstrualChildsPose,
  "Legs Up The Wall": menstrualLegsUpWall,
  "Reclining Butterfly": menstrualRecliningButterfly,
  "Cat-Cow Stretch": follicularCatCow,
  "Warrior II": follicularWarrior2,
  "Sun Salutation": follicularSunSalutation,
  "Dancer Pose": ovulatoryDancer,
  "Crow Pose": ovulatoryCrow,
  "Half Moon Pose": ovulatoryHalfMoon,
  "Seated Forward Fold": lutealForwardFold,
  "Pigeon Pose": lutealPigeon,
  "Supine Spinal Twist": lutealSpinalTwist,
};

// Helper to get exercise image, with fallback
export function getExerciseImage(exerciseName: string, dbImageUrl?: string | null): string {
  // Prefer database image if available
  if (dbImageUrl) return dbImageUrl;
  // Fall back to local image
  return exerciseImageMap[exerciseName] || '';
}
