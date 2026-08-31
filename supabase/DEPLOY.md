# Deploy do Tracking de Funil - NebulaHub

## Pré-requisitos
- Supabase CLI instalado (`npm install -g supabase`)
- Projeto Supabase linkado

## 1. Executar a Migration (criar tabela funnel_events)

Abra o **SQL Editor** no dashboard do Supabase e execute o conteúdo de:
```
supabase/migrations/20260517_create_funnel_events.sql
```

Ou via CLI:
```bash
supabase db push
```

## 2. Deploy da Edge Function (funnel-tracker)

```bash
supabase functions deploy funnel-tracker --no-verify-jwt
```

O flag `--no-verify-jwt` é necessário porque o script de tracking é chamado anonimamente pelas páginas do funil.

## 3. Verificar

Após o deploy:
1. Abra um funil no NebulaHub
2. Clique em **Tracking** na toolbar
3. Clique em **Gerar Token** — deve salvar o token na tabela `funnels`
4. Copie o script gerado e cole em uma página HTML
5. Abra a página — o script vai enviar um `pageview` para a Edge Function
6. Ative o **Live** mode no funil — os dados devem aparecer nos nós

## Troubleshooting

- **"Invalid tracking token"**: O token não foi salvo corretamente. Verifique se a coluna `tracking_token` existe na tabela `funnels`.
- **Sem dados no Live mode**: Verifique se a tabela `funnel_events` tem registros (`SELECT * FROM funnel_events LIMIT 10`).
- **CORS errors**: A Edge Function já inclui headers CORS permissivos. Se persistir, verifique se o deploy foi feito com `--no-verify-jwt`.
- **Realtime não funciona**: Verifique se `funnel_events` está na publicação realtime (`ALTER PUBLICATION supabase_realtime ADD TABLE public.funnel_events`).
