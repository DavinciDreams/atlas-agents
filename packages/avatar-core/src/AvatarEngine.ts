import * as THREE from 'three';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import type { VRM } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import type { VRMAnimation } from '@pixiv/three-vrm-animation';
import { createEventBus, type EventBus, type AvatarCoreEvents, type VisemeName, type AnimationPlaybackOptions } from '@atlas.agents/types';
import { AnimationManager } from './AnimationManager';
import { VisemeController } from './VisemeController';

export interface AvatarCoreConfig {
  animationBasePath?: string;
  defaultAnimation?: string;
  animationFadeIn?: number;
  animationFadeOut?: number;
}

export class AvatarEngine {
  private config: Required<AvatarCoreConfig>;
  private eventBus: EventBus<AvatarCoreEvents>;
  private vrm: VRM | null = null;
  private scene: THREE.Group | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private animationManager: AnimationManager;
  private visemeController: VisemeController;
  private loader: THREE.GLTFLoader | null = null;

  constructor(config: AvatarCoreConfig = {}) {
    this.config = {
      animationBasePath: config.animationBasePath ?? '/animations/',
      defaultAnimation: config.defaultAnimation ?? 'modelPose',
      animationFadeIn: config.animationFadeIn ?? 0.3,
      animationFadeOut: config.animationFadeOut ?? 0.2,
    };
    this.eventBus = createEventBus<AvatarCoreEvents>();
    this.animationManager = new AnimationManager(this.config);
    this.visemeController = new VisemeController();
  }

  async loadModel(url: string): Promise<void> {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      this.loader = new GLTFLoader();
      this.loader.register((parser: any) => new VRMLoaderPlugin(parser));
      this.loader.register((parser: any) => new VRMAnimationLoaderPlugin(parser));

      const gltf = await new Promise<any>((resolve, reject) => {
        this.loader!.load(url, resolve, undefined, reject);
      });

      this.vrm = gltf.userData.vrm as VRM;
      this.scene = gltf.scene;

      if (!this.vrm) throw new Error('No VRM data found in model');

      // Apply VRM optimizations
      VRMUtils.removeUnnecessaryVertices(gltf.scene);

      // Detect VRM version and apply rotation
      const meta = (this.vrm as any).meta;
      const isVRM0 = !meta?.metaVersion || meta.metaVersion === '0.0' || meta.metaVersion === '0';
      if (isVRM0) {
        try { VRMUtils.rotateVRM0(this.vrm as any); } catch {}
      }

      // Auto-scale to target height
      const box = new THREE.Box3().setFromObject(this.scene);
      const modelHeight = box.max.y - box.min.y;
      const TARGET_HEIGHT = 1.6;
      const autoScale = TARGET_HEIGHT / modelHeight;
      this.scene.scale.setScalar(autoScale);

      // Position feet on ground
      const scaledBox = new THREE.Box3().setFromObject(this.scene);
      this.scene.position.y = -scaledBox.min.y;

      // Setup mixer
      this.mixer = new THREE.AnimationMixer(this.scene);
      this.animationManager.initialize(this.mixer, this.vrm);
      this.visemeController.initialize(this.vrm);

      // Load embedded animations
      gltf.animations.forEach((clip: THREE.AnimationClip) => {
        this.animationManager.registerClip(clip.name, clip);
      });

      this.eventBus.emit('avatar:model-loaded', { modelUrl: url });
    } catch (error) {
      this.eventBus.emit('avatar:model-error', { error: error as Error });
      throw error;
    }
  }

  getVRM(): VRM | null { return this.vrm; }
  getScene(): THREE.Group | null { return this.scene; }
  getMixer(): THREE.AnimationMixer | null { return this.mixer; }

  async loadAnimation(name: string, url?: string): Promise<void> {
    const animUrl = url ?? `${this.config.animationBasePath}${name}.vrma`;
    await this.animationManager.loadAnimation(name, animUrl, this.vrm!, this.loader!);
  }

  playAnimation(name: string, options?: AnimationPlaybackOptions): void {
    this.animationManager.play(name, options);
    this.eventBus.emit('avatar:animation-started', { name });
  }

  stopAnimation(): void {
    this.animationManager.stopCurrent();
  }

  queueAnimations(triggers: Array<{ name: string; delay?: number }>): void {
    this.animationManager.queueAnimations(triggers,
      (name) => this.eventBus.emit('avatar:animation-started', { name }),
      () => this.eventBus.emit('avatar:animation-queue-complete', {})
    );
  }

  applyViseme(viseme: VisemeName, weight: number): void {
    this.visemeController.apply(viseme, weight);
    this.eventBus.emit('avatar:viseme-applied', { viseme, weight });
  }

  clearViseme(): void {
    this.visemeController.clear();
  }

  update(deltaTime: number): void {
    const clampedDelta = Math.min(deltaTime, 0.1);
    if (this.mixer) this.mixer.update(clampedDelta);
    if (this.vrm) {
      try { (this.vrm as any).update(clampedDelta); } catch {}
    }
  }

  on<K extends keyof AvatarCoreEvents>(event: K, handler: (data: AvatarCoreEvents[K]) => void): () => void {
    return this.eventBus.on(event, handler);
  }

  dispose(): void {
    this.animationManager.dispose();
    this.visemeController.clear();
    if (this.mixer) { this.mixer.stopAllAction(); this.mixer = null; }
    this.vrm = null;
    this.scene = null;
    this.eventBus.emit('avatar:disposed', {});
    this.eventBus.removeAllListeners();
  }
}
