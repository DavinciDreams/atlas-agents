import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      rollupTypes: true,
      include: ['src/**/*'],
      exclude: ['src/**/*.test.ts'],
    }),
  ],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'AvatarCore',
      fileName: (format) => `avatar-core.${format}.js`,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: [
        '@atlas-agents/types',
        'three',
        'three/examples/jsm/loaders/GLTFLoader.js',
        '@pixiv/three-vrm',
        '@pixiv/three-vrm-animation',
        'wlipsync',
      ],
    },
  },
});
