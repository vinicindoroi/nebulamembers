/**
 * Encerra automaticamente as calls cujo horário já passou.
 * Recebe um client Supabase já privilegiado (o handler valida quem chama).
 */
export async function closePastCalls(
  supabase: {
    from: (table: string) => {
      update: (values: Record<string, unknown>) => {
        eq: (column: string, value: string) => {
          lte: (column: string, value: string) => {
            select: (columns: string) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
          };
        };
      };
    };
  },
  now: Date = new Date(),
): Promise<{ closed: number }> {
  const { data, error } = await supabase
    .from("mentor_bookings")
    .update({ status: "done" })
    .eq("status", "booked")
    .lte("ends_at", now.toISOString())
    .select("id");

  if (error) throw new Error(error.message);
  return { closed: data?.length ?? 0 };
}
