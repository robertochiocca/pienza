import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { buildSessionPlan, type Answer, type EixoDeEntrada } from '@pienza/domain';
import { MeasurementEntry } from '../src/screens/MeasurementEntry';
import { MeasurementReview, type LinhaDeRevisao } from '../src/screens/MeasurementReview';
import { cor, paleta, FAMILIA, type NomeDePaleta } from '../src/theme';
import { HexagonoWeb } from './HexagonoWeb';
import { ANTERIORES, VOCABULARIO } from './dados';
import { DISPOSITIVOS, modoPadrao, type Dispositivo, type ModoDeTeclado } from './dispositivos';

/**
 * Harness. Nao e o app: e o banco de testes onde as telas do app rodam antes do Expo.
 *
 * Ele existe por um motivo so, e o motivo e o teclado. Uma maquete estatica mostra a
 * tela de entrada de medidas no estado em que ela quase nunca e vista — sem teclado,
 * com a tela inteira disponivel, que e o estado mais lisonjeiro que existe. Aqui o
 * teclado tem altura de aparelho de verdade e os dois comportamentos de janela, e o
 * que sobrar de espaco e o espaco que existe.
 *
 * Os controles ficam fora do quadro do aparelho de proposito. Dentro do quadro so
 * entra o que vai existir no aparelho.
 */

const NUMEROS_DA_SESSAO = {
  // Ver product_settings: 180 dias para medida estrutural voltar a ser proposta.
  structuralRemeasureAfterDays: 180,
  // Variacao abaixo da qual o vertice conta como estavel. Numero de produto sem
  // medicao nenhuma por tras; esta aqui, no ponto de chamada, para nao passar por
  // constante de dominio.
  limiarEstavel: 0.01,
  faixa: { min: 0.85, max: 1.15 },
};

type Cenario = 'recorrente' | 'baseline';

const CONJUNTOS: Record<
  string,
  { readonly eixos: readonly EixoDeEntrada[]; readonly intervalo: string }
