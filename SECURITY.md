# Política de segurança

## O que este projeto é

O Ryven é um app de acompanhamento de composição e proporção corporal. Ele tem autenticação,
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

Escreva para `<<contato de segurança a definir>>` antes de abrir issue pública.

Não abra issue no GitHub para vulnerabilidade que exponha dado de conta. Issue é pública desde o
primeiro segundo.

Inclua, se possível: o que você conseguiu alcançar, o passo a passo, e se precisou de conta
autenticada. Não preciso de exploit armado; preciso conseguir reproduzir.

Não tenho programa de recompensa. Sou um desenvolvedor sozinho e digo isso na frente para não
desperdiçar o tempo de ninguém.

## Dentro do escopo

Estes são os achados que mais importam, em ordem:

1. **Qualquer leitura, escrita ou remoção de dado de uma conta por outra.** Inclui contornar RLS
   por consulta encadeada, por função `SECURITY DEFINER` mal fechada, por view sem
   `security_invoker`, ou por chave estrangeira que aceite dono divergente.
2. **Acesso a objeto do bucket `checkin-photos` fora da pasta do dono**, ou URL assinada com
   validade longa demais, reutilizável, ou que vaze em log ou em cabeçalho.
3. **Escrita em `proportion_ratios` por cliente autenticado.** É dado derivado e só a rotina de
   servidor escreve nele; conseguir escrever significa poder forjar o histórico de alguém.
4. **Marcar um plano como `delivered` sem revisão assinada de profissional registrado.** Isso é
   restrição de banco e uma fronteira legal, não só uma regra de negócio.
5. **`UPDATE` ou `DELETE` em `consent_events` ou em `age_verification_events`.** São livros-razão
   append-only; conseguir reescrevê-los destrói a prova de consentimento.
6. **Segredo alcançável pelo cliente.** Qualquer chave de serviço que chegue ao bundle do app,
   ao repositório ou a um log.
7. **Exclusão de conta que deixe resíduo** — linha, objeto de Storage ou derivado que sobreviva
   à purga.

## Fora do escopo, por desenho declarado

Estes não são descuidos; são consequências de decisões escritas:

- **Ausência de limite de taxa no ambiente local.** O ambiente local é descartável e roda com
  papéis de teste.
- **O shim de `auth` e `storage` em `supabase/tests/00_bootstrap_local.sql`.** Ele existe só para
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

## Compromissos meus

- Não faço `git push` de segredo. `.env` está no `.gitignore` desde o primeiro commit e o
  repositório só carrega `.env.example`, sem valor nenhum.
- Versão de ferramenta que decide se o build passa é pinada, e Actions são referenciadas por SHA
  completo — tag pode ser movida.
- Auditoria de dependência reprova o build em vez de avisar.
- Quando houver produção, dado de titular excluído não é restaurado de backup.
