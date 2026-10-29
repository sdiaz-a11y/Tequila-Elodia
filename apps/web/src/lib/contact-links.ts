/** WhatsApp click-to-chat link (no API, no cost). Mexican numbers: 10 digits, optionally with 52 / 521 in front. */
export function whatsappUrl(phone: string | null | undefined, text?: string): string | null {
  let digits = (phone ?? '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 13 && digits.startsWith('521')) digits = '52' + digits.slice(3);
  else if (digits.length === 10) digits = '52' + digits;
  if (digits.length < 11 || digits.length > 15) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
