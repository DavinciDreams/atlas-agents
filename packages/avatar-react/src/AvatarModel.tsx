import React, { useRef, useEffect, Suspense, useImperativeHandle, forwardRef, useState, useCallback } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import type { VRM } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import type { VRMAnimation } from '@pixiv/three-vrm-animation';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface AvatarModelRef {
  playAnimation: (name: string) => void;
  getVRM: () => VRM | null;
  getMixer: () => THREE.AnimationMixer | null;
}

export interface AvatarModelProps {
  modelUrl: string;
  currentAnimation?: string | null;
  animationSpeed?: number;
  animationBasePath?: string;
  position?: [number, number, number];
  scale?: number;
  rotation?: [number, number, number];
  rotationY?: number;
  positionY?: number;
  modelScale?: number;
  onModelLoaded?: (vrm: VRM) => void;
  onAnimationStart?: (name: string) => void;
  onAnimationEnd?: (name: string) => void;
  onError?: (error: Error) => void;
  className?: string;
  style?: React.CSSProperties;
  cameraPosition?: [number, number, number];
  cameraFov?: number;
  orbitControls?: boolean;
  shadows?: boolean;
}

// Custom GLTFLoader with VRM plugins
class VRMOptimizedLoader extends GLTFLoader {
  constructor() {
    super();
    this.register((parser: any) => new VRMLoaderPlugin(parser));
    this.register((parser: any) => new VRMAnimationLoaderPlugin(parser));
  }
}

const DEFAULT_POSITION: [number, number, number] = [0, 0, 0];
const DEFAULT_ROTATION: [number, number, number] = [0, 0, 0];

const ANIMATION_FADE_IN = 0.3;
const ANIMATION_FADE_OUT = 0.2;

interface CharacterProps {
  modelUrl: string;
  currentAnimation?: string | null;
  animationSpeed?: number;
  animationBasePath?: string;
  position?: [number, number, number];
  scale?: number;
  rotation?: [number, number, number];
  rotationY?: number;
  positionY?: number;
  modelScale?: number;
  onModelLoaded?: (vrm: VRM) => void;
  onAnimationStart?: (name: string) => void;
  onAnimationEnd?: (name: string) => void;
  characterRef?: React.Ref<AvatarModelRef>;
}

