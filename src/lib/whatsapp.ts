/** wa.me link from a stored phone number, adding Brazil's country code when it is missing. */
export function waLink(phone: string) {
  const d = phone.replace(/\D/g, "");
  return `https://wa.me/${d.length <= 11 ? `55${d}` : d}`;
}

/** True when a stored phone has enough digits to open a WhatsApp chat. */
export function hasWhatsapp(phone: string | null | undefined): boolean {
  return (phone ?? "").replace(/\D/g, "").length >= 10;
}
