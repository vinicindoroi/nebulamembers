import { useEffect, useState } from "react";
import { Video } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Load stored call links for a set of bookings as `{ bookingId: url }`. */
export async function fetchBookingLinks(bookingIds: string[]): Promise<Record<string, string>> {
  const ids = Array.from(new Set(bookingIds.filter(Boolean)));
  if (!ids.length) return {};
  const { data } = await supabase
    .from("mentor_booking_links")
    .select("booking_id,url")
    .in("booking_id", ids);
  const out: Record<string, string> = {};
  (data ?? []).forEach((x) => { out[x.booking_id] = x.url; });
  return out;
}

/**
 * Inline editor for a single call's link. Saves on blur or Enter, and shows an
 * "Entrar" button once a link exists (or when a fallback link is supplied).
 */
export function CallLinkEditor({ bookingId, initial, fallback }: {
  bookingId: string;
  initial?: string;
  fallback?: string | null;
}) {
  const [val, setVal] = useState(initial ?? "");
  const [saved, setSaved] = useState(initial ?? "");
  useEffect(() => { setVal(initial ?? ""); setSaved(initial ?? ""); }, [initial]);

  async function save() {
    const url = val.trim();
    if (url === saved) return;
    if (url && !/^https?:\/\//i.test(url)) { toast.error("Link inválido. Use https://..."); return; }
    const { error } = url
      ? await supabase.from("mentor_booking_links").upsert({ booking_id: bookingId, url, updated_at: new Date().toISOString() })
      : await supabase.from("mentor_booking_links").delete().eq("booking_id", bookingId);
    if (error) { toast.error(error.message); return; }
    setSaved(url);
    toast.success(url ? "Link salvo. O aluno verá 10 min antes da call." : "Link removido.");
  }

  const open = saved || fallback;

  return (
    <div className="flex items-center gap-2">
      <Input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        placeholder="Link do Google Meet"
        className="h-8 w-56 text-xs"
      />
      {open && (
        <Button asChild size="sm"><a href={open} target="_blank" rel="noreferrer"><Video className="h-4 w-4" /> Entrar</a></Button>
      )}
    </div>
  );
}
