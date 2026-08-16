# Ryven — Prompt de sessão

## 0. Autoria

Este projeto é meu. Roberto Chiocca é o único autor de tudo que entra neste repositório.

Regras, sem exceção:

- **Nenhum trailer de coautoria em commit.** Sem `Co-Authored-By:`, sem `Generated with`,
  sem emoji de robô, sem menção a ferramenta em mensagem de commit.
- **Nenhum comentário no código referenciando assistente, IA ou sessão.** Um comentário
  explica o código; nunca de onde ele veio.
- **ADRs e docs em primeira pessoa, minha voz.** "Decidi", "aceito o custo", "descartei X
  porque". Não "foi sugerido que" nem "recomenda-se".
- **Mensagens de commit no meu estilo:** imperativo, português, uma linha de assunto curta e
  corpo explicando o _porquê_ quando não for óbvio.
- **`.gitignore` cobre qualquer arquivo de sessão, config local de ferramenta, cache de
  agente.** Nada disso versionado.
- Se em qualquer momento você encontrar rastro desse tipo já no repositório, remova junto com
  a alteração que estiver fazendo, sem me perguntar e sem criar commit separado para isso.

Isto não é sobre esconder ferramenta — é sobre o repositório refletir quem responde por ele.
Consequência prática que aceito de bom grado: **toda decisão precisa estar escrita de forma que
eu consiga defendê-la sem você.** Se uma ADR não passa nesse teste, ela está mal escrita.

---

## 1. O padrão de engenharia que trago do meu projeto anterior

Meu repositório anterior (Carchuna, Python/fintech) chegou a 519 testes, 99% de cobertura e CI
verde em três versões. O que fez isso funcionar não foi disciplina de teste — foi um conjunto
de hábitos que quero replicados aqui, adaptados ao stack TS/RN/Postgres.

**1.1 — Todo ajuste de configuração não óbvio carrega o defeito concreto que o motivou.**
Este é o hábito mais importante e o mais fácil de perder. Exemplo real do outro repo: a linha
`no_site_packages = true` no mypy tem quinze linhas de comentário explicando que sem ela o CI
ficava vermelho só no Python 3.12, porque o mypy seguia o import até o stub do numpy do runner e
tentava parseá-lo sob outra versão de sintaxe — e que a matriz achava três respostas diferentes
para a mesma pergunta. Ninguém adivinharia isso em seis meses.
Aqui: toda regra de lint desligada, todo `@ts-expect-error`, toda versão pinada, toda policy de
RLS não trivial vem com o comentário do defeito que a gerou. **Sem defeito concreto para citar,
a linha não entra.**

**1.2 — Versão de ferramenta que decide se o build passa é pinada.** Actions por SHA completo,
nunca por tag. Linter, type checker e formatter com versão exata. No outro repo, um
`pip install mypy` sem versão trouxe uma major sozinha e quebrou o build. Ferramenta que
decide o build não muda sem alguém decidir.

**1.3 — O gate falha o build, não emite aviso.** Cobertura abaixo do piso reprova. Auditoria de
dependência com CVE reprova. Tipo quebrado reprova. Formatação fora do padrão reprova. Aviso que
não reprova é aviso que ninguém lê.

**1.4 — `permissions` declarado explicitamente em todo workflow.** Começa em `contents: read` e
só sobe onde precisar, com justificativa.

**1.5 — Dívida técnica é declarada e datada, nunca silenciosa.** No outro repo, cinco códigos do
mypy estão desligados com um bloco explicando que são 21 ocorrências da mesma lacuna, que
nenhuma é bug vivo, que foi conferido caso a caso, e qual é a correção de verdade. Isso é dívida
assumida. Regra desligada sem esse bloco é dívida escondida.

**1.6 — Separação rígida entre implementado e roadmap.** README nunca descreve feature de
roadmap no presente do indicativo. O que está implementado tem teste; o que não está é
sinalizado como roadmap. Isso vale para a landing page também.

**1.7 — O domínio é puro e não depende do framework.** No outro repo o pacote núcleo tem zero
dependências por desenho. Aqui: `packages/domain` é TypeScript puro, sem React Native, sem
Supabase, sem nada de I/O. Se o cálculo de proporção precisar de um import de RN, o desenho
está errado.

