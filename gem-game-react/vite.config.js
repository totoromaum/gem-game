import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' → 빌드 결과(dist)를 어느 경로에 올려도 동작 (GitHub Pages 하위 폴더 포함)
export default defineConfig({
  base: './',
  plugins: [react()],
});
