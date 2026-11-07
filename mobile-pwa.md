---
title: Responsividade mobile e PWA
tags: [nebula, mobile, pwa, validacao]
date: 2026-11-07
---

# Responsividade mobile e PWA

Os componentes compartilhados de aluno e administração respeitam a largura da tela, altura dinâmica e áreas seguras do aparelho. Menus móveis prendem o foco, fecham com Escape e bloqueiam a rolagem do conteúdo atrás. Modais, formulários, notificações e abas se ajustam à tela; tabelas e quadros grandes mantêm rolagem dentro do próprio componente.

O editor de funis permite adicionar elementos por toque e abrir propriedades sem depender de arrastar com mouse. Os controles de mapa mental, desenho e vídeo também se adaptam à tela estreita. O menu da plataforma continua acessível dentro dos editores.

## PWA

O manifest inclui ícones com dimensões corretas, versão maskable e ícone Apple. A orientação é livre. O service worker é registrado automaticamente na versão de produção e apresenta uma página de recuperação quando não há conexão. Somente recursos estáticos são armazenados; páginas autenticadas, APIs, arquivos de alunos e vídeos não ficam disponíveis offline.

## Verificação reproduzível

Instale as dependências e o Chromium do Playwright (`npx playwright install chromium`). Inicie o app em outro terminal:

```sh
npm run dev -- --host 127.0.0.1 --port 4173
```

Em PowerShell:

```powershell
$env:MOBILE_WIDTH='320'
npm run test:mobile
$env:MOBILE_WIDTH='390'
npm run test:mobile
$env:MOBILE_WIDTH='844'
$env:MOBILE_HEIGHT='390'
npm run test:mobile
npm run test:pwa
```

`MOBILE_BASE_URL` permite usar outro endereço; `MOBILE_ROUTES` filtra rotas separadas por vírgula. Os relatórios ficam em `test-results/`. Os testes de layout usam dados e conta simulados, sem alterar dados reais. Eles verificam a largura do documento e erros de execução em 39 URLs, incluindo as telas de aluno, administração e entrada. A rota `/admin/funnels` é um redirecionamento existente para a área de aluno.

A agenda pública `/agenda` depende de carregamento no servidor com credenciais do ambiente publicado: seu código foi revisado, mas ela precisa ser conferida com o backend real. Os testes de layout não certificam todos os estados possíveis de dados ou integrações externas.

Nesta revisão, as 39 URLs passaram em 320×800, 390×800 e 844×390. Também passaram a compilação de produção, a checagem TypeScript, o teste de PWA e uma verificação de toque com criação de bloco, propriedades, importação, menus, modais e os três editores. O lint comparativo não acrescentou erros aos existentes no projeto.

## Conferência em aparelho físico

- Instalar pela tela inicial no Safari/iOS e Chrome/Android; abrir novamente e conferir o ícone e a área segura.
- Alternar retrato e paisagem, abrir teclado, menus e modais e conferir a navegação de retorno.
- Entrar com aluno e administrador reais; abrir cursos, ofertas, agenda e baixar arquivos autorizados.
- Criar e editar um funil por toque, navegar no mapa mental e usar as ferramentas de desenho.
- Desligar a rede, abrir uma rota e conferir a tela sem conexão; reconectar e tentar novamente.

Essa conferência física permanece necessária: a validação automatizada utiliza emulação Chromium, não um aparelho instalado.
