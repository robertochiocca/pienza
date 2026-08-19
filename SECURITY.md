# Política de segurança

## O que este projeto é

O Pienza é um app de acompanhamento de composição e proporção corporal. Ele tem autenticação,
tem contas de pessoas reais e **guarda dado pessoal sensível**: medidas corporais e fotos do
corpo, que são dado de saúde.

Isso define o escopo desta política. Num projeto de portfólio sem login, quase tudo que se
reporta é ruído. Aqui é o contrário: praticamente todo caminho que leve dado de uma conta a
outra, ou que exponha um objeto de Storage fora do dono, é achado válido e prioritário.

## Estado atual

**Pré-lançamento.** Não há ambiente de produção, não há usuários e não há dado real armazenado.
As migrations e as políticas de RLS descritas em `docs/decisoes/0003-modelo-de-dados-e-rls.md`
estão implementadas e cobertas por suíte pgTAP que roda em CI; o aplicativo ainda não existe.

Enquanto isso for verdade, um relato aqui é sobre o código, não sobre um incidente. Quando
houver produção, esta seção muda e passa a haver prazo de resposta.

## Como reportar

Use o **Private Vulnerability Reporting** deste repositório: aba **Security** → **Report a
vulnerability**. É canal privado do GitHub, e não exige que você tenha meu e-mail.

Não abra issue pública para vulnerabilidade que exponha dado de conta. Issue é pública desde o
primeiro segundo.

Não há SLA. Isto é projeto de uma pessoa só, e prometer prazo de resposta que eu não consigo
sustentar é pior que não prometer nada.

Inclua, se possível: o que você conseguiu alcançar, o passo a passo, e se precisou de conta
autenticada. Não preciso de exploit armado; preciso conseguir reproduzir.

Não tenho programa de recompensa. Digo isso na frente para não desperdiçar o tempo de ninguém.

## Dentro do escopo, por quem e lesado

A ordem aqui e por vitima, e nao por mecanismo. Vazamento entre contas e um estranho
lendo o corpo de outra pessoa; integridade do proprio historico e alguem mentindo
para o proprio registro. Os dois sao reais, so um tem vitima que nao consentiu, e
misturar os dois no mesmo tom rouba atencao do que merece.

### 1. Terceiro que nao consentiu

O grupo mais importante. Qualquer caminho aqui e prioridade sobre todo o resto.

1. **Leitura, escrita ou remocao de dado de uma conta por outra.** Inclui contornar
   RLS por consulta encadeada, por funcao `SECURITY DEFINER` mal fechada, por view
   sem `security_invoker`, ou por chave estrangeira que aceite dono divergente.
2. **Acesso a objeto do bucket `checkin-photos` fora da pasta do dono**, ou URL
   assinada com validade longa demais, reutilizavel, ou que vaze em log ou cabecalho.
3. **Segredo alcancavel pelo cliente.** Chave de servico no bundle, no repositorio ou
   em log. Ela ignora RLS inteira e expoe todas as contas de uma vez.
4. **Exclusao de conta que deixe residuo** — linha, objeto de Storage ou derivado que
   sobreviva a purga.

### 2. Integridade do proprio historico

Aqui quem e lesado e o titular, contra o proprio registro. Importa porque o produto
inteiro depende de a serie ser verdadeira, mas nao compete em prioridade com o grupo 1.

5. **Escrita em `proportion_ratios` por cliente autenticado.** E dado derivado; poder
   escrever nele e poder forjar o proprio historico.
6. **Reescrever `provenance` depois de gravada**, ou reapontar um baseline por
   `UPDATE`. As duas trocam o denominador de toda a serie sem passar por validacao.
7. **`UPDATE` ou `DELETE` em `consent_events` ou `age_verification_events`.** Sao
   livros-razao append-only; reescreve-los destroi a prova.
8. **Marcar um plano como `delivered` sem revisao assinada.** Restricao de banco e
   fronteira legal, nao regra de negocio.

**O limite honesto do grupo 2:** forjar `provenance` no `insert` nao e impedivel pelo
banco, porque o banco nao tem conhecimento independente de que um humano digitou. Um
cliente adulterado grava `typed` em tudo. O que as travas fecham e o que importa: nao
ha caminho entre contas, e nao ha mutacao depois do fato. Quem forja no insert forja
contra o proprio historico.

### 3. Disponibilidade e custo

9. Consulta que derrube o banco ou consuma cota desproporcional a partir de uma conta.

## Fora do escopo, por desenho declarado

Estes não são descuidos; são consequências de decisões escritas:

- **Ausência de limite de taxa no ambiente local.** O ambiente local é descartável e roda com
  papéis de teste.
- **O shim de `auth` e `storage` em `scripts/sql/bootstrap-local.sql`.** Ele existe só para
  a suíte rodar sem Docker e nunca é aplicado em ambiente real. Divergência entre ele e o
  Supabase é bug de teste, e é bem-vinda como relato — mas não é vulnerabilidade.
- **Faixas de `measurement_keys.min_value/max_value`.** São guarda de digitação. Que sejam largas
  não é falha de validação.
- **O usuário conseguir ler o próprio dado derivado quando a interface escolhe não exibi-lo.**
  É intencional: o bloqueio é de apresentação, e negar no `SELECT` trancaria o titular fora dos
  próprios dados e quebraria a exportação.
- **Ausência de verificação forte de idade hoje.** Está reconhecida como pendência aberta, não
  como esquecimento. Autodeclaração não é verificação e o método definitivo ainda não foi
  decidido.
- Engenharia social, ataque físico, e qualquer teste que envolva conta que não seja sua.

## Pendente, com dono, e não como se estivesse feito

Estes itens dependem do aplicativo existir. Enquanto ele não existe, eles não estão fechados e
eu não escrevo que estão:

- **Upload de foto:** limite de tamanho, allowlist de tipo verificada pelo conteúdo do arquivo e
  não pelo `Content-Type` declarado, e nome gerado pelo servidor. O `CHECK` que amarra
  `storage_path` ao dono já existe; falta validar o que entra.
- **Resposta enxuta:** `select()` com colunas explícitas em toda consulta. PostgREST devolve a
  linha inteira por padrão, e coluna explícita limita o estrago de uma policy mal escrita.
- **Sessão em armazenamento seguro do sistema** (Keychain/Keystore), nunca em armazenamento
  comum de aplicativo.
- **Limite de taxa e proteção contra bot no Auth**, a confirmar na configuração do provedor.
  CAPTCHA antes do lançamento.

## Compromissos meus

- Não faço `git push` de segredo. `.env` está no `.gitignore` desde o primeiro commit e o
  repositório só carrega `.env.example`, sem valor nenhum.
- Versão de ferramenta que decide se o build passa é pinada, e Actions são referenciadas por SHA
  completo — tag pode ser movida.
- Auditoria de dependência reprova o build em vez de avisar.
- Varredura de segredo reprova o build, e o histórico inteiro já foi varrido.
- Chave de serviço nunca no cliente: a chave anônima é pública por desenho e só é segura porque a
  RLS existe; a de serviço ignora RLS e vive apenas em função de servidor. Há gate para isso.
- Quando houver produção, dado de titular excluído não é restaurado de backup.
