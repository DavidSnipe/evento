/** Spring-like easing — Linear / Emil Kowalski style */
export const MOTION_SPRING = "cubic-bezier(0.22, 1, 0.36, 1)" as const;
export const MOTION_SPRING_SNAPPY = "cubic-bezier(0.32, 0.72, 0, 1)" as const;

export const MOTION_DURATION_FAST = 180;
export const MOTION_DURATION = 250;
export const MOTION_DURATION_SLOW = 280;
export const MOTION_STAGGER_STEP = 45;

export function motionStaggerDelay(index: number): number {
  return index * MOTION_STAGGER_STEP;
}
