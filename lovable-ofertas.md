---
title: Finalizar Ofertas no backend do Lovable Cloud
tags: [ofertas, lovable, supabase, implementacao]
date: 2026-10-27
---

# Objetivo

Finalize a funcionalidade de Ofertas já implementada neste repositório usando **o Supabase integrado ao próprio Lovable Cloud deste projeto**. O usuário quer que o admin disponibilize ofertas com arquivos prontos, escolha quais planos têm acesso e que os alunos autorizados consigam visualizar e baixar esses materiais.

O frontend está implementado. Falta aplicar e validar o backend no ambiente real do Lovable. Não crie outro projeto Supabase, não migre o backend e não solicite chaves de um Supabase externo. Use as ferramentas e credenciais internas do projeto Lovable existente.

## Código existente

- `src/routes/admin.offers.tsx`: a primeira aba gerencia materiais para alunos; a segunda preserva as ofertas comerciais e seus links de pagamento.
- `src/components/admin/MemberOffers.tsx`: criação, edição, publicação/rascunho, seleção de planos, upload de vários arquivos e exclusão.
- `src/routes/_app.offers.tsx`: catálogo do aluno, busca e download autenticado.
- `src/components/members/AppShell.tsx`: entrada Ofertas no menu.
- `src/hooks/use-member-offers.ts`: consultas e download pelo SDK do Supabase.
- `supabase/migrations/20261027165244_member_offers.sql`: implementação SQL a aplicar e conferir.
- `tests/member-offers.mjs`: testes de RLS e acesso ao Storage em PostgreSQL isolado.

## 1. Inspecionar o ambiente conectado

Confirme o backend que o app usa atualmente. O repositório referencia `yyrbxyinbxweshosrnnd`; confirme pela configuração real do Lovable, sem trocar URL ou credenciais automaticamente se houver divergência.

Antes de executar SQL, verifique as tabelas, funções, policies e histórico de migrations existentes. A migração foi preparada e testada localmente, mas **não foi aplicada remotamente pelo Codex**. Caso outro processo já a tenha aplicado, não execute novamente o mesmo SQL cegamente, pois ele contém `CREATE TABLE`, `CREATE FUNCTION` e `CREATE POLICY` sem substituição.

Confirme as dependências `public.has_role(uuid, ...)`, `public.plan_slug(text)`, `public.profiles`, `public.user_roles` e `public.app_settings`. O acesso deve usar os dados e a configuração de planos existentes. Se o ambiente tiver diferenças em relação ao repositório, ajuste a integração preservando os comportamentos descritos aqui, sem reconstruir o sistema de permissões ou alterar planos de usuários.

## 2. Aplicar o banco e o Storage

Use a migração `supabase/migrations/20261027165244_member_offers.sql` como fonte da implementação. Aplique-a pelo mecanismo de migrations do Lovable Cloud. Se houver estado parcial ou conflito de objetos, prepare uma migração complementar que complete apenas o necessário, preservando dados e histórico.

O resultado deve conter:

| Objeto | Função |
| --- | --- |
| `public.member_offers` | Título, descrição, publicação, planos autorizados e data de criação |
| `public.member_offer_files` | Vínculo com a oferta, nome original, caminho privado e tamanho do arquivo |
| `private.can_access_member_offer(uuid)` | Validação interna de admin ou plano autorizado em uma oferta publicada |
| bucket `member-offers` | Armazenamento **privado**, limite de 52.428.800 bytes por arquivo |

Os arquivos são enviados como `<offer_id>/<uuid>-<nome-normalizado>`. O nome original fica na tabela e é usado no download. O vínculo deve ser excluído em cascata ao excluir a oferta. O app também tenta remover os objetos do Storage e informa ao admin se essa limpeza falhar.

Habilite RLS nas duas tabelas e mantenha os grants necessários para o SDK autenticado. Preserve as policies de escrita exclusivamente para administradores. No Storage, o aluno só pode ler objetos com um vínculo válido em `member_offer_files` e permissão para a oferta correspondente. O admin precisa poder enviar, ler e remover arquivos, inclusive objetos ainda não vinculados durante upload ou limpeza.

