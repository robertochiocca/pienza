/**
 * Empacota o harness web.
 *
 * esbuild e nao Metro nem Vite: o harness precisa de uma coisa so — resolver
 * `react-native` para `react-native-web` e transpilar TSX. Metro pertence ao Expo e
 * entra com ele; ate la, uma ferramenta a menos para manter.
 */
import { build, context } from 'esbuild';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Saida em `dist/` e nao `web-dist/`: `dist/` ja esta ignorado pelo git, pelo
// prettier e pelo eslint. Com um nome proprio, o bundle de 1,3 MB entrava no lint e
// produzia mil e seiscentos erros dentro de codigo que ninguem escreveu — e a correcao
// seria acrescentar a mesma excecao em tres arquivos de ignore.
const saida = resolve(raiz, 'dist');

const config = {
  entryPoints: [resolve(raiz, 'web/main.tsx')],
  outfile: resolve(saida, 'main.js'),
  bundle: true,
  format: 'esm',
  target: 'es2022',
  jsx: 'automatic',
  sourcemap: true,
  logLevel: 'info',
  // O alias e o harness inteiro: os componentes importam `react-native` de verdade,
  // como vao importar no aparelho, e quem troca a implementacao e o empacotador.
  // Sem isso o codigo da tela precisaria saber que esta no navegador.
  alias: { 'react-native': 'react-native-web' },
  loader: { '.json': 'json' },
  define: { 'process.env.NODE_ENV': '"development"', __DEV__: 'true' },
};

await mkdir(saida, { recursive: true });
await cp(resolve(raiz, 'web/index.html'), resolve(saida, 'index.html'));

if (process.argv.includes('--watch')) {
  const ctx = await context(config);
  await ctx.watch();
  console.log('observando web/');
} else {
  await build(config);
  await gerarPaginaDeCampo();
}

/**
 * Pagina de teste de campo em um arquivo so, com o JavaScript embutido.
 *
 * Sem isso, testar o hexagono com cinco pessoas exige que cada uma esteja na mesma
 * rede que a minha maquina, com o servidor de pe. Um HTML sozinho vai por mensagem,
 * abre offline e continua funcionando amanha — e o custo de nao ter servidor e nao
 * poder atualizar o que ja foi enviado, que para um teste de leitura nao importa.
 */
async function gerarPaginaDeCampo() {
  const bundle = resolve(saida, 'campo.js');
  // Minificada e em modo de producao, ao contrario do harness: esta pagina vai por
  // mensagem para o telefone de outra pessoa, e um megabyte de React em modo de
  // desenvolvimento e um megabyte que alguem baixa no plano de dados dela para
  // responder uma pergunta sobre um desenho.
  await build({
    ...config,
    entryPoints: [resolve(raiz, 'web/campo.tsx')],
    outfile: bundle,
    sourcemap: false,
    minify: true,
    define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' },
  });

  const js = await readFile(bundle, 'utf8');
  await writeFile(
    resolve(saida, 'hexagono.html'),
    `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Pienza — hexagono</title>
    <style>
      html, body { margin: 0; padding: 0; }
    </style>
  </head>
  <body>
    <div id="raiz"></div>
    <script type="module">${js}</script>
  </body>
</html>
`,
    'utf8',
  );
  console.log('pagina de campo: dist/hexagono.html');
}
