export function haptic(pattern: number | number[] = 30) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

export const hapticSuccess = () => haptic(50);
export const hapticTap = () => haptic(30);
export const hapticError = () => haptic([50, 30, 50]);
