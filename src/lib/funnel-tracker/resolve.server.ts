/** Resolve o funil alvo de um evento público. Cria o funil padrão se ainda não existir. */
export async function resolveFunnelId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  workspaceId: string,
  requested?: string | null,
): Promise<string | null> {
  if (requested && /^[0-9a-f-]{36}$/i.test(requested)) {
    const { data } = await supabaseAdmin
      .from("funnels")
      .select("id")
      .eq("id", requested)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }

  const { data: first } = await supabaseAdmin
    .from("funnels")
    .select("id")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (first?.id) return first.id as string;

  const { data: created } = await supabaseAdmin
    .from("funnels")
    .insert({ workspace_id: workspaceId, name: "Funil principal" })
    .select("id")
    .single();
  return (created?.id as string) ?? null;
}
