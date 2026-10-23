import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

/**
 * Browser-tab icon: the official bottle, unaltered and only scaled, centred on the interface black.
 * (Not a logo: the official vector logo has not been supplied yet.)
 */
export default async function Icon() {
  const bottle = await readFile(path.join(process.cwd(), 'public/brand/elodia-botella.png'));
  const src = `data:image/png;base64,${bottle.toString('base64')}`;
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#101012',
        borderRadius: 14,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" width={36} height={54} style={{ objectFit: 'contain' }} />
    </div>,
    size,
  );
}
