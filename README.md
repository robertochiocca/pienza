# Ryven

Your body. Your data. Your evolution.

Acompanhamento de composição e proporção corporal. A pessoa registra medidas, faz check-ins na
cadência que ela escolher, e vê a própria mudança comparada **com ela mesma** — nunca com outra
pessoa e nunca com um ideal externo.

---

## Estado do projeto

**Fase 0 — Fundação. Em andamento.** Não existe aplicativo ainda.

Este README separa o que existe do que está planejado. Nada da seção Roadmap está implementado.

---

## Implementado

- Monorepo com npm workspaces e TypeScript estrito (`noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`)
- `packages/domain`: unidades canônicas cm/kg, conversão métrico/imperial e arredondamento para a
  precisão de armazenamento, com testes unitários e de propriedade (Vitest + fast-check), 100% de
  cobertura e piso que reprova o build
- Schema completo da Fase 0 em migrations versionadas: check-ins, medidas em formato longo,
  baseline com histórico, razões de proporção derivadas, fotos, consentimento append-only,
  verificação de idade, camada profissional e operação
- RLS em todas as tabelas, com suíte pgTAP de 38 asserções cobrindo isolamento entre contas e as
  travas de domínio
- Gates que reprovam o build: mecânicas proibidas, pureza do domínio, auditoria de dependência,
  cobertura, formatação, lint e tipos
- CI no GitHub Actions com Actions referenciadas por SHA completo

## Roadmap

Nada abaixo existe hoje.

### Fase 1 — Medidas e hexágono

- Formulário de medidas — o problema central da fase é a velocidade de entrada, não o gráfico
- Cálculo de proporção contra o baseline, determinístico, sem LLM
- Hexágono em `react-native-svg`, com transição entre dois períodos

### Fase 2 — Check-in e histórico

- Fotos com upload privado e consentimento por evento
- Histórico e comparação temporal
- Card compartilhável pelo share sheet do sistema

### Fase 3 — Onboarding

- Verificação de idade, consentimentos, exclusão de conta e exportação
- Modo de referência externa, opt-in e desligado por padrão

### Fase 4 — Camada profissional

- Rascunho de plano por IA atrás de revisão e assinatura de profissional CREF/CRN

---

## Restrições que o código respeita

Detalhadas em `docs/decisoes/`. O resumo:

- O app **não prescreve dieta nem treino**. Plano só chega a quem usa depois de revisado e
  assinado por profissional registrado, e isso é restrição de banco, não convenção de código
- O app **nunca gera imagem** do corpo futuro de ninguém
- O hexágono é **determinístico**, calculado a partir de medidas. Nenhum LLM participa
- O denominador é o baseline da própria pessoa. Sem ideal externo, sem inversão de eixo, sem
  comparação entre usuários
- Nenhuma mecânica que premie restrição — lista escrita e com gate em
  `docs/decisoes/0002-mecanicas-proibidas.md`
- Medidas e fotos são dado sensível: bucket privado, RLS por conta, URL assinada de vida curta
- Nenhum segredo no cliente

## Desenvolvimento

```bash
npm install
npm run check     # formato, lint, tipos, testes, gates
npm run db:test   # migrations, seed e suíte pgTAP
```

`db:test` precisa de um Postgres alcançável e da extensão pgTAP. Ele cria um banco descartável,
aplica as migrations e apaga o banco no fim. Configure por `PGHOST`, `PGPORT` e `PGUSER`.

Node conforme `.nvmrc`.

## Estrutura

```
packages/domain/     TypeScript puro, testável sem React Native
apps/mobile/         Expo (entra na Fase 1)
supabase/migrations/ schema versionado
supabase/tests/      suíte pgTAP
scripts/             gates e runner de banco
docs/decisoes/       ADRs
docs/legal/          notas com fonte citada
```
