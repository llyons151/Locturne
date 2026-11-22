/** The web preview has no camera restrictions and no extensions: every exercise can be tried. */
export const isCameraRestricted = (): boolean => false;

export const buildKnowsExercise = (_exercise: string): boolean => true;
