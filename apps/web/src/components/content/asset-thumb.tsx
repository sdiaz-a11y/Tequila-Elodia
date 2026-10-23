import { FileText, Film, Image as ImageIcon, Type } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Preview of a library file: image, video poster frame, or an icon for documents and fonts. */
export function AssetThumb({
  mime,
  url,
  title,
  className,
}: {
  mime: string;
  url?: string;
  title: string;
  className?: string;
}) {
  const base = cn(
    'grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-control bg-background',
    className,
  );
  if (url && mime.startsWith('image/'))
    return (
      <div className={base}>
        {/* Signed, short-lived URL: next/image optimisation would cache a link that expires. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={title} loading="lazy" className="size-full object-contain" />
      </div>
    );
  if (url && mime.startsWith('video/'))
    return (
      <div className={base}>
        <video
          src={`${url}#t=0.5`}
          preload="metadata"
          muted
          playsInline
          aria-label={title}
          className="size-full object-contain"
        />
      </div>
    );
  const Icon =
    mime === 'application/pdf'
      ? FileText
      : mime.startsWith('font/')
        ? Type
        : mime.startsWith('video/')
          ? Film
          : ImageIcon;
  return (
    <div className={base}>
      <Icon className="size-8 text-faint" aria-hidden />
    </div>
  );
}
