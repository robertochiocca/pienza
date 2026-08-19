import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text-summary'],
      // Piso em 100. Um piso abaixo da cobertura real nao interrompe ninguem: ele
      // deixa a primeira funcao sem teste entrar com o build verde, e so avisa
      // depois que boa parte do dominio ja esta descoberta. O dominio e logica
      // pura, sem I/O e sem framework, entao nao existe aqui a categoria de linha
      // "dificil de testar" que justifica piso baixo em camada de borda.
      //
      // Baixar este numero e decisao datada e justificada em ADR, nunca ajuste
      // silencioso quando incomoda. Ver docs/decisoes/0009-piso-de-cobertura.md.
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
