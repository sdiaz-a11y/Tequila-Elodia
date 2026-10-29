const CARRIERS: { match: RegExp; url: (n: string) => string }[] = [
  { match: /dhl/i, url: (n) => `https://www.dhl.com/mx-es/home/tracking.html?tracking-id=${n}` },
  { match: /fedex|fed ex/i, url: (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}` },
  { match: /\bups\b/i, url: (n) => `https://www.ups.com/track?tracknum=${n}` },
];

/** Public tracking page for the carriers we are sure about; null for any other (the guide is still shown as text). */
export function trackingUrl(carrier: string | null | undefined, number: string | null | undefined) {
  const n = (number ?? '').trim();
  if (!carrier || !n) return null;
  const hit = CARRIERS.find((c) => c.match.test(carrier));
  return hit ? hit.url(encodeURIComponent(n)) : null;
}
