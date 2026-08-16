import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text-summary'],
      // O piso reprova o build em vez de avisar. Nao e meta: e o ponto abaixo do
      // qual eu quero ser interrompido. O dominio e logica pura, sem I/O e sem
      // framework, entao nao ha a categoria de linha "dificil de testar" que
      // justifica piso baixo em outras camadas. Subir o piso quando a Fase 1
      // trouxer o calculo de proporcao.
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95,
      },
    },
  },
});
