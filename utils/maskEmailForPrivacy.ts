/** e.g. `john@gmail.com` → `j******@gmail.com` */
export function maskEmailForPrivacy(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return trimmed || "—";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (!local.length) return trimmed;
  const first = local[0] ?? "";
  return `${first}******@${domain}`;
}
