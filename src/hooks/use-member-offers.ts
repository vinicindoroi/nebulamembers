import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export const OFFER_BUCKET = "member-offers";
export const MAX_OFFER_FILE_SIZE = 50 * 1024 * 1024;
export type OfferFile = {
  id: string;
  offer_id: string;
  name: string;
  storage_path: string;
  size: number;
};
export type MemberOffer = {
  id: string;
  title: string;
  description: string;
  active: boolean;
  access_levels: string[];
  created_at: string;
  member_offer_files: OfferFile[];
};

export function useMemberOffers(admin = false) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["member-offers", user?.id, admin],
    enabled: !!user,
    queryFn: async () => {
      let query = supabase
        .from("member_offers")
        .select("*, member_offer_files(*)")
        .order("created_at", { ascending: false });
      if (!admin) query = query.eq("active", true);
      const { data, error } = await query;
      if (error) throw error;
      return data as MemberOffer[];
    },
  });
}

export function formatFileSize(size: number) {
  return size < 1024 * 1024
    ? `${Math.max(1, Math.ceil(size / 1024))} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export async function downloadOfferFile(file: OfferFile) {
  // A fresh signed URL re-checks access on every download; the plain authenticated
  // object URL can be served from the CDN cache after access was revoked.
  const { data: signed, error } = await supabase.storage
    .from(OFFER_BUCKET)
    .createSignedUrl(file.storage_path, 60);
  if (error || !signed?.signedUrl) throw error ?? new Error("Arquivo indisponível");
  const res = await fetch(signed.signedUrl, { cache: "no-store" });
  if (!res.ok) throw new Error("Arquivo indisponível");
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