const Character: React.FC<CharacterProps> = ({
  modelUrl,
  currentAnimation,
  animationSpeed = 1.0,
  animationBasePath = '/animations/',
  position = DEFAULT_POSITION,
  scale = 1,
  rotation = DEFAULT_ROTATION,
  rotationY = 0,
  positionY = 0,
  modelScale = 1,
  onModelLoaded,
  onAnimationStart,
  onAnimationEnd,
  characterRef,
}) => {
  const gltf = useLoader(VRMOptimizedLoader as any, modelUrl);
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const vrmRef = useRef<VRM | null>(null);
  const actionsRef = useRef<Map<string, THREE.AnimationAction>>(new Map());
  const vrmAnimationsRef = useRef<Map<string, VRMAnimation>>(new Map());
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const isInitializedRef = useRef(false);
  const loaderRef = useRef<VRMOptimizedLoader>(new VRMOptimizedLoader());

  const vrm = gltf.userData.vrm as VRM;
  const scene = gltf.scene;

  // Expose imperative handle
  useImperativeHandle(characterRef, () => ({
    playAnimation: (name: string) => playAnimationDirectly(name),
    getVRM: () => vrmRef.current,
    getMixer: () => mixer.current,
  }));

  const loadVRMAAnimation = useCallback(async (animationName: string) => {
    if (!mixer.current || !vrmRef.current) return;
    if (actionsRef.current.has(animationName)) return;

    try {
      const url = `${animationBasePath}${animationName}.vrma`;
      const animGltf = await new Promise<any>((resolve, reject) => {
        loaderRef.current.load(url, resolve, undefined, reject);
      });

      const vrmAnimation = animGltf.userData.vrmAnimations?.[0] as VRMAnimation | undefined;
      if (!vrmAnimation) return;

      vrmAnimationsRef.current.set(animationName, vrmAnimation);
      const clip = createVRMAnimationClip(vrmAnimation, vrmRef.current!);
      const action = mixer.current!.clipAction(clip);
      actionsRef.current.set(animationName, action);
    } catch (error) {
      console.warn(`Failed to load animation "${animationName}":`, error);
    }
  }, [animationBasePath]);

  const playAnimationDirectly = useCallback(async (animationName: string) => {
    if (!mixer.current) return;

    // Load on demand if not yet loaded
    if (!actionsRef.current.has(animationName)) {
      await loadVRMAAnimation(animationName);
    }

    const action = actionsRef.current.get(animationName);
    if (!action) return;

    action.timeScale = animationSpeed;
    action.setLoop(THREE.LoopRepeat, Infinity);

    if (currentActionRef.current && currentActionRef.current !== action) {
      currentActionRef.current.crossFadeTo(action, ANIMATION_FADE_IN, false);
    } else {
      action.fadeIn(ANIMATION_FADE_IN);
    }
    action.play();
    currentActionRef.current = action;
    onAnimationStart?.(animationName);
  }, [animationSpeed, loadVRMAAnimation, onAnimationStart]);

  // Initialize model
  useEffect(() => {
    if (!scene || !vrm || isInitializedRef.current) return;

    vrmRef.current = vrm;

    // Detect VRM version
    const meta = (vrm as any).meta;
    const isVRM0 = !meta?.metaVersion || meta.metaVersion === '0.0' || meta.metaVersion === '0';
    if (isVRM0) {
      try { VRMUtils.rotateVRM0(vrm as any); } catch {}
    }

    VRMUtils.removeUnnecessaryVertices(gltf.scene);

    // Auto-scale
    const box = new THREE.Box3().setFromObject(scene);
    const modelHeight = box.max.y - box.min.y;
    const TARGET_HEIGHT = 1.6;
    const autoScale = TARGET_HEIGHT / modelHeight;
    const finalScale = autoScale * modelScale * scale;
    scene.scale.setScalar(finalScale);

    const scaledBox = new THREE.Box3().setFromObject(scene);
    const groundOffset = -scaledBox.min.y;
    scene.position.set(position[0], position[1] + groundOffset + positionY, position[2]);

    const yRotation = rotation[1] + rotationY;
    scene.rotation.set(rotation[0], yRotation, rotation[2]);

    mixer.current = new THREE.AnimationMixer(scene);
    isInitializedRef.current = true;

    onModelLoaded?.(vrm);

    return () => {
      if (mixer.current) mixer.current.stopAllAction();
      actionsRef.current.clear();
      vrmAnimationsRef.current.clear();
      isInitializedRef.current = false;
      currentActionRef.current = null;
    };
  }, [scene, vrm, modelUrl]);

  // Handle animation changes
  useEffect(() => {
    if (!mixer.current || !isInitializedRef.current) return;
    if (currentAnimation) {
      playAnimationDirectly(currentAnimation);
    }
  }, [currentAnimation, playAnimationDirectly]);

  // Frame loop
  useFrame((_, delta) => {
    const clampedDelta = Math.min(delta, 0.1);
    if (mixer.current) mixer.current.update(clampedDelta);
    if (vrmRef.current) {
      try { (vrmRef.current as any).update(clampedDelta); } catch {}
    }
  });

  return scene ? <primitive object={scene} /> : null;
};

const SceneContent: React.FC<CharacterProps & { shadows?: boolean; cameraFov?: number; orbitControls?: boolean }> = ({
  shadows = true,
  orbitControls = true,
  ...characterProps
}) => {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 7.5]} intensity={1.2} castShadow={shadows} />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />
      <Suspense fallback={null}>
        <Character {...characterProps} />
      </Suspense>
      {orbitControls && (
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={2}
          maxDistance={5}
          target={[0, 1.2, 0]}
          enableDamping={true}
          dampingFactor={0.05}
        />
      )}
    </>
  );
};

export const AvatarModel = forwardRef<AvatarModelRef, AvatarModelProps>(({
  className = '',
  style,
  cameraPosition = [0, 1.4, 3.5],
  cameraFov = 40,
  shadows = true,
  orbitControls = true,
  onError,
  ...characterProps
}, ref) => {
  return (
    <div className={className} style={{ width: '100%', height: '100%', ...style }}>
      <Canvas
        shadows={shadows}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        camera={{ fov: cameraFov, near: 0.1, far: 100, position: cameraPosition }}
        dpr={[1, 2]}
      >
        <SceneContent
          {...characterProps}
          characterRef={ref}
          shadows={shadows}
          orbitControls={orbitControls}
        />
      </Canvas>
    </div>
  );
});

AvatarModel.displayName = 'AvatarModel';
