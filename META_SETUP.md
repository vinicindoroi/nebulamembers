# Facebook Ads por aluno

Integração própria autorizada pelo usuário. Não usa a conta de anúncios do dono, o conector Meta do chat nem MCP.

## Configuração necessária na Meta

1. Criar um app de negócios com Marketing API e Facebook Login for Business.
2. Criar uma configuração de login usando **User access token**, com **ads_read** para leitura. Não incluir permissões de edição como ads_management. Copiar o Configuration ID.
3. Registrar o retorno exato para cada domínio utilizado:
   - `https://nebulamembers.online/api/public/meta/callback`
   - `https://www.nebulamembers.online/api/public/meta/callback`
   - `https://nebulamembers.lovable.app/api/public/meta/callback`
   - Para testar no preview: `https://id-preview--cbc823c2-dcc1-42ae-905c-d9c90843f436.lovable.app/api/public/meta/callback`
4. Preencher os valores no formulário seguro do projeto: `META_APP_ID`, `META_APP_SECRET`, `META_LOGIN_CONFIG_ID`, `META_GRAPH_VERSION` (versão suportada indicada pela Meta, no formato `vNN.0`). Não colocar o App Secret em código, chat ou navegador.
5. Configurar política de privacidade e mecanismo de exclusão de dados exigidos pela Meta; a ação Desconectar Facebook apaga autorizações, estados e relatórios locais. Configurar revisão e verificação de negócios conforme exigidas pela Meta. Aprovar Advanced Access de ads_read para atender alunos que não têm função no app; app em desenvolvimento não comprova acesso de alunos externos.
6. Publicar a revisão do Nebula e validar com um aluno autorizado. Testar conexão, seleção de conta, filtro de período e desconexão.

O app requer o segredo de criptografia `META_TOKENS_SECRET`, criado pela ferramenta segura do projeto. Sem os quatro valores de configuração, o botão permanece desativado como “Aguardando ativação”.

## Limites e segurança

- O login normal do Nebula continua separado da autorização das campanhas.
- O retorno público só entrega code/state à janela de origem. A função autenticada consome um estado de uso único vinculado ao aluno e verifica aprovação antes de trocar o código.
- Apenas funções protegidas acessam tokens criptografados. O navegador recebe nome do Facebook, contas autorizadas e métricas, nunca tokens.
- Tokens de usuário expiram: o aluno deve reconectar quando necessário. Não há renovação silenciosa inventada.
- Relatórios idênticos ficam guardados por 15 minutos. Contas não são redescobertas a cada abertura; listagem é limitada com aviso de cobertura parcial.
- Valores são moeda e fuso da conta selecionada; compras e ROAS são atribuição da Meta, não pagamentos confirmados da Stripe. Eventos de compra sobrepostos nunca são somados.
- Consultas são só de leitura; não ativam, pausam ou alteram campanhas. Uma falha de autorização não usa outra conta como alternativa.

Referências: https://developers.facebook.com/documentation/facebook-login/facebook-login-for-business e https://developers.facebook.com/docs/marketing-api/get-started/authorization