Inspecione também as **policies já existentes** em `storage.objects`: policies permissivas são combinadas com OR. Uma policy antiga muito ampla não pode acabar liberando esse bucket a qualquer usuário. Caso isso ocorra, ajuste o escopo daquela policy preservando o acesso dos outros buckets. Não torne o bucket público para resolver erros.

O helper fica no schema `private` para evitar recursão de RLS ao consultar as ofertas. Ele verifica `auth.uid()`, usa `search_path` vazio e tem execução revogada de `PUBLIC`. Não exponha esse schema na Data API e não coloque credenciais privilegiadas no frontend.

## 3. Preservar a regra de planos existente

O controle segue a **lista explícita de planos**, como a seleção múltipla dos cursos. Para liberar uma oferta para Pro e Premium, o admin marca ambos. Não introduza herança automática de planos para essa lista.

Resolva nomes e slugs com `public.plan_slug`, inclusive planos personalizados cadastrados no admin. Sem sessão, sem plano ou com plano `pending`/`pendente`, negue o acesso. Alunos não podem criar, editar, excluir ofertas ou enviar arquivos. Rascunhos e ofertas de planos não selecionados não aparecem para eles, e o download direto também deve ser negado.

Não misture as novas tabelas com `public.offers`, que já representa ofertas comerciais de checkout e é referenciada por cursos e aulas. Preserve esses dados, vínculos e telas.

## 4. Integrar e corrigir até funcionar

Atualize os tipos Supabase a partir do schema real após aplicar as migrations, preservando os tipos das outras funcionalidades. Confira se `member_offer_files_offer_id_fkey` permite a consulta aninhada `member_offers.select("*, member_offer_files(*)")` e recarregue o schema cache, se necessário.

Valide também as permissões do schema privado, do helper, das tabelas e do bucket. Se ocorrer erro de RLS, função ausente, join, upload ou download, identifique a causa e corrija o fluxo. Não contorne erros desabilitando RLS ou liberando acesso público.

O upload tem limite de 50 MB por arquivo, pode conter vários arquivos por oferta e preserva o nome original no download. Ofertas novas só são publicadas depois que o envio e os vínculos são salvos. A interface bloqueia publicação sem arquivos ou sem planos. Arquivos desvinculados não podem continuar disponíveis para alunos.

## 5. Testar no ambiente real

Execute os checks disponíveis (`npm run test:offers`, `npx tsc --noEmit`, `npm run build`) e teste o percurso com o banco e o Storage reais:

1. Como admin, criar uma oferta com título, descrição e mais de um arquivo; selecionar um plano existente e publicar.
2. Como aluno do plano autorizado, abrir `/offers`, buscar a oferta e baixar um arquivo. Confirmar nome e conteúdo do download.
3. Como aluno de outro plano, confirmar que a oferta não aparece e que o acesso direto ao objeto privado é negado.
4. Confirmar bloqueio para conta pendente e acesso sem autenticação.
5. Testar um plano personalizado, incluindo perfil salvo com o nome do plano e configuração com slug.
6. Editar os planos autorizados e confirmar que novas tentativas de download respeitam a alteração. Despublicar e confirmar o bloqueio.
7. Adicionar/remover arquivos e excluir uma oferta; confirmar que vínculos e objetos foram limpos ou que o aviso de limpeza manual corresponde a uma falha real.
8. Confirmar que o aluno não consegue escrever nas tabelas nem fazer upload no bucket via API.
9. Conferir a tela no desktop e no celular e confirmar que a aba Links de pagamento continua funcionando.

Use dados de teste identificáveis e limpe apenas os dados e arquivos que você criar. Não altere os planos de usuários reais para testar. Se não houver contas de teste suficientes, conclua o que for possível e informe exatamente o cenário que ficou sem validação.

## Entrega esperada

Concluir a configuração e as correções no próprio projeto Lovable. Informar quais migrations foram aplicadas, se o bucket está privado, quais cenários foram realmente validados e eventuais pendências concretas. Os testes anteriores do Codex usaram PostgreSQL isolado e API simulada no navegador; eles não substituem esta validação real. Não declarar conclusão só porque o build passou.