> = {
  'de 33 dias': {
    intervalo: 'comparado com 33 dias atras',
    eixos: [
      { key: 'ombro', label: 'ombro', estado: { status: 'ok', ratio: 1.031 } },
      { key: 'peito', label: 'peito', estado: { status: 'ok', ratio: 1.012 } },
      { key: 'braco', label: 'braço', estado: { status: 'ok', ratio: 1.047 } },
      { key: 'cintura', label: 'cintura', estado: { status: 'ok', ratio: 0.968 } },
      { key: 'coxa', label: 'coxa', estado: { status: 'ok', ratio: 1.004 } },
      { key: 'panturrilha', label: 'panturrilha', estado: { status: 'ok', ratio: 0.998 } },
    ],
  },
  'com buracos': {
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
};

/**
 * Cores do proprio harness — os controles fora do quadro do aparelho.
 *
 * Saem da paleta Bandeira e nao de literais, mesmo nao sendo produto. O gate de cores
 * pegou cinco cinzas que eu tinha escrito aqui, e ele estava certo: esta pasta tambem
 * contem HexagonoWeb, que e desenho de produto, e um gate que precisa saber quais
 * arquivos de uma pasta valem e quais nao valem e um gate com uma lista de excecoes.
 */
const CROMO = paleta('bandeira');

function Harness() {
  const [palette, setPalette] = useState<NomeDePaleta>('bandeira');
  const [dispositivo, setDispositivo] = useState<Dispositivo>(DISPOSITIVOS[0]!);
  const [teclado, setTeclado] = useState<ModoDeTeclado>(modoPadrao(DISPOSITIVOS[0]!));
  const [cenario, setCenario] = useState<Cenario>('recorrente');
  const [conjunto, setConjunto] = useState<string>('de 33 dias');
  const [indice, setIndice] = useState(0);
  const [respostas, setRespostas] = useState<ReadonlyMap<string, Answer>>(new Map());
  const [rascunho, setRascunho] = useState<ReadonlyMap<string, string>>(new Map());

  const plano = useMemo(
    () =>
      buildSessionPlan({
        vocabulary: VOCABULARIO,
        previous: cenario === 'baseline' ? [] : ANTERIORES,
        now: new Date(),
        structuralRemeasureAfterDays: NUMEROS_DA_SESSAO.structuralRemeasureAfterDays,
        isBaseline: cenario === 'baseline',
      }),
    [cenario],
  );

  const p = paleta(palette);
  const noFim = indice >= plano.steps.length;
  const step = plano.steps[indice];

  function responder(resposta: Answer) {
    if (step === undefined) return;
    const mapa = new Map(respostas);
    mapa.set(step.id, resposta);
    setRespostas(mapa);
    setIndice(indice + 1);
  }

  function valorDe(id: string, padrao: number | null): string {
    const r = rascunho.get(id);
    if (r !== undefined) return r;
    return padrao === null ? '' : padrao.toFixed(1).replace('.', ',');
  }

  const linhas: readonly LinhaDeRevisao[] = useMemo(() => {
    const porChave = new Map<string, LinhaDeRevisao>();
    for (const s of plano.steps) {
      const resposta = respostas.get(s.id);
      const valor =
        resposta === undefined
          ? null
          : resposta.kind === 'typed'
            ? resposta.value
            : resposta.kind === 'kept'
              ? s.previousValue
              : null;
      const spec = VOCABULARIO.find((v) => v.key === s.key)!;
      const atual = porChave.get(s.key) ?? {
        key: s.key,
        labelPtBr: s.labelPtBr,
        unit: s.unit,
        bilateral: spec.bilateral,
        esquerdo: null,
        direito: null,
        unico: null,
        mantido: false,
      };
      porChave.set(s.key, {
        ...atual,
        esquerdo: s.side === 'l' ? valor : atual.esquerdo,
        direito: s.side === 'r' ? valor : atual.direito,
        unico: s.side === 'na' ? valor : atual.unico,
        mantido: atual.mantido || resposta?.kind === 'kept',
      });
    }
    // Estruturais que atravessaram sem virar passo aparecem como mantidas: elas vao
    // ser gravadas, e o que vai ser gravado tem que estar na tela que diz o que vai
    // ser gravado.
    for (const c of plano.carried) {
      const spec = VOCABULARIO.find((v) => v.key === c.key)!;
      const atual = porChave.get(c.key) ?? {
        key: c.key,
        labelPtBr: spec.labelPtBr,
        unit: spec.unit,
        bilateral: spec.bilateral,
        esquerdo: null,
        direito: null,
        unico: null,
        mantido: true,
      };
      porChave.set(c.key, {
        ...atual,
        esquerdo: c.side === 'l' ? c.value : atual.esquerdo,
        direito: c.side === 'r' ? c.value : atual.direito,
        unico: c.side === 'na' ? c.value : atual.unico,
        mantido: true,
      });
    }
    return [...porChave.values()];
  }, [plano, respostas]);

  const alturaTeclado = teclado === 'nenhum' ? 0 : dispositivo.teclado;
  const alturaUtil = dispositivo.altura - dispositivo.topo - dispositivo.base;
  const alturaDaTela = teclado === 'encolhe' ? alturaUtil - alturaTeclado : alturaUtil;

  return (
    <div
      style={{
        display: 'flex',
        gap: 32,
        padding: 24,
        fontFamily: FAMILIA.interface,
        alignItems: 'flex-start',
      }}
    >
      <Controles
        palette={palette}
        setPalette={setPalette}
        dispositivo={dispositivo}
        setDispositivo={(d) => {
          setDispositivo(d);
          setTeclado(modoPadrao(d));
        }}
        teclado={teclado}
        setTeclado={setTeclado}
        cenario={cenario}
        setCenario={(c) => {
          setCenario(c);
          setIndice(0);
          setRespostas(new Map());
          setRascunho(new Map());
        }}
        indice={indice}
        total={plano.steps.length}
        setIndice={setIndice}
        conjunto={conjunto}
        setConjunto={setConjunto}
      />

      <div>
        <div
          data-quadro="aparelho"
          style={{
            width: dispositivo.largura,
            height: dispositivo.altura,
            background: cor(p, 'bg'),
            border: `1px solid ${cor(p, 'line')}`,
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Faixa altura={dispositivo.topo} p={p} texto="" />
          {/* Sem isto o navegador deixa a caixa da tela crescer ate o conteudo — o
              `<input>` com fonte de 105px tem largura intrinseca de 1293px — e o quadro
              do aparelho vira uma janela recortando uma tela de 1410px. O que saia era
              uma tela plausivel com o rodape inteiro fora do campo de visao.

              Quem resolve e o `overflow: hidden`, e nao o `minWidth: 0` que eu tinha
              creditado no ciclo 6: `min-width: auto` so vale para item de flex com
              overflow visivel, entao esconder o transbordo ja libera a caixa a encolher.
              Qualquer um dos dois sozinho basta — medi os tres casos. Ficam os dois
              porque o `overflow` existe para recortar o que passar e o `minWidth`
              existe para dizer que pode encolher, e cada um continua certo pelo proprio
              motivo se o outro sair. O gate de quadro cobre a volta do defeito. */}
          <div
            style={{
              height: alturaDaTela,
              width: dispositivo.largura,
              minWidth: 0,
              position: 'relative',
              display: 'flex',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {noFim ? (
                <MeasurementReview
                  linhas={linhas}
                  palette={palette}
                  largura={dispositivo.largura}
                  onVoltar={() => setIndice(Math.max(0, plano.steps.length - 1))}
                  onGravar={() => undefined}
                />
              ) : step !== undefined ? (
                <MeasurementEntry
                  step={step}
                  indice={indice}
                  total={plano.steps.length}
                  valor={valorDe(step.id, step.prefilled ? step.previousValue : null)}
                  mantido={respostas.get(step.id)?.kind === 'kept'}
                  palette={palette}
                  largura={dispositivo.largura}
                  alturaCobertaPorTeclado={teclado === 'cobre' ? alturaTeclado : 0}
                  onChange={(v) => setRascunho(new Map(rascunho).set(step.id, v))}
                  onConfirmar={() => {
                    const bruto = valorDe(step.id, step.prefilled ? step.previousValue : null);
                    const numero = Number(bruto.replace(',', '.'));
                    if (bruto === '' || Number.isNaN(numero)) return;
                    const digitou = rascunho.has(step.id);
                    responder(digitou ? { kind: 'typed', value: numero } : { kind: 'kept' });
                  }}
                  onPular={() => responder({ kind: 'skipped' })}
                  onVoltar={() => setIndice(Math.max(0, indice - 1))}
                />
              ) : null}
            </div>
            {teclado === 'cobre' ? (
              <Teclado altura={alturaTeclado} largura={dispositivo.largura} p={p} sobreposto />
            ) : null}
          </div>
          {teclado === 'encolhe' ? (
            <Teclado
              altura={alturaTeclado}
              largura={dispositivo.largura}
              p={p}
              sobreposto={false}
            />
          ) : null}
          <Faixa altura={dispositivo.base} p={p} texto="" />
        </div>

        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            color: cor(CROMO, 'text-2'),
            fontFamily: FAMILIA.mono,
          }}
        >
          {dispositivo.nome} · {dispositivo.largura}×{dispositivo.altura} · teclado {teclado}
          {teclado !== 'nenhum' ? ` (${alturaTeclado}pt)` : ''} · tela util {alturaDaTela}pt
        </div>
      </div>

      <div data-quadro="hexagono" style={{ background: cor(p, 'bg'), padding: 16 }}>
        <HexagonoWeb
          eixos={CONJUNTOS[conjunto]!.eixos}
          palette={palette}
          tamanho={dispositivo.largura}
          limiarEstavel={NUMEROS_DA_SESSAO.limiarEstavel}
          faixa={NUMEROS_DA_SESSAO.faixa}
          rotuloDeIntervalo={CONJUNTOS[conjunto]!.intervalo}
        />
      </div>
    </div>
  );
}

function Faixa(props: { altura: number; p: ReturnType<typeof paleta>; texto: string }) {
  if (props.altura === 0) return null;
  return <div style={{ height: props.altura, background: cor(props.p, 'bg') }}>{props.texto}</div>;
}

/**
 * Bloco do teclado. Nao e um teclado de verdade e nao precisa ser: o que ele tem que
 * reproduzir e a altura e a opacidade, porque o que se julga aqui e quanto de tela
 * sobra e o que fica embaixo dele.
 */
function Teclado(props: {
  altura: number;
  largura: number;
  p: ReturnType<typeof paleta>;
  sobreposto: boolean;
}) {
  const teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '⌫'];
  return (
    <div
      data-teclado="1"
      style={{
        position: props.sobreposto ? 'absolute' : 'relative',
        bottom: props.sobreposto ? 0 : undefined,
        left: 0,
        width: props.largura,
        height: props.altura,
        background: cor(props.p, 'surface'),
        borderTop: `1px solid ${cor(props.p, 'line')}`,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        alignItems: 'center',
        justifyItems: 'center',
        color: cor(props.p, 'text'),
        fontSize: 22,
        fontFamily: FAMILIA.interface,
      }}
    >
      {teclas.map((t) => (
        <div key={t}>{t}</div>
      ))}
    </div>
  );
}

function Controles(props: {
  palette: NomeDePaleta;
  setPalette: (n: NomeDePaleta) => void;
  dispositivo: Dispositivo;
  setDispositivo: (d: Dispositivo) => void;
  teclado: ModoDeTeclado;
  setTeclado: (m: ModoDeTeclado) => void;
  cenario: Cenario;
  setCenario: (c: Cenario) => void;
  indice: number;
  total: number;
  setIndice: (i: number) => void;
  conjunto: string;
  setConjunto: (c: string) => void;
}) {
  return (
    <div style={{ width: 210, fontSize: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Grupo titulo="paleta">
        {(['bandeira', 'noturno'] as const).map((n) => (
          <Botao
            key={n}
            ativo={props.palette === n}
            onClick={() => props.setPalette(n)}
            rotulo={n}
          />
        ))}
      </Grupo>

      <Grupo titulo="aparelho">
        {DISPOSITIVOS.map((d) => (
          <Botao
            key={d.nome}
            ativo={props.dispositivo.nome === d.nome}
            onClick={() => props.setDispositivo(d)}
            rotulo={d.nome}
          />
        ))}
      </Grupo>

      <Grupo titulo="teclado">
        {(['nenhum', 'encolhe', 'cobre'] as const).map((m) => (
          <Botao
            key={m}
            ativo={props.teclado === m}
            onClick={() => props.setTeclado(m)}
            rotulo={m}
          />
        ))}
      </Grupo>

      <Grupo titulo="cenario">
        <Botao
          ativo={props.cenario === 'recorrente'}
          onClick={() => props.setCenario('recorrente')}
          rotulo="com historico"
        />
        <Botao
          ativo={props.cenario === 'baseline'}
          onClick={() => props.setCenario('baseline')}
          rotulo="baseline"
        />
      </Grupo>

      <Grupo titulo={`passo ${Math.min(props.indice + 1, props.total)} de ${props.total}`}>
        <Botao
          ativo={false}
          onClick={() => props.setIndice(Math.max(0, props.indice - 1))}
          rotulo="anterior"
        />
        <Botao
          ativo={false}
          onClick={() => props.setIndice(Math.min(props.total, props.indice + 1))}
          rotulo="proximo"
        />
        <Botao ativo={false} onClick={() => props.setIndice(props.total)} rotulo="revisao" />
      </Grupo>

      <Grupo titulo="hexagono">
        {Object.keys(CONJUNTOS).map((c) => (
          <Botao
            key={c}
            ativo={props.conjunto === c}
            onClick={() => props.setConjunto(c)}
            rotulo={c}
          />
        ))}
      </Grupo>
    </div>
  );
}

function Grupo(props: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontFamily: FAMILIA.mono,
          fontSize: 10,
          letterSpacing: 1,
          color: cor(CROMO, 'grafite'),
          marginBottom: 4,
        }}
      >
        {props.titulo.toUpperCase()}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{props.children}</div>
    </div>
  );
}

function Botao(props: { ativo: boolean; onClick: () => void; rotulo: string }) {
  return (
    <button
      onClick={props.onClick}
      style={{
        padding: '4px 8px',
        fontSize: 11,
        border: `1px solid ${cor(CROMO, 'line')}`,
        background: props.ativo ? cor(CROMO, 'text') : cor(CROMO, 'bg'),
        color: props.ativo ? cor(CROMO, 'bg') : cor(CROMO, 'text'),
        cursor: 'pointer',
      }}
    >
      {props.rotulo}
    </button>
  );
}

const raiz = document.getElementById('raiz');
if (raiz !== null) createRoot(raiz).render(<Harness />);
