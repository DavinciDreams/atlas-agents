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
      name: 'AtlasAgentsSpeechSTTLocal',
      fileName: (format) => `speech-stt-local.${format}.js`,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['@atlas.agents/types'],
      output: {
        globals: {
          '@atlas.agents/types': 'AtlasAgentsTypes',
        },
      },
    },
  },
});
