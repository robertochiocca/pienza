import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { SessionStep } from '@pienza/domain';
import { cor, corDeAcao, escala, FAMILIA, paleta, type NomeDePaleta } from '../theme';

export interface MeasurementEntryProps {
  readonly step: SessionStep;
  readonly indice: number;
  readonly total: number;
  readonly valor: string;
  readonly mantido: boolean;
  readonly palette: NomeDePaleta;
  readonly largura: number;
  /**
   * Quanto do fundo desta tela o teclado esta cobrindo, em pontos.
   *
   * Um numero so, e nao um ramo por plataforma. No Android com `adjustResize` a
   * janela ja encolheu e o teclado nao cobre nada, entao vale 0; no iOS a janela nao
   * muda e o teclado fica por cima, entao vale a altura dele. Quem sabe disso e o
   * hook que escuta o teclado, nao o layout.
   */
  readonly alturaCobertaPorTeclado: number;
  readonly onChange: (valor: string) => void;
  readonly onConfirmar: () => void;
  readonly onPular: () => void;
  readonly onVoltar: () => void;
}

/**
 * Um passo da sequencia guiada. Uma medida, um lado, uma tela.
 *
 * Nao ha botao primario. O numero e o maior elemento e e conteudo; um botao de
 * confirmar seria o segundo elemento mais forte disputando com ele, e faria apenas o
 * que a tecla de retorno do teclado numerico ja faz.
 *
 * A acao de texto "confirmar" no rodape existe desde o primeiro dia, e nao como
 * correcao posterior: no Android o comportamento da tecla de retorno varia com o
 * teclado que o fabricante instalou, e detectar fabricante para decidir layout e pior
 * que ter sempre os dois caminhos. Ela tem o mesmo peso de "pular" — texto, nao botao.
 */
export function MeasurementEntry(props: MeasurementEntryProps) {
  const p = paleta(props.palette);
  const s = escala(props.largura);
  const estilos = useMemo(() => criarEstilos(props.largura), [props.largura]);

  const rotulo = props.step.keptLeavesAxisPending
    ? `${props.step.labelPtBr.toUpperCase()} — MEDIR`
    : props.step.labelPtBr.toUpperCase();

  const anterior =
    props.step.previousValue !== null
      ? `anterior ${formatar(props.step.previousValue)}`
      : props.step.keptLeavesAxisPending
        ? 'manter deixa o eixo esperando'
        : '';

  const unidade = props.mantido ? `${props.step.unit} · mantida` : props.step.unit;

  return (
    <View style={[estilos.tela, { backgroundColor: cor(p, 'bg') }]}>
      {/* Faixa de vaos: recuada a esquerda, sangrando pela direita. Conta passos
          DENTRO da sessao. Nao persiste, nao conta sessoes, nao acumula nada entre
          check-ins — no segundo em que fizer isso, vira contador de continuidade.
          gate-mecanicas: permitido o termo aparece aqui para nomear o que esta
          proibido neste componente, e nao para descrever o que ele faz */}
      <View style={estilos.vaos}>
        {Array.from({ length: props.total }, (_, i) => (
          <View
            key={i}
            style={[
              estilos.vao,
              {
                backgroundColor:
                  i < props.indice
                    ? cor(p, 'grafite')
                    : i === props.indice
                      ? cor(p, 'brand')
                      : cor(p, 'line'),
              },
            ]}
          />
        ))}
      </View>

      <Text
        style={[
          estilos.rotulo,
          { color: cor(p, 'text-2'), fontSize: s.rotulo, fontFamily: FAMILIA.mono },
        ]}
      >
        {rotulo}
      </Text>

      <View style={estilos.blocoNumero}>
        <TextInput
          value={props.valor}
          onChangeText={props.onChange}
          onSubmitEditing={props.onConfirmar}
          keyboardType="decimal-pad"
          returnKeyType="next"
          // Sem placeholder. Um travessao no corpo do numero — 105pt em serifada — e
          // uma barra horizontal larga e clara, e no aparelho ela le como barra de
          // carregamento e nao como campo vazio. O que diz que ali se digita e a regua
          // vermelha embaixo, mais o cursor, que existe no aparelho e nao no harness.
          style={[
            estilos.numero,
            {
              color: cor(p, 'text'),
              fontSize: s.numero,
              lineHeight: Math.round(s.numero * 1.02),
              fontFamily: FAMILIA.numero,
            },
          ]}
        />
        {/* A regua tem a largura do numero e nao a da tela: e ela que diz "e este
            valor que voce esta mexendo agora", sem escrever isso. */}
        <View style={[estilos.regua, { backgroundColor: cor(p, 'brand') }]} />
        <Text
          style={[
            estilos.unidade,
            { color: cor(p, 'text-2'), fontSize: s.rotulo, fontFamily: FAMILIA.mono },
          ]}
        >
          {unidade}
        </Text>
      </View>

      {anterior !== '' ? (
        <Text style={[estilos.anterior, { color: cor(p, 'text-2'), fontSize: s.corpo }]}>
          {anterior}
        </Text>
      ) : null}

      {/* O rodape sobe o tanto que o teclado cobre. Sem isto, no iOS as tres unicas
          acoes da tela ficam embaixo do teclado e o avanco depende inteiramente da
          tecla de retorno — que e justamente o caminho que eu registrei no ciclo
          passado como incerto no Android. Sobraria uma tela sem saida garantida em
          nenhuma das duas plataformas. */}
      <View style={[estilos.rodape, { marginBottom: props.alturaCobertaPorTeclado }]}>
        <Pressable onPress={props.onVoltar} accessibilityRole="button">
          <Text style={{ color: cor(p, 'text-2'), fontSize: s.corpo }}>voltar</Text>
        </Pressable>
        <View style={estilos.acoesDireita}>
          <Pressable onPress={props.onPular} accessibilityRole="button">
            <Text style={{ color: cor(p, 'text-2'), fontSize: s.corpo }}>pular</Text>
          </Pressable>
          <Pressable onPress={props.onConfirmar} accessibilityRole="button">
            <Text style={{ color: corDeAcao(p), fontSize: s.corpo }}>confirmar</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function formatar(valor: number): string {
  return valor.toFixed(1).replace('.', ',');
}

function criarEstilos(largura: number) {
  const margem = Math.round(largura * 0.08);
  return StyleSheet.create({
    tela: { flex: 1 },
    vaos: {
      flexDirection: 'row',
      gap: 3,
      marginTop: Math.round(largura * 0.07),
      marginLeft: margem,
    },
    vao: { height: 3, flex: 1 },
    rotulo: { letterSpacing: 1.2, marginTop: Math.round(largura * 0.13), marginLeft: margem },
    // O numero comeca a 30% da largura, e nao na margem do rotulo. Nenhuma linha
    // vertical alinha os dois, e a tensao contra a grade e proposital.
    blocoNumero: { marginTop: Math.round(largura * 0.02), marginLeft: Math.round(largura * 0.3) },
    numero: { letterSpacing: -1, padding: 0, margin: 0 },
    regua: { height: 2, width: Math.round(largura * 0.4), marginTop: Math.round(largura * 0.02) },
    unidade: { letterSpacing: 1, marginTop: Math.round(largura * 0.025) },
    anterior: { marginTop: Math.round(largura * 0.06), marginLeft: margem },
    rodape: {
      marginTop: 'auto',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: margem,
      paddingBottom: Math.round(largura * 0.07),
    },
    acoesDireita: { flexDirection: 'row', gap: Math.round(largura * 0.06) },
  });
}
