// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/.expo/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // packages/domain e' logica de dominio pura: precisa rodar em Node (vitest) sem
    // qualquer camada de UI ou de plataforma. Se um import de RN entrar aqui, o
    // pacote deixa de ser testavel fora do app e a regra da secao 8 do brief cai.
    files: ['packages/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react-native', 'react-native/*', 'expo', 'expo-*'],
              message:
                'packages/domain e TypeScript puro. Nenhum import de UI ou de plataforma aqui.',
            },
            {
              group: ['node:*', 'fs', 'path', 'os', 'crypto'],
              message:
                'packages/domain nao pode depender de APIs de Node: precisa rodar tambem no runtime do app.',
            },
          ],
        },
      ],
    },
  },
  {
    // Arquivos JavaScript soltos — este proprio config e os scripts de gate — nao
    // pertencem a nenhum tsconfig, e o typescript-eslint com `projectService`
    // reprova com "was not found by the project service" em vez de simplesmente
    // ignora-los. Precisa cobrir .mjs e .cjs alem de .js: com o padrao so em
    // `**/*.js`, os dois scripts de `scripts/` quebravam o lint.
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      // Declarados a mao em vez de instalar o pacote `globals`. Sao os tres unicos
      // globais que os scripts de gate usam, e a lista curta e explicita: se um
      // quarto aparecer, o lint reprova e alguem decide se ele devia estar ali.
      globals: {
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly',
      },
    },
  },
);
