/**
 * Capturas do harness, com o teclado aberto.
 *
 * Existe como script e nao como sessao manual de navegador porque a pergunta que ele
 * responde volta todo ciclo: a tela ainda sobrevive ao teclado? Captura tirada a mao
 * responde uma vez, e na proxima mudanca alguem compara a tela nova com a lembranca
 * da antiga.
 *
 * Precisa do harness servindo (`npm run serve:web`) e de um Chromium. O caminho do
 * executavel vem de PIENZA_CHROMIUM quando o Playwright nao baixou o proprio.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SAIDA = process.argv[2] ?? resolve(RAIZ, 'docs/capturas');
const ENDERECO = process.env.PIENZA_HARNESS ?? 'http://localhost:5173/';
const EXECUTAVEL = process.env.PIENZA_CHROMIUM;

await mkdir(SAIDA, { recursive: true });

const navegador = await chromium.launch(
  EXECUTAVEL === undefined ? {} : { executablePath: EXECUTAVEL },
);
// deviceScaleFactor 2 porque e a densidade dos aparelhos da tabela: capturar a 1x
// mostraria uma tipografia que ninguem ve.
const pagina = await navegador.newPage({
  viewport: { width: 1400, height: 1000 },
  deviceScaleFactor: 2,
});
await pagina.goto(ENDERECO, { waitUntil: 'networkidle' });

async function clicar(rotulo) {
  await pagina.getByRole('button', { name: rotulo, exact: true }).click();
  await pagina.waitForTimeout(80);
}

async function foto(nome, seletor = '[data-quadro="aparelho"]') {
  await pagina.locator(seletor).screenshot({ path: `${SAIDA}/${nome}.png` });
  console.log(`   ${nome}.png`);
}

console.log('== entrada de medidas ==');

// O estado da maquete: sem teclado, tela inteira. E o menos frequente e o mais
// lisonjeiro, e esta aqui so para comparar com o proximo.
await clicar('nenhum');
await foto('01-bandeira-sem-teclado');

// iOS: a janela nao encolhe e o teclado sobrepoe. Este e o estado a julgar.
await clicar('cobre');
await foto('02-bandeira-teclado-cobre');

await clicar('noturno');
await foto('03-noturno-teclado-cobre');
await clicar('bandeira');

// Android com adjustResize: a janela encolhe e o layout se refaz.
await clicar('Pixel 5');
await foto('04-pixel5-teclado-encolhe');
await clicar('noturno');
await foto('05-pixel5-noturno-encolhe');
await clicar('bandeira');

// A tela mais apertada que ainda importa.
await clicar('iPhone SE');
await clicar('cobre');
await foto('06-iphone-se-teclado-cobre');
await clicar('iPhone 13');
await clicar('cobre');

console.log('== baseline ==');
await clicar('baseline');
for (let i = 0; i < 4; i++) await clicar('proximo');
await foto('07-baseline-eixo-pendente');
await clicar('nenhum');
await foto('08-baseline-sem-teclado');

console.log('== revisao ==');
// Percorre a sessao de verdade: digita, mantem e pula. Saltar direto para a revisao
// mostra tudo como pulada, que e um estado real e nao e o que se quer julgar.
await clicar('com historico');
const roteiro = [
  '39,0',
  '100,5',
  '34,9',
  '35,4',
  '80,5',
  'manter',
  '56,3',
  'pular',
  '37,1',
  '37,2',
];
for (const passo of roteiro) {
  if (passo === 'pular') {
    await clicar('pular');
    continue;
  }
  if (passo !== 'manter') {
    await pagina.locator('[data-quadro="aparelho"] input').fill(passo);
    await pagina.waitForTimeout(40);
  }
  await clicar('confirmar');
}
await foto('09-revisao-diferenca');
await clicar('noturno');
await foto('10-revisao-noturno');
await clicar('bandeira');

console.log('== hexagono ==');
await clicar('de 33 dias');
await foto('11-hexagono-33-dias', '[data-quadro="hexagono"]');
await clicar('com buracos');
await foto('12-hexagono-com-buracos', '[data-quadro="hexagono"]');
await clicar('noturno');
await foto('13-hexagono-noturno', '[data-quadro="hexagono"]');
await clicar('de 33 dias');
await foto('14-hexagono-noturno-33-dias', '[data-quadro="hexagono"]');

console.log('== pagina de campo, do arquivo unico ==');
const campo = await navegador.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
await campo.goto(`file://${resolve(RAIZ, 'apps/mobile/dist/hexagono.html')}`);
await campo.waitForTimeout(300);
await campo.screenshot({ path: `${SAIDA}/20-campo-A.png` });
console.log('   20-campo-A.png');
await campo.getByRole('button', { name: 'B', exact: true }).click();
await campo.waitForTimeout(200);
await campo.screenshot({ path: `${SAIDA}/21-campo-B.png` });
console.log('   21-campo-B.png');
await campo.getByRole('button', { name: 'noturno', exact: true }).click();
await campo.waitForTimeout(200);
await campo.screenshot({ path: `${SAIDA}/22-campo-B-noturno.png` });
console.log('   22-campo-B-noturno.png');

await navegador.close();
