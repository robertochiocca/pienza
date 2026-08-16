# Ryven

Your body. Your data. Your evolution.

Acompanhamento de composição e proporção corporal. O usuário registra medidas, faz check-ins
periódicos e vê a própria evolução comparada **com ele mesmo** — nunca com outra pessoa e nunca
com um ideal externo.

---

## Estado do projeto

**Fase 0 — Fundação. Em andamento.**

Este README separa rigorosamente o que existe do que está planejado. Nada da seção Roadmap está
implementado.

---

## Implementado

- Monorepo com npm workspaces, TypeScript em modo estrito (`noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`)
- `packages/domain`: unidades canônicas (cm/kg), conversão métrico/imperial e arredondamento
  para a precisão de armazenamento, com testes unitários e de propriedade (Vitest + fast-check)
- Regra de lint que impede `packages/domain` de importar React, React Native, Expo ou APIs de
  Node — o domínio precisa continuar testável fora do app
- CI no GitHub Actions: formatação, lint, typecheck e testes

## Roadmap

Nada abaixo existe hoje.

### Fase 0 — restante

- Migrations do schema (check-ins, medidas em formato longo, fotos, consentimento, planos)
- RLS em todas as tabelas, com suíte pgTAP rodando em CI
- Projeto Supabase local e seeds do vocabulário de medidas

### Fase 1 — Medidas e hexágono

- Formulário de medidas
- Cálculo de proporção contra o baseline do próprio usuário, determinístico, sem LLM
- Hexágono em `react-native-svg`, com sobreposição de dois períodos

### Fase 2 — Check-in e histórico

- Fotos com upload privado e consentimento por evento
- Timeline e comparação temporal
- Card compartilhável via share sheet do sistema

### Fase 3 — Onboarding

- Verificação de idade, consentimentos LGPD, exclusão de conta
- Modo de referência externa (opt-in, desligado por padrão)

### Fase 4 — Camada profissional

- Rascunho de plano por IA atrás de gate de revisão e assinatura por profissional CREF/CRN

---

## Restrições que o código precisa respeitar

Estão detalhadas em `docs/`. Resumo do que não é negociável:

- O app **não prescreve dieta nem treino**. Plano só é entregue depois de revisado e assinado
  por profissional habilitado, e isso é uma constraint de banco, não uma convenção.
- O app **nunca gera imagem simulada** do corpo futuro do usuário.
- O hexágono é **100% determinístico**, calculado a partir de medidas. Nenhum LLM participa.
- Nenhuma comparação entre usuários. Nenhum ideal externo no denominador (Fase 1).
- Medidas e fotos são dado pessoal sensível. Bucket privado, RLS por usuário, URLs assinadas de
  TTL curto, exclusão real.
- Nenhum segredo no cliente.

## Desenvolvimento

```bash
npm install
npm run check     # format + lint + typecheck + test
```

Requer Node conforme `.nvmrc`.

## Estrutura

```
packages/domain/   TypeScript puro, testável sem React Native
apps/mobile/       Expo (entra na Fase 1)
supabase/          migrations, seeds, testes pgTAP
docs/              propostas, decisões (ADRs) e notas legais com fonte citada
```
