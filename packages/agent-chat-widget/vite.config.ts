import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    react(),
    dts({
      rollupTypes: true,
      include: ['src/**/*'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx']
    })
  ],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'AtlasAgentsChatWidget',
      fileName: (format) => `agent-chat-widget.${format}.js`,
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'three',
        '@react-three/fiber',
        '@react-three/drei',
        '@pixiv/three-vrm',
        '@pixiv/three-vrm-animation',
        '@atlas-agents/types',
        '@atlas-agents/speech-stt',
        '@atlas-agents/speech-tts',
        '@atlas-agents/avatar-core',
        '@atlas-agents/avatar-react',
        '@atlas-agents/chat-ui',
        'zustand',
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          zustand: 'zustand'
        }
      }
    }
  }
});
