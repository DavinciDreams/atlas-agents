import type { VRM } from '@pixiv/three-vrm';
import type { VisemeName } from '@atlas.agents/types';

const VISEME_TO_BLENDSHAPE: Record<VisemeName, string> = {
  'sil': 'neutral',
  'PP': 'aa', 'FF': 'ih', 'TH': 'ih', 'DD': 'aa',
  'kk': 'aa', 'CH': 'ou', 'SS': 'ih', 'nn': 'aa',
  'RR': 'ou', 'aa': 'aa', 'E': 'ee', 'ih': 'ih',
  'oh': 'oh', 'ou': 'ou',
};

export class VisemeController {
  private vrm: VRM | null = null;
  private currentViseme: VisemeName = 'sil';

  initialize(vrm: VRM): void {
    this.vrm = vrm;
  }

  apply(viseme: VisemeName, weight: number): void {
    if (!this.vrm) return;
    const expressionManager = (this.vrm as any).expressionManager;
    if (!expressionManager) return;

    // Clear previous viseme
    if (this.currentViseme !== 'sil') {
      const prevShape = VISEME_TO_BLENDSHAPE[this.currentViseme];
      try { expressionManager.setValue(prevShape, 0); } catch {}
    }

    // Apply new viseme
    if (viseme !== 'sil') {
      const shape = VISEME_TO_BLENDSHAPE[viseme];
      try { expressionManager.setValue(shape, weight); } catch {}
    }

    this.currentViseme = viseme;
  }

  clear(): void {
    this.apply('sil', 0);
  }

  getCurrentViseme(): VisemeName {
    return this.currentViseme;
  }
}
