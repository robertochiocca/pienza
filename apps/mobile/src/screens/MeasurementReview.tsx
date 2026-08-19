import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  cor,
  corDeAcao,
  escala,
  familia,
  paleta,
  type NomeDeFonte,
  type NomeDePaleta,
} from '../theme';
import { formatar } from './MeasurementEntry';

export interface LinhaDeRevisao {
  readonly key: string;
  readonly labelPtBr: string;
  readonly unit: string;
  /**
   * Se a medida e de membro par. Vem do vocabulario e nao e inferida dos valores.
   *
   * Eu tinha deduzido isso de `unico === null`, o que da a resposta certa so enquanto
   * ninguem pula nada: cintura pulada tambem tem `unico` nulo, e a tela mostrava
   * cintura esquerda e cintura direita. Ausencia de dado nao diz que forma o dado
   * teria.
   */
  readonly bilateral: boolean;
  /** `null` quando o passo foi pulado. Ausente e ausente; nunca zero. */
  readonly esquerdo: number | null;
  readonly direito: number | null;
  /** Medida sem lado. */
  readonly unico: number | null;
  readonly mantido: boolean;
}

export interface MeasurementReviewProps {
  readonly linhas: readonly LinhaDeRevisao[];
  readonly palette: NomeDePaleta;
  /** Conjunto tipografico. `generico` ate alguem escolher a face. */
  readonly fonte?: NomeDeFonte;
  readonly largura: number;
  readonly onVoltar: () => void;
  readonly onGravar: () => void;
}

/**
 * Fecho da sessao. Mostra o que vai ser gravado antes de gravar.
 *
 * Medida bilateral aparece com os dois lados e a diferenca crua, sem adjetivo: nem
 * "assimetria", nem faixa de normalidade, nem seta. A media e o que vai para o eixo —
 * decisao da ADR 0005 — e a diferenca fica visivel porque a media a esconde, e
 * esconder um dado que a pessoa acabou de medir com as proprias maos e pior que
 * mostrar um numero que ela nao sabe interpretar.
 *
 * Sem interpretacao tambem quer dizer: sem limiar embutido. Nao existe aqui um
 * numero a partir do qual a diferenca "importa" — isso seria criterio clinico, e
 * criterio clinico neste repositorio exige fonte e revisao que nao existem.
 */
