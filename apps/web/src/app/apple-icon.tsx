import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** Home-screen icon on phones (iOS): the official bottle on the interface black. */
export default async function AppleIcon() {
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
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" width={100} height={150} style={{ objectFit: 'contain' }} />
    </div>,
    size,
  );
}
