import type { Option } from '@/lib/entities';

export const CHANNELS: readonly Option[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'x', label: 'X' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'web', label: 'Sitio web' },
  { value: 'email', label: 'Correo' },
  { value: 'other', label: 'Otro' },
];

export const FORMATS: readonly Option[] = [
  { value: 'post', label: 'Publicación' },
  { value: 'reel', label: 'Reel' },
  { value: 'story', label: 'Historia' },
  { value: 'video', label: 'Video' },
  { value: 'article', label: 'Artículo' },
  { value: 'newsletter', label: 'Boletín' },
  { value: 'other', label: 'Otro' },
];

export type ContentStatus = 'idea' | 'draft' | 'in_review' | 'approved' | 'rejected' | 'published';

export const STATUS_LABELS: Record<ContentStatus, string> = {
  idea: 'Idea',
  draft: 'Borrador',
  in_review: 'En revisión',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  published: 'Publicado',
};

export const STATUS_TONE: Record<
  ContentStatus,
  'neutral' | 'gold' | 'warning' | 'success' | 'danger'
> = {
  idea: 'neutral',
  draft: 'neutral',
  in_review: 'warning',
  approved: 'success',
  rejected: 'danger',
  published: 'gold',
};

export const ASSET_KINDS: readonly Option[] = [
  { value: 'logo', label: 'Logotipo' },
  { value: 'product', label: 'Producto' },
  { value: 'photo', label: 'Fotografía' },
  { value: 'video', label: 'Video' },
  { value: 'reference', label: 'Referencia visual' },
  { value: 'document', label: 'Documento' },
  { value: 'other', label: 'Otro' },
];

export const label = (list: readonly Option[], value: string): string =>
  list.find((o) => o.value === value)?.label ?? value;

export const formatBytes = (n: number): string =>
  n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const ACCEPTED_MIME = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'application/pdf',
  'font/ttf',
  'font/otf',
  'font/woff',
  'font/woff2',
];

/** Shape returned by the content_items queries (with the embedded asset and owner). */
export interface ContentItem {
  id: string;
  title: string;
  channel: string;
  format: string;
  status: ContentStatus;
  scheduled_at: string | null;
  copy: string | null;
  notes: string | null;
  asset_id: string | null;
  owner_id: string | null;
  legal_checked: boolean;
  review_comment: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  asset: { title: string; storage_path: string; mime: string } | null;
  owner: { name: string } | null;
}

export interface Asset {
  id: string;
  title: string;
  kind: string;
  description: string | null;
  storage_path: string;
  mime: string;
  size_bytes: number;
  official: boolean;
  tags: string[];
  created_at: string;
  url?: string;
}
