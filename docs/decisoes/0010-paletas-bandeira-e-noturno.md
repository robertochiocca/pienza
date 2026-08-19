# 0010 — Bandeira e Noturno, e o matiz único como trava

Data: 2026-08-16
Situação: aceita

## Contexto

A proposta anterior era pedra fria e latão. Rodei as opções renderizadas e ela não sobreviveu ao
teste de ver. O raciocínio que a gerou continua valendo — Pienza é o levantamento, não a
paisagem — mas a paleta mudou.

A proposta descartada tinha uma propriedade que eu não quero perder: ela protegia a proibição de
semáforo **por construção**, porque havia um acento só e ele já tinha dono. Perdi essa proteção
ao trocar de paleta, e recuperei por outro caminho, mais forte.

## Decisão

**Light: Bandeira. Dark: Noturno.** Mesma distribuição nas duas — vermelho como cromo, preto e
branco carregando o resto. Os valores estão em `packages/tokens/src/palettes.json`, que é a
fonte única.

### O matiz único é a trava

**O conjunto tem exatamente um matiz cromático:** vermelho, mais neutros. Isso não é economia
estética, é a proteção estrutural contra semáforo. Não existe segunda cor com que montar o par
verde/vermelho.

Três regras, todas com gate em `scripts/gate-cores.mjs`:

1. Um matiz cromático no conjunto inteiro. Um segundo exige ADR datada.
2. **Nenhum verde, em nenhuma circunstância.** Um único verde reconstrói o par sozinho, porque
   quem olha completa. O gate recusa a faixa 75–165° nominalmente, além da contagem.
3. Nenhum literal de cor fora do arquivo de tokens — é por aí que um segundo matiz entraria sem
   passar por decisão nenhuma.

### O botão do dark é o inverso do light, e isso é obrigatório

Light: fundo `brand`, texto branco — 4.87.
Dark: fundo `brand`, texto `#0D0B0A` — 5.07.

Branco sobre o vermelho do dark dá **3.87 e reprova AA**. O quase-preto é o único que passa. A
inversão parece estranha e é exatamente o tipo de coisa que alguém "corrige" depois; por isso o
motivo está escrito no próprio token e o gate reprova o build se alguém trocar.

### Preto puro não é o fundo

`#DA291C` sobre `#000000` dá 4.32 e reprova. E vermelho saturado sobre preto puro causa halação
em OLED — o texto parece vibrar. `#0D0B0A` lê como preto e não faz isso.

### Direção sem juízo, refinado

Eu tinha escrito que nenhum dado é vermelho. Com estas paletas isso deixa de ser exato, porque o
polígono atual do hexágono é vermelho. Refino:

- **Vermelho pode marcar qual série é a atual.** É identidade temporal — "este é você agora" — e
  não juízo.
- **Vermelho nunca varia em função de sinal, magnitude ou direção.** Não escurece quando sobe,
  não clareia quando desce, não muda de saturação.
- **Direção é carregada por preenchimento, não por matiz:** vértice subiu = preenchido, desceu =
  vazado, sem mudança relevante = `grafite`. Mesma cor nos dois casos.

O motivo de segurar isto: o app nunca perguntou qual é o objetivo da pessoa. Cintura subindo é o
resultado indesejado de quem cortou e o resultado desejado de quem está em bulking ou em
recuperação. Cor que diz "isso foi ruim" é o app afirmando uma falha numa meta que ele nunca
soube qual era.

### O que não entra

O que faz interface parecer feita às pressas não é ser simples — é um conjunto específico:
degradê, glassmorphism, brilho, cantos muito arredondados, tudo centralizado, sombra em tudo,
emoji em título. Branco-vermelho-preto com contenção não cai nisso; com degradê e brilho, cai na
hora.

Portanto: sem degradê, sem sombra difusa, sem brilho, sem vidro. Preenchimento chapado, raio de
canto 4px, hierarquia por tamanho e peso, estrutura por fio de 1px em vez de cartão cinza,
layout assimétrico.

## Consequências

Os treze valores de contraste declarados foram recalculados e conferem exatamente. O gate
recalcula a cada build, porque contraste conferido a olho envelhece: alguém escurece um token
dois pontos para "ficar melhor" e o botão passa a reprovar sem ninguém perceber.

Cada token declara o papel que exerce — `texto`, `grafico`, `decorativo` — e é cobrado no limiar
daquele papel. `grafite` no Noturno dá 3.54: passa como traço de gráfico e **nunca** como texto,
e é o próprio arquivo que diz isso.

Nota de ajuste que aceito de antemão: na Bandeira o elemento mais forte da tela tende a ser o
botão, não o número. Se ao ver rodando isso incomodar, o ajuste é subir o tamanho do número —
não mudar cor.

## O que descartei

**Pedra fria e latão.** Não sobreviveu ao teste de ver, que é o único que vale para paleta.

**Um segundo matiz para estados de sistema** (erro, aviso). Erro é texto e contorno, não cor
nova. No dia em que isso não bastar, é ADR.
