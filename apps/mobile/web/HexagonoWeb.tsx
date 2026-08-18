import { plotarHexagono, pontos, type EixoDeEntrada, type EscalaRadial } from '@pienza/domain';
import { cor, FAMILIA, paleta, type NomeDePaleta } from '../src/theme';

/**
 * Desenho do hexagono para o harness web.
 *
 * A geometria inteira vem de `@pienza/domain/hexagon` e nao existe aqui: angulo,
 * raio, direcao e anel do baseline sao decididos la e testados la. O que este arquivo
 * tem e a superficie de desenho, que hoje e `<svg>` do DOM porque o harness roda no
 * navegador. No aparelho ela vira `react-native-svg`, com os mesmos pontos.
 *
 * Isso e divida declarada e nao acidente: `react-native-svg` exige `react-native`
 * instalado como par, e este workspace ainda nao tem — a tela roda em
 * `react-native-web`. Instalar a arvore do React Native inteira para desenhar seis
 * linhas antes do Expo seria pagar caro por um adiantamento de dois dias.
 *
 * O que fica por provar no aparelho: nada da geometria, que ja tem teste; o traco, a
 * espessura e a leitura do preenchimento, que so o olho julga.
 */

/**
 * Direcao vira preenchimento, e nao matiz.
 *
 * Vermelho e verde diriam por cor exatamente o juizo de valor que a matematica deixou
 * de fazer quando a inversao de eixo foi eliminada. Fora e dentro sao fatos sobre a
 * direcao da mudanca, e o app nao sabe qual dos dois a pessoa queria: cintura para
 * dentro e braco para dentro nao significam a mesma coisa, e nem eu nem a tela temos
 * como saber qual e o caso de quem esta olhando.
 */
export interface HexagonoProps {
  readonly eixos: readonly EixoDeEntrada[];
  readonly palette: NomeDePaleta;
  readonly tamanho: number;
  readonly limiarEstavel: number;
  readonly escalaRadial: EscalaRadial;
  /** Texto do intervalo, ja formatado por quem sabe qual comparacao foi escolhida. */
  readonly rotuloDeIntervalo: string;
  /**
   * Se os vertices carimbam direcao — cheio para fora, vazado para dentro.
   *
   * Falso na variante normalizada pela media, e nao por gosto: la a razao de cada eixo
   * e relativa a media dos seis, entao "vazado" passa a querer dizer "cresceu menos que
   * os outros" e nao "diminuiu". Com os dados do conjunto A, a panturrilha tem razao
   * 0,998 — parada — e sairia vazada; a frase "ponto vazado, a medida diminuiu" seria
   * falsa sobre ela. Dois dos seis vertices trocam de estado entre as duas variantes
   * com os mesmos dados.
   */
  readonly mostrarDirecao?: boolean;
}

