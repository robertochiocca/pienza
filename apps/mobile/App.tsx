import { useState } from 'react';
import {
  Keyboard,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import { buildSessionPlan, type Answer } from '@pienza/domain';
import { MeasurementEntry } from './src/screens/MeasurementEntry';
import { MeasurementReview, type LinhaDeRevisao } from './src/screens/MeasurementReview';
import { cor, paleta, type NomeDePaleta } from './src/theme';
import { useAlturaCobertaPorTeclado } from './src/teclado';
import { DIAS_PARA_REMEDIR_ESTRUTURAL } from './src/ajustes';
import { ANTERIORES, VOCABULARIO } from './web/dados';

/**
 * Entrada do app no aparelho.
 *
 * Ela existe para uma coisa que o harness nao consegue fazer: rodar as telas em cima
 * do React Native de verdade, com teclado de verdade e cursor de verdade. Os dados
 * ainda sao os de exemplo do harness — nada aqui fala com o Supabase, e a sessao nao
 * grava nada. Isto e a mesma sequencia, no aparelho.
 *
 * Os numeros de produto continuam sendo copia de product_settings, como no harness,
 * pelo mesmo motivo: ainda nao ha conexao com o banco. A copia mora em src/ajustes.ts,
 * uma so para o app inteiro.
 */

export default function App() {
  const esquema = useColorScheme();
  const [palette, setPalette] = useState<NomeDePaleta | null>(null);
  const { width } = useWindowDimensions();
  const alturaCoberta = useAlturaCobertaPorTeclado();

  // Sem escolha explicita, segue o aparelho. Trocar de paleta e um toque de dois dedos
  // sobre a tela, que existe so enquanto isto e o app de teste.
  const nome: NomeDePaleta = palette ?? (esquema === 'dark' ? 'noturno' : 'bandeira');
  const p = paleta(nome);

  const [indice, setIndice] = useState(0);
  const [respostas, setRespostas] = useState<ReadonlyMap<string, Answer>>(new Map());
  const [rascunho, setRascunho] = useState<ReadonlyMap<string, string>>(new Map());

  const plano = buildSessionPlan({
    vocabulary: VOCABULARIO,
    previous: ANTERIORES,
    now: new Date(),
    structuralRemeasureAfterDays: DIAS_PARA_REMEDIR_ESTRUTURAL,
    isBaseline: false,
  });

  const step = plano.steps[indice];
  const noFim = indice >= plano.steps.length;

  function valorDe(id: string, padrao: number | null): string {
    const r = rascunho.get(id);
    if (r !== undefined) return r;
    return padrao === null ? '' : padrao.toFixed(1).replace('.', ',');
  }

  function responder(resposta: Answer) {
    if (step === undefined) return;
    setRespostas(new Map(respostas).set(step.id, resposta));
    setIndice(indice + 1);
    if (indice + 1 >= plano.steps.length) Keyboard.dismiss();
  }

  const linhas: readonly LinhaDeRevisao[] = montarRevisao(plano, respostas);

  return (
    <SafeAreaView style={[estilos.raiz, { backgroundColor: cor(p, 'bg') }]}>
      <StatusBar barStyle={p.modo === 'dark' ? 'light-content' : 'dark-content'} />
      <View
        style={estilos.conteudo}
        // Dois dedos troca a paleta. Andaime de teste, nao mecanica de produto.
        onStartShouldSetResponder={(e) => e.nativeEvent.touches.length === 2}
        onResponderRelease={() => setPalette(nome === 'bandeira' ? 'noturno' : 'bandeira')}
      >
        {noFim ? (
          <MeasurementReview
            linhas={linhas}
            palette={nome}
            largura={width}
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
            palette={nome}
            largura={width}
            alturaCobertaPorTeclado={alturaCoberta}
            onChange={(v) => setRascunho(new Map(rascunho).set(step.id, v))}
            onConfirmar={() => {
              const bruto = valorDe(step.id, step.prefilled ? step.previousValue : null);
              const numero = Number(bruto.replace(',', '.'));
              if (bruto === '' || Number.isNaN(numero)) return;
              responder(
                rascunho.has(step.id) ? { kind: 'typed', value: numero } : { kind: 'kept' },
              );
            }}
            onPular={() => responder({ kind: 'skipped' })}
            onVoltar={() => setIndice(Math.max(0, indice - 1))}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function montarRevisao(
  plano: ReturnType<typeof buildSessionPlan>,
  respostas: ReadonlyMap<string, Answer>,
): readonly LinhaDeRevisao[] {
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
    const spec = VOCABULARIO.find((v) => v.key === s.key);
    if (spec === undefined) continue;
    const atual = porChave.get(s.key) ?? vazia(s.key, s.labelPtBr, s.unit, spec.bilateral);
    porChave.set(s.key, {
      ...atual,
      esquerdo: s.side === 'l' ? valor : atual.esquerdo,
      direito: s.side === 'r' ? valor : atual.direito,
      unico: s.side === 'na' ? valor : atual.unico,
      mantido: atual.mantido || resposta?.kind === 'kept',
    });
  }

  for (const c of plano.carried) {
    const spec = VOCABULARIO.find((v) => v.key === c.key);
    if (spec === undefined) continue;
    const atual = porChave.get(c.key) ?? vazia(c.key, spec.labelPtBr, spec.unit, spec.bilateral);
    porChave.set(c.key, {
      ...atual,
      esquerdo: c.side === 'l' ? c.value : atual.esquerdo,
      direito: c.side === 'r' ? c.value : atual.direito,
      unico: c.side === 'na' ? c.value : atual.unico,
      mantido: true,
    });
  }

  return [...porChave.values()];
}

function vazia(key: string, labelPtBr: string, unit: string, bilateral: boolean): LinhaDeRevisao {
  return {
    key,
    labelPtBr,
    unit,
    bilateral,
    esquerdo: null,
    direito: null,
    unico: null,
    mantido: false,
  };
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  conteudo: { flex: 1, paddingTop: Platform.OS === 'android' ? 24 : 0 },
});
