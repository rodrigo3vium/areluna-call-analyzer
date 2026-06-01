import { parsePhoneNumber, type CountryCode } from "libphonenumber-js";

export function normalizar(raw: string, country: CountryCode = "BR"): string | null {
  if (!raw) return null;

  // Groups (@g.us) não são contatos individuais — ignorar
  if (raw.includes("@g.us")) return null;

  // Strip Evolution JID suffix (e.g., 5511999999999@s.whatsapp.net)
  const withoutJid = raw.split("@")[0];

  const startsWithPlus = withoutJid.trimStart().startsWith("+");

  // Attempt 1: parse respeitando o formato do input (handles +55..., (11) 9..., etc.)
  try {
    const p = parsePhoneNumber(withoutJid, country);
    if (p.isValid()) return p.format("E.164");
  } catch {
    // fall through
  }

  // Attempt 2: prepend + to raw digits (handles 5511... Evolution format sem +)
  if (!startsWithPlus) {
    const digitsOnly = withoutJid.replace(/\D/g, "");
    if (digitsOnly) {
      try {
        const p = parsePhoneNumber(`+${digitsOnly}`);
        if (p.isValid()) return p.format("E.164");
      } catch {
        // fall through
      }
    }
  }

  return null;
}
