/**
 * Where Home's week strip sits on screen, in window points, kept up to date by Home (SwiftUI's
 * `onGeometryChange` on iPhone, `measureInWindow` elsewhere). The morning payoff reads it on
 * Done and flies its own week up into that spot, so the two lie exactly on top of each other
 * when the payoff dissolves (user, 2026-10-28: "transition up into its position on the home
 * screen… only the stuff that needs to fade out should fade out").
 */
export type WeekSpot = { x: number; y: number; width: number; height: number };

let spot: WeekSpot | null = null;

export function setHomeWeekSpot(next: WeekSpot) {
  spot = next;
}

/** Null until Home has been laid out (never, if the payoff opened without Home under it). */
export function homeWeekSpot(): WeekSpot | null {
  return spot;
}
