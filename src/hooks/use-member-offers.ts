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
  const { data, error } = await supabase.storage.from(OFFER_BUCKET).download(file.storage_path);
  if (error) throw error;
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
