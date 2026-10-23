'use client';

import { useRouter } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { AssetThumb } from '@/components/content/asset-thumb';
import { ReviewActions } from '@/components/content/review-actions';
import { Badge } from '@/components/ui/badge';
import {
  CHANNELS,
  FORMATS,
  STATUS_LABELS,
  STATUS_TONE,
  label,
  type ContentItem,
} from '@/lib/content';
import { formatDateTime } from '@/lib/format';

export function ApprovalsList({
  items,
  urls,
  canEdit,
  canApprove,
}: {
  items: ContentItem[];
  urls: Record<string, string>;
  canEdit: boolean;
  canApprove: boolean;
}) {
  const router = useRouter();
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {items.map((it) => (
        <li
          key={it.id}
          className="grid gap-4 rounded-panel border border-line bg-surface p-4 shadow-panel sm:grid-cols-[12rem_minmax(0,1fr)] sm:p-5"
        >
          {it.asset ? (
            <AssetThumb
              mime={it.asset.mime}
              url={urls[it.asset.storage_path]}
              title={it.asset.title}
            />
          ) : (
            <div className="hidden aspect-[4/3] place-items-center rounded-control bg-background text-xs text-faint sm:grid">
              Sin archivo
            </div>
          )}
          <div className="grid content-start gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONE[it.status]}>{STATUS_LABELS[it.status]}</Badge>
              <Badge>{label(CHANNELS, it.channel)}</Badge>
              <Badge>{label(FORMATS, it.format)}</Badge>
            </div>
            <h3 className="text-base font-semibold text-fg">{it.title}</h3>
            <p className="tabular inline-flex items-center gap-1.5 text-sm text-muted">
              <CalendarDays className="size-4" aria-hidden />
              {it.scheduled_at ? formatDateTime(it.scheduled_at) : 'Sin fecha'}
              {it.owner ? ` · ${it.owner.name}` : ''}
            </p>
            {it.copy ? (
              <p className="line-clamp-6 whitespace-pre-wrap rounded-control border border-line bg-surface-2 p-3 text-sm leading-relaxed text-fg">
                {it.copy}
              </p>
            ) : null}
            {it.review_comment ? (
              <p className="text-sm text-muted">
                <span className="text-faint">Comentario: </span>
                {it.review_comment}
              </p>
            ) : null}
            <ReviewActions
              item={it}
              canEdit={canEdit}
              canApprove={canApprove}
              onDone={() => router.refresh()}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
