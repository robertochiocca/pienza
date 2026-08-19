/**
 * Servidor estatico do harness. Sem dependencia: e `http` da biblioteca padrao
 * servindo uma pasta, e trazer um pacote para isso seria trazer uma arvore inteira
 * para trinta linhas.
 *
 * Escuta em 0.0.0.0 de proposito: o teste de campo do hexagono e alguem abrindo isto
 * no proprio telefone, e para isso o endereco tem que ser alcancavel na rede local.
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const porta = Number(process.env.PORT ?? 5173);

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.map': 'application/json',
  '.json': 'application/json',
};

createServer((req, res) => {
  const pedido = (req.url ?? '/').split('?')[0] ?? '/';
  // `normalize` antes de juntar: sem isso um pedido com `..` sai da pasta servida.
  const relativo = normalize(pedido === '/' ? '/index.html' : pedido).replace(/^(\.\.[/\\])+/, '');
  const caminho = join(raiz, relativo);

  if (!caminho.startsWith(raiz)) {
    res.writeHead(403).end('fora da pasta');
    return;
  }

  stat(caminho)
    .then(() => {
      res.writeHead(200, { 'content-type': TIPOS[extname(caminho)] ?? 'application/octet-stream' });
      createReadStream(caminho).pipe(res);
    })
    .catch(() => {
      res.writeHead(404).end('nao encontrado');
    });
}).listen(porta, '0.0.0.0', () => {
  console.log(`harness em http://localhost:${porta}`);
});
