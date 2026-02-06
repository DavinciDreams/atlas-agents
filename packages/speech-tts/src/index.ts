export { TTSService } from './TTSService';
export type { TTSConfig, TTSResult } from './TTSService';
export {
  textToVisemes,
  getCurrentViseme,
  interpolateVisemes,
  VRM_VISEME_MAPPING,
  getVRMBlendShapes,
} from './visemePreprocessor';
export { TTSCache } from './TTSCache';
export type { TTSEvents } from '@atlas.agents/types';