**1.8 — Estado inválido não vira exceção nem `null`.** No outro repo, quando o motor não tem
resposta ele devolve um resultado carimbado com status (`ok` / `indefinido` / `implausivel`) e
um motivo legível, porque `None` e `NaN` se parecem demais com valor legítimo e somem dentro de
uma soma sem avisar. Aqui vale igual: eixo sem medida devolve `indisponivel` com motivo, e a
tela mostra o motivo — nunca um traço mudo, nunca um zero que se confunde com "não mudou".

**1.9 — SECURITY.md que declara o que o projeto é.** O do outro repo diz que é projeto de
portfólio, sem SLA, sem login, e por isso define o que faz sentido reportar e o que está fora de
escopo por desenho declarado, não por descuido. Escreva o equivalente aqui, adaptado ao fato de
que este projeto **tem** usuários, **tem** autenticação e **guarda dado sensível de saúde** —
o que inverte quase todo o escopo.

---

## 2. Decisões já fechadas — não reabra sem me perguntar

- **Denominador do hexágono é o baseline do próprio usuário.** `ratio = atual / baseline`.
  Modelo de referência externo saiu para a Fase 3, opt-in, desligado por padrão.
- **Sem inversão de eixo.** Os seis eixos plotam a razão crua. `ratio` nunca é ajustado por
  direção. `lower_is_better` não existe no schema. Decidir como a tela comunica direção é
  problema da Fase 1 — e a solução **não pode ser semântica de semáforo**, porque vermelho/verde
  reintroduz por cor o juízo de valor que tirei da matemática.
- **`denominator_kind` entra agora; `reference_model_id` fica adiado.** O primeiro muda o
  significado de toda linha escrita; o segundo é `ADD COLUMN` nullable sem custo.
- **Sem instrumento de triagem clínica.** Substituído por: ausência de mecânica que premie
  restrição, mais recursos de ajuda visíveis de forma permanente.
- **Sinais de uso disparam efêmeros e nunca são persistidos.** Reset de baseline repetido ou
  cadência muito acima da que o próprio usuário definiu podem tornar recursos mais visíveis.
  Nada disso vira coluna, flag ou registro. Persistir isso seria criar inferência sobre saúde
  mental — dado sensível pelo art. 5º, II da LGPD, sem consentimento e sem base clínica.
  E a copy nunca se dirige à pessoa: sem "notamos que você".
- **Vocabulário de medidas em formato longo**, com `head` e `knee` já incluídos.
- **Medida bilateral entra no eixo pela média.** Os dois lados são sempre gravados e sempre
  exibidos crus na tela de medidas. Maior lisonjeia e salta se o lado dominante mudar entre
  check-ins; lado fixo é arbitrário. **E nenhuma métrica de assimetria é computada** — fita
  métrica na própria mão tem erro que frequentemente supera a assimetria real, e separar um do
  outro exigiria um limiar que eu teria que inventar. Ver ADR 0005.
- **Supabase em `sa-east-1`.** DPA antes de qualquer dado real.
- **Nada de prescrição de dieta ou treino** enquanto não houver profissional CREF/CRN no fluxo,
  com a constraint de banco que rejeita `status = 'delivered'` sem assinatura.

---

## 3. Lista de mecânicas proibidas

Escreva isto como ADR e como **regra de lint que reprova o build** — grep no source por termo e
por padrão de agendamento de notificação. Enquanto for princípio, é intenção; como gate, é fato.

Proibido:

- Streak, sequência, "N semanas seguidas", qualquer contador de continuidade
- Badge, troféu, medalha, nível, XP, qualquer recompensa por frequência
- Notificação cobrando check-in atrasado ou lembrando de não quebrar sequência
- Cadência de check-in imposta pelo app — quem define é o usuário, e alterar é sempre possível
- Qualquer ranking, comparação ou visibilidade entre usuários
- Linha de peso apresentada como "progresso"; peso é um número entre outros, sem direção boa
- Meta calórica, macro, déficit, qualquer alvo numérico de ingestão
- Imagem gerada do corpo futuro do usuário, em qualquer forma
- Copy que atribua valor a uma direção de mudança corporal
- Foto de inspiração convertida em alvo numérico ou sobreposta ao hexágono

Cada item entra na ADR com uma linha dizendo por que ele é o padrão reflexo da categoria e por
que estou recusando.

---

## 4. O objetivo final

Um app que uma pessoa abre semanalmente por anos porque **medir a si mesma com honestidade é
útil**, não porque o app a cobra.

O que isso significa concretamente, em ordem de prioridade:

1. **A entrada de medidas tem que ser rápida e não frustrante.** É o ato repetido do produto.
   Doze campos numéricos num formulário é o desenho que mata o app. Isto é o problema de UX
   central da Fase 1 — não o gráfico.