export function HexagonoWeb(props: HexagonoProps) {
  const p = paleta(props.palette);
  const plot = plotarHexagono({
    eixos: props.eixos,
    limiarEstavel: props.limiarEstavel,
    escalaRadial: props.escalaRadial,
  });

  const centro = { x: props.tamanho / 2, y: props.tamanho / 2 };
  const raio = props.tamanho * 0.3;

  // A grade tem os seis eixos sempre, inclusive os indisponiveis: o eixo que sumiu
  // continua ocupando o lugar dele, senao um hexagono com quatro medidas viraria um
  // quadrilatero regular — figura fechada, bonita, e sobre outro conjunto de eixos.
  const todos = [...plot.vertices, ...plot.indisponiveis].sort((a, b) => a.anguloRad - b.anguloRad);

  return (
    <div style={{ width: props.tamanho }}>
      <svg
        width={props.tamanho}
        height={props.tamanho}
        role="img"
        aria-label="hexagono de proporcao"
      >
        {/* Anel do baseline: a referencia e a propria pessoa, entao ela e um circulo
            e nao um contorno de ideal externo. */}
        <circle
          cx={centro.x}
          cy={centro.y}
          r={raio * plot.raioDoBaseline}
          fill="none"
          stroke={cor(p, 'line')}
          strokeWidth={1}
        />

        {todos.map((eixo) => {
          const fim = {
            x: centro.x + Math.cos(eixo.anguloRad) * raio,
            y: centro.y + Math.sin(eixo.anguloRad) * raio,
          };
          const indisponivel = !('raio' in eixo);
          return (
            <g key={eixo.key}>
              <line
                x1={centro.x}
                y1={centro.y}
                x2={fim.x}
                y2={fim.y}
                stroke={cor(p, 'line')}
                strokeWidth={1}
                // Eixo sem dado tem o raio tracejado. A grade continua completa, e a
                // falta fica visivel como falta em vez de virar um vertice no centro.
                strokeDasharray={indisponivel ? '2 4' : undefined}
              />
              <text
                x={centro.x + Math.cos(eixo.anguloRad) * raio * 1.28}
                y={centro.y + Math.sin(eixo.anguloRad) * raio * 1.28}
                fill={cor(p, 'text-2')}
                fontSize={10}
                fontFamily={FAMILIA.mono}
                letterSpacing={1}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {eixo.label.toUpperCase()}
              </text>
            </g>
          );
        })}

        {plot.segmentos.map((segmento, i) => {
          const seus = pontos(segmento.vertices, centro, raio);
          if (seus.length < 2) return null;
          const d = seus.map((pt) => `${pt.x},${pt.y}`).join(' ');

          // Preenchimento so no traco fechado. Area sob um traco aberto precisaria de
          // uma linha para fechar, e essa linha nao corresponde a medida nenhuma —
          // sendo que area preenchida e exatamente o que o olho le como o corpo.
          return segmento.fechado ? (
            <polygon
              key={i}
              points={d}
              fill={cor(p, 'brand')}
              fillOpacity={0.12}
              stroke={cor(p, 'brand')}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          ) : (
            <polyline
              key={i}
              points={d}
              fill="none"
              stroke={cor(p, 'brand')}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}

        {pontos(plot.vertices, centro, raio).map((pt, i) => {
          const v = plot.vertices[i];
          if (v === undefined) return null;

          if (props.mostrarDirecao === false) {
            return (
              <circle
                key={v.key}
                cx={pt.x}
                cy={pt.y}
                r={3.5}
                fill={cor(p, 'brand')}
                stroke={cor(p, 'brand')}
                strokeWidth={2}
              />
            );
          }

          // Preenchido para fora, vazado para dentro, mesma cor nos dois. Estavel fica
          // menor e sem enfase: nao mudou o bastante nao e evento.
          return (
            <circle
              key={v.key}
              cx={pt.x}
              cy={pt.y}
              r={v.direcao === 'estavel' ? 2.5 : 4}
              fill={v.direcao === 'fora' ? cor(p, 'brand') : cor(p, 'bg')}
              stroke={cor(p, 'brand')}
              strokeWidth={2}
            />
          );
        })}
      </svg>

      <div
        style={{
          color: cor(p, 'text-2'),
          fontFamily: FAMILIA.mono,
          fontSize: 10,
          letterSpacing: 1,
          textAlign: 'center',
          marginTop: 4,
        }}
      >
        {props.rotuloDeIntervalo.toUpperCase()}
      </div>

      {/* Os motivos ficam embaixo e nao no vertice. No vertice o texto e mais largo
          que o proprio desenho, empurra o rotulo do eixo para fora do quadro, e faz o
          eixo que falta ocupar mais espaco que os que tem dado. Aqui ele e uma linha
          de lista, que e o peso certo para uma ausencia. */}
      {plot.indisponiveis.length > 0 ? (
        <div style={{ marginTop: 12 }}>
          {plot.indisponiveis.map((eixo) => (
            <div
              key={eixo.key}
              style={{
                color: cor(p, 'text-2'),
                fontFamily: FAMILIA.mono,
                fontSize: 10,
                lineHeight: 1.7,
              }}
            >
              {eixo.label} — {eixo.motivo}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
