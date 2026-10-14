// Union of every nontransparent pixel in all 300 lowres frames, plus padding.
// Keep the virtual 960x540 stage so cropping never changes placement or proportions.
export const AVATAR_CROP = { x: 210, y: 28, width: 540, height: 510, stageWidth: 960, stageHeight: 540 } as const;

export function avatarProfile({ width, coarsePointer, memory = 8, saveData = false }: {
  width: number; coarsePointer: boolean; memory?: number; saveData?: boolean;
}) {
  const constrained = coarsePointer || width < 1024 || memory <= 4 || saveData;
  return {
    constrained,
    decodeWidth: constrained ? 640 : 960,
    budgetBytes: (constrained ? 48 : 112) * 1024 * 1024,
    concurrency: constrained ? 3 : 4,
    decodeConcurrency: constrained ? 1 : 2,
    radius: constrained ? 8 : 12,
    coverageStep: 4,
    prefetchAll: !saveData,
    crop: AVATAR_CROP,
  };
}