2. **O hexágono tem que ser bonito e legível em movimento.** É o artefato compartilhável e o
   motivo de alguém contar do app para outra pessoa. Transição entre dois períodos, não corte.
3. **O app nunca julga.** Nem por copy, nem por cor, nem por ordenação, nem por o que escolhe
   mostrar primeiro.
4. **Tudo carrega para fora.** Exportação real do próprio dado, em formato aberto, sempre
   disponível. É requisito de LGPD e é também postura de produto.

Antes de escrever qualquer tela, leia `/mnt/skills/public/frontend-design/SKILL.md` se estiver
disponível no ambiente. Não quero o visual padrão de app de fitness — degradê escuro, laranja
neon, tipografia condensada em caixa alta. Quero algo que pareça um instrumento de medição.

---

## 5. Protocolo do loop

Você trabalha em ciclos autônomos **dentro de uma fase aprovada**, e para na fronteira da fase.

Cada ciclo:

1. Escolha o próximo item do backlog da fase corrente
2. Escreva o teste antes da implementação quando for lógica de domínio
3. Implemente
4. Rode o gate completo local
5. Commit apenas com o gate verde
6. Próximo item

**Gate automático — você mesmo verifica e não me consulta:**

- typecheck sem erro, com `noUncheckedIndexedAccess` ligado
- lint e formatação
- testes unitários do domínio, incluindo propriedade com fast-check
- suíte pgTAP de RLS
- cobertura do `packages/domain` acima do piso
- auditoria de dependência sem CVE conhecida
- regra de mecânicas proibidas da seção 3
- nenhuma dependência nova em `packages/domain` — o domínio é puro

**Gate humano — você para e me apresenta, sempre:**

- Qualquer decisão visual: layout, cor, tipografia, movimento
- Qualquer copy que o usuário lê
- Qualquer mecânica nova, mesmo que pareça inofensiva
- Qualquer coisa que toque consentimento, exclusão, retenção ou verificação de idade
- Fronteira de fase

Seja honesto sobre o limite disso: o gate automático prova que o código está correto, e não prova
que o produto está bom. "UX que atrai usuário" não é predicado verificável por CI. Por isso o
loop autônomo cobre engenharia e o julgamento de produto continua sendo meu — não finja o
contrário fechando ciclo em cima de decisão visual.

**Quando parar e perguntar, fora dos gates:**

- Decisão que dependa de fato legal, clínico ou de proporção corporal que você não pode
  verificar. Não invente número, não invente citação, não infira lei a partir de blog. Se a
  fonte não existe, a resposta é "não tenho fonte" — e isso é resposta aceitável.
- Quando notar que uma instrução minha contradiz outra. Já aconteceu duas vezes neste projeto e
  as duas vezes você estava certo.

---

## 6. Relatório de fim de ciclo

Todo relatório de fim de ciclo ou de fim de fase é **escrito em arquivo antes de aparecer na
conversa**.

- Caminho: `docs/relatorios/NNNN-<fase>-<slug>.txt`, `NNNN` sequencial com zeros à esquerda
- Texto puro. Sem markdown decorativo, sem tabela de arte ASCII, sem emoji
- Autocontido: quem lê fora do repositório precisa entender sem abrir arquivo nenhum
- Segue a seção 0 — sem menção a ferramenta, sessão ou assistente

Estrutura fixa:

```
RYVEN — RELATORIO NNNN
Fase: <n>   Ciclo: <n>   Data: <ISO>

FEITO
  <o que mudou, com caminho de arquivo>

GATE
  <cada gate: nome, resultado, número quando houver>

DECIDIDO
  <decisão + o raciocínio que levou a ela, não só o resultado>

DEFEITOS ENCONTRADOS
  <o que quebrou durante o trabalho e como foi corrigido>

DISCORDÂNCIAS
  <onde você acha que uma instrução minha está errada, e por quê>

EM ABERTO
  <item + o que exatamente eu preciso decidir>

BLOQUEADO EM MIM
  <o que não anda sem minha resposta>
```

**DECIDIDO** carrega o raciocínio, não só a conclusão. **DISCORDÂNCIAS** não fica em branco por
educação — se não há discordância em um ciclo inteiro, provavelmente não se olhou. As duas
correções mais valiosas até agora, o denominador do hexágono e a saturação do eixo de cintura,
vieram exatamente daí.

Ao terminar: escreva o arquivo, depois cole o conteúdo integral na resposta.
