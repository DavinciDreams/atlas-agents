import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import { createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import type { VRMAnimation } from '@pixiv/three-vrm-animation';
import type { AnimationPlaybackOptions } from '@atlas.agents/types';

export class AnimationManager {
  private mixer: THREE.AnimationMixer | null = null;
  private vrm: VRM | null = null;
  private actions: Map<string, THREE.AnimationAction> = new Map();
  private clips: Map<string, THREE.AnimationClip> = new Map();
  private vrmAnimations: Map<string, VRMAnimation> = new Map();
  private currentAction: THREE.AnimationAction | null = null;
  private queueTimeouts: ReturnType<typeof setTimeout>[] = [];
  private config: { animationFadeIn: number; animationFadeOut: number; defaultAnimation: string };

  // Animation duration registry (ms)
  private durations: Map<string, number> = new Map([
    ['idle', 3000], ['modelPose', 3000], ['greeting', 3000], ['peace', 2500],
    ['shoot', 2500], ['spin', 4000], ['squat', 3000], ['walking', 4000],
    ['hipHopDancing', 5000], ['punch', 2000], ['bowing', 3000], ['waving', 3000],
    ['headNod', 1500], ['shakingHeadNo', 1500], ['thumbsUp', 2000],
    ['thinking', 3000], ['salute', 2500], ['singing', 5000],
  ]);

  constructor(config: { animationFadeIn?: number; animationFadeOut?: number; defaultAnimation?: string }) {
    this.config = {
      animationFadeIn: config.animationFadeIn ?? 0.3,
      animationFadeOut: config.animationFadeOut ?? 0.2,
      defaultAnimation: config.defaultAnimation ?? 'modelPose',
    };
  }

  initialize(mixer: THREE.AnimationMixer, vrm: VRM): void {
    this.mixer = mixer;
    this.vrm = vrm;
  }

  registerClip(name: string, clip: THREE.AnimationClip): void {
    if (!this.mixer) return;
    this.clips.set(name, clip);
    const action = this.mixer.clipAction(clip);
    this.actions.set(name, action);
  }

  async loadAnimation(name: string, url: string, vrm: VRM, loader: any): Promise<void> {
    if (this.actions.has(name)) return;

    const gltf = await new Promise<any>((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });

    const vrmAnimation = gltf.userData.vrmAnimations?.[0] as VRMAnimation | undefined;
    if (!vrmAnimation) throw new Error(`No VRM animation found in ${url}`);

    this.vrmAnimations.set(name, vrmAnimation);
    const clip = createVRMAnimationClip(vrmAnimation, vrm);
    this.registerClip(name, clip);
  }

  play(name: string, options?: AnimationPlaybackOptions): void {
    if (!this.mixer) return;

    const action = this.actions.get(name);
    if (!action) {
      console.warn(`Animation "${name}" not found`);
      return;
    }

    const fadeIn = options?.fadeIn ?? this.config.animationFadeIn;

    if (this.currentAction && this.currentAction !== action) {
      this.currentAction.crossFadeTo(action, fadeIn, false);
    } else {
      action.fadeIn(fadeIn);
    }

    action.setLoop(options?.loop !== false ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    if (options?.speed !== undefined) action.timeScale = options.speed;
    action.play();
    this.currentAction = action;
  }

  stopCurrent(): void {
    if (this.currentAction) {
      this.currentAction.fadeOut(this.config.animationFadeOut);
      this.currentAction = null;
    }
  }

  queueAnimations(
    triggers: Array<{ name: string; delay?: number }>,
    onPlay: (name: string) => void,
    onComplete: () => void
  ): void {
    this.clearQueue();
    if (triggers.length === 0) { onComplete(); return; }

    let index = 0;
    const playNext = () => {
      if (index >= triggers.length) { onComplete(); return; }
      const trigger = triggers[index];
      this.play(trigger.name);
      onPlay(trigger.name);
      const duration = this.getDuration(trigger.name);
      const timeout = setTimeout(() => { index++; playNext(); }, duration);
      this.queueTimeouts.push(timeout);
    };
    playNext();
  }

  getDuration(name: string): number {
    return this.durations.get(name) ?? 3000;
  }

  setDuration(name: string, durationMs: number): void {
    this.durations.set(name, durationMs);
  }

  hasAnimation(name: string): boolean {
    return this.actions.has(name);
  }

  getLoadedAnimations(): string[] {
    return Array.from(this.actions.keys());
  }

  clearQueue(): void {
    this.queueTimeouts.forEach(t => clearTimeout(t));
    this.queueTimeouts = [];
  }

  dispose(): void {
    this.clearQueue();
    this.actions.clear();
    this.clips.clear();
    this.vrmAnimations.clear();
    this.currentAction = null;
    this.mixer = null;
    this.vrm = null;
  }
}