export function MeasurementReview(props: MeasurementReviewProps) {
  const p = paleta(props.palette);
  const s = escala(props.largura);
  const FAMILIA = familia(props.fonte ?? 'generico');
  const estilos = useMemo(() => criarEstilos(props.largura), [props.largura]);

  return (
    <View style={[estilos.tela, { backgroundColor: cor(p, 'bg') }]}>
      <Text
        style={[
          estilos.titulo,
          { color: cor(p, 'text-2'), fontSize: s.rotulo, fontFamily: FAMILIA.mono },
        ]}
      >
        ANTES DE GRAVAR
      </Text>

      <ScrollView style={estilos.lista} contentContainerStyle={estilos.listaConteudo}>
        {props.linhas.map((linha) => (
          <Linha key={linha.key} linha={linha} p={p} s={s} f={FAMILIA} estilos={estilos} />
        ))}
      </ScrollView>

      <View style={estilos.rodape}>
        <Pressable onPress={props.onVoltar} accessibilityRole="button">
          <Text style={{ color: cor(p, 'text-2'), fontSize: s.corpo }}>voltar</Text>
        </Pressable>
        <Pressable onPress={props.onGravar} accessibilityRole="button">
          <Text style={{ color: corDeAcao(p), fontSize: s.corpo }}>gravar</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Linha(props: {
  readonly linha: LinhaDeRevisao;
  readonly p: ReturnType<typeof paleta>;
  readonly s: ReturnType<typeof escala>;
  readonly f: ReturnType<typeof familia>;
  readonly estilos: ReturnType<typeof criarEstilos>;
}) {
  const { linha, p, s, f: FAMILIA, estilos } = props;

  const diferenca =
    linha.esquerdo !== null && linha.direito !== null
      ? Math.abs(linha.esquerdo - linha.direito)
      : null;

  return (
    <View style={estilos.linha}>
      <View style={estilos.linhaTopo}>
        <Text
          style={[
            estilos.linhaRotulo,
            { color: cor(p, 'text-2'), fontSize: s.rotulo, fontFamily: FAMILIA.mono },
          ]}
        >
          {linha.labelPtBr.toUpperCase()}
          {linha.mantido ? ' · MANTIDA' : ''}
        </Text>
      </View>

      {linha.bilateral ? (
        <View style={estilos.lados}>
          <Lado
            nome="esq"
            valor={linha.esquerdo}
            unidade={linha.unit}
            p={p}
            s={s}
            f={FAMILIA}
            e={estilos}
          />
          <Lado
            nome="dir"
            valor={linha.direito}
            unidade={linha.unit}
            p={p}
            s={s}
            f={FAMILIA}
            e={estilos}
          />
        </View>
      ) : (
        <Text
          style={[
            estilos.valor,
            estilos.valorUnico,
            {
              color: linha.unico === null ? cor(p, 'text-2') : cor(p, 'text'),
              fontSize: Math.round(s.numero * 0.28),
              fontFamily: FAMILIA.numero,
            },
          ]}
        >
          {linha.unico === null ? 'pulada' : `${formatar(linha.unico)} ${linha.unit}`}
        </Text>
      )}

      {/* Diferenca crua, sem juizo. Aparece so quando ha os dois lados: com um lado
          pulado nao ha diferenca a calcular, e escrever "—" ali insinuaria que ha. */}
      {diferenca !== null ? (
        <Text style={[estilos.diferenca, { color: cor(p, 'text-2'), fontSize: s.rotulo }]}>
          diferença {formatar(diferenca)} {linha.unit}
        </Text>
      ) : null}

      <View style={[estilos.regra, { backgroundColor: cor(p, 'line') }]} />
    </View>
  );
}

function Lado(props: {
  readonly nome: string;
  readonly valor: number | null;
  readonly unidade: string;
  readonly p: ReturnType<typeof paleta>;
  readonly s: ReturnType<typeof escala>;
  readonly f: ReturnType<typeof familia>;
  readonly e: ReturnType<typeof criarEstilos>;
}) {
  const { nome, valor, unidade, p, s, f: FAMILIA, e } = props;
  return (
    <View style={e.lado}>
      <Text
        style={[
          e.ladoNome,
          { color: cor(p, 'text-2'), fontSize: s.rotulo, fontFamily: FAMILIA.mono },
        ]}
      >
        {nome}
      </Text>
      <Text
        style={[
          e.valor,
          {
            color: valor === null ? cor(p, 'text-2') : cor(p, 'text'),
            fontSize: Math.round(s.numero * 0.28),
            fontFamily: FAMILIA.numero,
          },
        ]}
      >
        {valor === null ? 'pulada' : formatar(valor)}
      </Text>
      {/* Sem valor nao ha unidade. "pulada cm" descreve a unidade de uma medida que
          nao existe, e a linha fica parecendo um dado incompleto em vez de um dado
          ausente. */}
      {valor === null ? null : (
        <Text style={[e.ladoUnidade, { color: cor(p, 'text-2'), fontSize: s.rotulo }]}>
          {unidade}
        </Text>
      )}
    </View>
  );
}

function criarEstilos(largura: number) {
  const margem = Math.round(largura * 0.08);
  return StyleSheet.create({
    tela: { flex: 1 },
    titulo: {
      letterSpacing: 1.2,
      marginTop: Math.round(largura * 0.13),
      marginLeft: margem,
    },
    lista: { flex: 1, marginTop: Math.round(largura * 0.06) },
    listaConteudo: { paddingBottom: Math.round(largura * 0.06) },
    linha: { marginBottom: Math.round(largura * 0.05) },
    linhaTopo: { marginLeft: margem },
    linhaRotulo: { letterSpacing: 1.2 },
    lados: { flexDirection: 'row', marginLeft: margem, gap: Math.round(largura * 0.12) },
    lado: {},
    ladoNome: { letterSpacing: 1, marginTop: Math.round(largura * 0.015) },
    ladoUnidade: { marginTop: Math.round(largura * 0.005) },
    valor: { marginTop: Math.round(largura * 0.005), letterSpacing: -0.5 },
    // A medida sem lado nao passa pelo bloco de lados, que ja carrega a margem, e sem
    // isto ela encostava na borda esquerda da tela.
    valorUnico: { marginLeft: margem },
    diferenca: { marginLeft: margem, marginTop: Math.round(largura * 0.02) },
    regra: { height: 1, marginTop: Math.round(largura * 0.04), marginLeft: margem },
    rodape: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: margem,
      paddingTop: Math.round(largura * 0.03),
      paddingBottom: Math.round(largura * 0.07),
    },
  });
}
