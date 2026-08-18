import type { EixoDeEntrada } from './plot';

/**
 * Divide cada razao pela media das razoes disponiveis.
 *
 * Existe para o teste de campo, como terceira variante, e nao como decisao tomada.
 * A pergunta que ela responde e se o problema da area some quando a area para de
 * carregar informacao.
 *
 * O que ela faz com os dados: crescimento uniforme desaparece. Se todas as seis
 * medidas subirem 2%, a media sobe 2% junto e todas as razoes normalizadas ficam
 * exatamente onde estavam — o hexagono nao se mexe. Isso e uma perda real de
 * informacao e e o ponto: o que sobra no desenho e so proporcao relativa, que e o que
 * o nome do app quer dizer, e "eu mudei?" passa a viver inteiramente nos numeros.
 *
 * Com eixo indisponivel a media e sobre os disponiveis. A alternativa — tratar o
 * ausente como 1 — colocaria no denominador um valor que ninguem mediu, e mudaria a
 * posicao de todos os outros cinco vertices por causa de uma medida que nao existe.
 */
export function normalizarPelaMedia(eixos: readonly EixoDeEntrada[]): readonly EixoDeEntrada[] {
  const razoes = eixos.flatMap((eixo) => (eixo.estado.status === 'ok' ? [eixo.estado.ratio] : []));
  if (razoes.length === 0) return eixos;

  const media = razoes.reduce((s, r) => s + r, 0) / razoes.length;

  // Media zero ou negativa nao vem de medida de circunferencia, mas o dominio nao
  // decide o que e plausivel de corpo: ele devolve a entrada intacta em vez de
  // produzir infinito e desenhar um vertice em lugar nenhum.
  if (media <= 0) return eixos;

  return eixos.map((eixo) =>
    eixo.estado.status === 'ok'
      ? { ...eixo, estado: { status: 'ok', ratio: eixo.estado.ratio / media } }
      : eixo,
  );
}
