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
      name: 'AtlasAgentsSpeechTTSLocal',
      fileName: (format) => `speech-tts-local.${format}.js`,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['@atlas.agents/types', '@atlas.agents/speech-tts'],
      output: {
        globals: {
          '@atlas.agents/types': 'AtlasAgentsTypes',
          '@atlas.agents/speech-tts': 'AtlasAgentsSpeechTTS',
        },
      },
    },
  },
});
