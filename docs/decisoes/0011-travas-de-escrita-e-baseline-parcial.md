# 0011 — Travas de escrita, e o baseline passa a abrir parcial

Data: 2026-08-16
Situação: aceita

## Contexto

A RLS responde "de quem é a linha". Ela não responde "esta coluna pode mudar depois de gravada",
e há colunas que o domínio trata como verdade e que o cliente escreve direto por PostgREST.
`provenance` é a principal: se ela puder virar `typed` depois, a regra do baseline cai por fora
sem encostar no gatilho.

Ao escrever o teste dessa trava, apareceu um defeito maior.

## O defeito que o teste encontrou

As duas funções de invalidação apagam de `proportion_ratios`, onde `authenticated` só tem
`SELECT`. Elas rodavam com os privilégios de quem invoca. Consequência: **qualquer `UPDATE` ou
`DELETE` de medida feito pelo app falhava** com `permission denied for table proportion_ratios`.
Corrigir um número digitado errado era impossível em produção.

A suíte não pegava porque as asserções de invalidação rodavam como superusuário, que ignora
privilégio. Um teste que roda com privilégio a mais que o código real prova menos do que parece
provar — e é o mesmo erro de método que `FORCE ROW LEVEL SECURITY` existe para evitar.

Corrigido com `SECURITY DEFINER`. Isso traz junto a obrigação de `search_path` vazio com
referência qualificada, que já estava em todas as funções e agora é **verificado por asserção**:
a suíte varre `pg_proc` e reprova qualquer função `SECURITY DEFINER` em `public` sem
`search_path=""`. Verificação por consulta ao catálogo não envelhece; conferência a olho sim.

## Decisão — travas de escrita

**`provenance` é imutável depois do insert.** Corrigir um número é legítimo; reescrever como ele
entrou não, porque ninguém mede retroativamente. Chave, lado e check-in também são identidade da
linha e não conteúdo dela. Implementado por privilégio de coluna: `authenticated` só tem
`UPDATE (value)` em `measurement_values`.

**`baselines` só aceita `UPDATE (effective_to)`.** Fechar o baseline vigente é ação da pessoa;
reapontá-lo para outro check-in seria trocar o denominador de toda a série por `UPDATE`, sem
passar pelo caminho de inserção.

**O cliente só pode registrar `self_declared` em `age_verification_events`.** Ele recebe a
declaração, então pode afirmá-la. Ele não pode afirmar que houve conferência de documento: isso é
evento de servidor. Sem a restrição, o registro mais forte do sistema seria escrito por quem está
sendo verificado.

### O limite honesto disto

Forjar `provenance` **no insert** não é impedível pelo banco, e não adianta fingir que é: o banco
não tem conhecimento independente de que um humano digitou. Um cliente adulterado pode gravar
`typed` em tudo.

O que muda com estas travas é o que importa: não existe caminho entre contas, e não existe
mutação depois do fato. A pessoa que forja no insert forja contra o próprio histórico, e o
prejuízo é dela. Isso não é o mesmo tipo de problema que vazamento entre contas, e tratar os dois
com a mesma linguagem confunde a prioridade.

## Decisão — baseline parcial

A regra anterior recusava abrir baseline enquanto qualquer medida variável estivesse mantida. Ela
protegia o denominador, e cobrava por isso a sessão mais longa que o app produz, exatamente no
momento em que a pessoa está começando um ciclo novo.

A consequência de segunda ordem é pior que o problema: se redefinir baseline for caro, ninguém
redefine, e a série inteira passa a ser comparada contra um baseline velho que já não descreve
aquele corpo. Isso é pior para a honestidade do produto do que o atrito que a regra evitava.

**A proteção muda de lugar.** O baseline abre com o que houver. O que fica proibido é um eixo
usar denominador que ninguém digitou:

- Gatilho de recusa em `baselines`: removido.
- `proportion_ratios` ganha `status = 'baseline_not_typed'` — o eixo espera, com motivo, e não
  vale zero.
- Restrição: eixo com `status = 'ok'` exige `reference_provenance = 'typed'`. O numerador pode
  ser mantido, e aí significa "a pessoa não remediu este eixo neste check-in"; o denominador não,
  porque é referência de todo o histórico.

No domínio, `buildSessionPlan` deixa de suprimir o pré-preenchimento em check-in de baseline, e
cada passo passa a carregar `keptLeavesAxisPending`. A tela diz, no próprio passo, que manter
aquele valor adia o eixo — enquanto ainda dá para medir.

## Consequências

`npm run db:test` sobe para 61 asserções. Quatro delas são as que faltavam: que o app consegue
corrigir e apagar uma medida, e que `SECURITY DEFINER` tem `search_path` fixo e vazio.

Itens de segurança que ficam para quando o app existir, e que não têm como ser fechados agora:
validação de upload de foto pelo conteúdo e não pelo `Content-Type` declarado; `select()` com
colunas explícitas em toda consulta; sessão em armazenamento seguro do sistema em vez de
armazenamento comum; limite de taxa e proteção contra bot no Auth. Estão listados no SECURITY.md
como pendentes, com dono, e não como se estivessem feitos.

## O que descartei

**Deixar `provenance` editável para o caso de correção.** Editar um valor mantido para um número
novo é digitar — mas o app não consegue distinguir isso de editar para o mesmo número, e a
distinção é justamente o que a coluna existe para registrar. Correção altera `value`; a
proveniência do ato original fica.

**Bloquear o insert forjado com verificação no servidor.** Não existe verificação possível. Ver
acima.
