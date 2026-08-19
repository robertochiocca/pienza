# 0006 — O projeto se chama Pienza

Data: 2026-08-16
Situação: aceita

## Contexto

**Este projeto se chamou Ryven até o fim da Fase 0.** Registro isso aqui de propósito: quem abrir
o histórico vai encontrar o nome antigo em commits, no primeiro relatório e no nome do
repositório, e precisa saber que foi renomeação e não outro projeto.

Renomeei agora por um motivo que tem prazo: **bundle identifier é imutável depois da publicação
nas lojas.** Trocar antes de existir `app.json` custa uma linha; trocar depois custa um app novo,
com os usuários no antigo.

## Decisão

Pienza é a cidade toscana que Bernardo Rossellino redesenhou para Pio II — a primeira aplicação
construída de uma teoria renascentista de proporção, materializada em escala humana em vez de
enunciada como ideal abstrato.

A propriedade que define o lugar é a tese do app, que é a mesma lógica de nomenclatura do meu
projeto anterior. E ela casa exatamente com a decisão que estrutura o produto: o hexágono mede
proporção contra o próprio corpo, sem ideal externo no denominador (ADR 0001). Proporção em
escala humana, não proporção como padrão a atingir.

O que mudou, em ordem de importância:

1. `apps/mobile/app.json` — identificador `com.robertochiocca.pienza`, `slug` e `scheme` `pienza`
2. `package.json` de todos os workspaces, incluindo o escopo `@pienza/domain`
3. `supabase/config.toml`, variável de ambiente `PIENZA_DB_MODO`, nome do banco descartável
4. README, SECURITY.md, ADRs, AGENTS.md

O que **não** mudou:

- **O histórico não foi reescrito por causa do nome.** A reescrita anterior existiu para remover
  atribuição de autoria indevida, que é um erro. O projeto se chamou Ryven — isso aconteceu, e
  esta ADR é o registro. Reescrever para apagar seria falsificar.
- `docs/relatorios/0001-fase-0-encerramento.txt` fica como está, pelo mesmo motivo.
- O `project ref` do Supabase, que é fixo, não renomeia e não é visível ao usuário. Só o nome de
  exibição muda.

## Consequências

Gate em `scripts/gate-nome-antigo.mjs`, no `npm run check` e no CI, reprovando o nome antigo em
qualquer arquivo fora da allowlist. A allowlist contém esta ADR, o relatório 0001, o CHANGELOG e
o próprio script.

A allowlist é a parte que faz o gate durar. O nome antigo **precisa** aparecer no registro
histórico; um gate que reprova o próprio registro é desligado na terceira falha falsa. Por isso
ela é fechada e explícita: arquivo novo nasce com o nome novo, e um documento futuro que precise
citar o nome antigo entra na lista por decisão, não por padrão.

O script também reprova entrada de allowlist que aponte para arquivo inexistente. Allowlist com
lixo dentro é o começo de uma allowlist grande demais para alguém ler.

## O que descartei

**Adiar a renomeação para depois do MVP.** O item que trava é o bundle identifier, e ele deixa de
ser reversível na primeira publicação. Nome errado em README custa um sed; nome errado no
identificador custa migrar usuário.

**Renomear também no histórico.** Ver acima. E, depois do que a última reescrita revelou sobre
`--force-with-lease` (ADR 0008), uma terceira passada por motivo cosmético não paga o risco.
