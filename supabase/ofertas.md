---
title: Ofertas com materiais para alunos
tags: [ofertas, supabase, desenvolvimento]
date: 2026-10-27
---

# Ofertas com materiais

No admin, abra **Ofertas → Ofertas para alunos**. Crie a oferta, descreva os materiais, marque todos os planos autorizados e envie os arquivos (até 50 MB por arquivo). É possível salvar como rascunho, editar os planos e adicionar ou remover arquivos. Para remover o último arquivo de uma oferta publicada, salve-a como rascunho primeiro.

Na área do aluno, **Ofertas** mostra somente as ofertas publicadas para o plano dele. A seleção de planos é explícita, como nos cursos: marque também os planos superiores que devem receber acesso. Contas pendentes não têm acesso. Os links de pagamento existentes continuam na segunda aba do admin.

## Ativação no ambiente

Antes de disponibilizar o frontend, aplique o arquivo `supabase/migrations/20261027165244_member_offers.sql` no banco que o app usa (`yyrbxyinbxweshosrnnd`). Use o SQL Editor do ambiente correspondente ou o fluxo habitual de migrations, verificando o projeto de destino.

A migração cria duas tabelas com RLS e o bucket **privado** `member-offers`. Depende das funções existentes `public.has_role` e `public.plan_slug`, usadas pelo sistema atual de acesso. Não é necessário publicar Edge Functions. Não torne o bucket público: o download autenticado verifica o plano atual, o status da oferta e o vínculo do arquivo.

O conector Supabase disponível durante a implementação não incluía esse projeto, portanto a migração não foi aplicada remotamente.

## Validação

- `npm run test:offers`: executa a migração em PostgreSQL isolado com PGlite e testa as regras de acesso sem credenciais e sem alterar dados reais.
- `npx tsc --noEmit`: valida tipos, incluindo as novas rotas.
- `npm run build`: compila cliente e servidor.

Após aplicar no ambiente, crie uma oferta de teste no admin e valide upload/download com um aluno de plano autorizado e outro de plano não autorizado. Despublique a oferta e confira que o acesso ao arquivo é revogado.

Se a exclusão do objeto no Storage falhar após a exclusão da oferta ou do vínculo do arquivo, o app avisa o administrador para limpar o armazenamento. O objeto remanescente continua inacessível aos alunos porque não possui vínculo autorizado.
