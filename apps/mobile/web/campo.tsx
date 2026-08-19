import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { normalizarPelaMedia, type EixoDeEntrada } from '@pienza/domain';
import { cor, FAMILIA, paleta, type NomeDePaleta } from '../src/theme';
import { HexagonoWeb } from './HexagonoWeb';

/**
 * Pagina de teste de campo do hexagono.
 *
 * Um arquivo so, sem servidor, para abrir no telefone de quem esta testando. Ela nao
 * explica o grafico, e a ausencia de legenda e o teste: a regra em vigor e
 * preenchido para fora, vazado para dentro, mesma cor nos dois, e o que se quer saber
 * e se alguem le isso sem que ninguem conte. Uma legenda embaixo responderia a
 * pergunta antes de ela ser feita.
 *
 * Os dois conjuntos existem para separar duas perguntas que se confundem quando se ve
 * um so: se a figura e legivel, e se a falta de dado e legivel como falta.
 *
 * A terceira variante, C, mostra o conjunto A com cada eixo dividido pela media dos
 * seis. Nela a area e praticamente constante por construcao, entao ela responde se a
 * leitura por tamanho some quando o tamanho para de carregar informacao. E variante de
 * teste e nao proposta: nada foi decidido sobre ela.
 */

// Copia de product_settings, como em main.tsx: o harness nao tem banco.
const LIMIAR = 0.01;
const ESCALA = { razaoMinima: 0.85, razaoMaxima: 1.15, raioMinimo: 0.25 };

interface Conjunto {
  readonly nome: string;
  readonly intervalo: string;
  readonly eixos: readonly EixoDeEntrada[];
  /** Ver HexagonoWeb: a variante normalizada nao carimba direcao. */
  readonly mostrarDirecao?: boolean;
}

const A_EIXOS: readonly EixoDeEntrada[] = [
  { key: 'ombro', label: 'ombro', estado: { status: 'ok', ratio: 1.031 } },
  { key: 'peito', label: 'peito', estado: { status: 'ok', ratio: 1.012 } },
  { key: 'braco', label: 'braço', estado: { status: 'ok', ratio: 1.047 } },
  { key: 'cintura', label: 'cintura', estado: { status: 'ok', ratio: 0.968 } },
  { key: 'coxa', label: 'coxa', estado: { status: 'ok', ratio: 1.004 } },
  { key: 'panturrilha', label: 'panturrilha', estado: { status: 'ok', ratio: 0.998 } },
];

const CONJUNTOS: readonly Conjunto[] = [
  {
    nome: 'A',
    intervalo: 'comparado com 33 dias atras',
    eixos: A_EIXOS,
  },
  {
    nome: 'B',
    intervalo: 'comparado com o baseline, 11 dias atras',
    eixos: [
      { key: 'ombro', label: 'ombro', estado: { status: 'ok', ratio: 1.019 } },
      { key: 'peito', label: 'peito', estado: { status: 'indisponivel', motivo: 'sem_medida' } },
      { key: 'braco', label: 'braço', estado: { status: 'ok', ratio: 1.088 } },
      { key: 'cintura', label: 'cintura', estado: { status: 'ok', ratio: 0.941 } },
      {
        key: 'coxa',
        label: 'coxa',
        estado: { status: 'indisponivel', motivo: 'baseline_nao_digitado' },
      },
      { key: 'panturrilha', label: 'panturrilha', estado: { status: 'ok', ratio: 1.002 } },
    ],
  },
  {
    nome: 'C',
    // Mesmo intervalo do A, porque sao os mesmos dados: o que muda e so o desenho.
    intervalo: 'comparado com 33 dias atras',
    eixos: normalizarPelaMedia(A_EIXOS),
    mostrarDirecao: false,
  },
];

function Campo() {
  const [i, setI] = useState(0);
  const [palette, setPalette] = useState<NomeDePaleta>('bandeira');
  const p = paleta(palette);
  const conjunto = CONJUNTOS[i] ?? CONJUNTOS[0]!;

  const largura = Math.min(window.innerWidth - 32, 420);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: cor(p, 'bg'),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: '24px 16px',
      }}
    >
      <HexagonoWeb
        eixos={conjunto.eixos}
        palette={palette}
        tamanho={largura}
        limiarEstavel={LIMIAR}
        escalaRadial={ESCALA}
        rotuloDeIntervalo={conjunto.intervalo}
        mostrarDirecao={conjunto.mostrarDirecao ?? true}
      />

      <div style={{ display: 'flex', gap: 24 }}>
        {CONJUNTOS.map((c, indice) => (
          <button
            key={c.nome}
            onClick={() => setI(indice)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '12px 20px',
              fontFamily: FAMILIA.mono,
              fontSize: 13,
              letterSpacing: 2,
              cursor: 'pointer',
              color: indice === i ? cor(p, 'text') : cor(p, 'text-2'),
              // Sublinhado no ativo em vez de fundo preenchido: um botao com fundo
              // colorido aqui seria o segundo elemento mais forte da tela, disputando
              // com o grafico, que e a unica coisa que se esta testando.
              borderBottom: `2px solid ${indice === i ? cor(p, 'brand') : 'transparent'}`,
            }}
          >
            {c.nome}
          </button>
        ))}
        <button
          onClick={() => setPalette(palette === 'bandeira' ? 'noturno' : 'bandeira')}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '12px 20px',
            fontFamily: FAMILIA.mono,
            fontSize: 13,
            letterSpacing: 2,
            cursor: 'pointer',
            color: cor(p, 'text-2'),
          }}
        >
          {palette === 'bandeira' ? 'noturno' : 'bandeira'}
        </button>
      </div>
    </div>
  );
}

const raiz = document.getElementById('raiz');
if (raiz !== null) createRoot(raiz).render(<Campo />);
