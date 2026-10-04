// © 2026 SIKUMI LAB — adapted from SITE BASE 20261004-16 (F-013/014/015/025).
import type { Content, Publication } from './types';
export const BADGE_OPTIONS = [
  { id: 'recommended', label: 'おすすめ' }, { id: 'limited-time', label: '期間限定' },
  { id: 'campaign', label: 'キャンペーン' }, { id: 'limited-quantity', label: '数量限定' },
  { id: 'sold-out', label: '売り切れ' }, { id: 'closed', label: '受付停止' }, { id: 'ended', label: '終了' },
];
export const PHOTO_SLOTS = [
  { id: 'hero', label: 'メイン写真' }, { id: 'soba', label: 'そば写真' }, { id: 'udon', label: 'うどん写真' },
  { id: 'exterior', label: 'お店の外観' }, { id: 'gozen', label: '御膳の紹介画像' },
  { id: 'interior', label: '店内写真（掲載時に使用）' },
] as const;
export const CUSTOM_BADGE_LIMIT = 6;
const segments = new Intl.Segmenter('ja', { granularity: 'grapheme' });
export const badgeLength = (text: string) => [...segments.segment(text.trim().normalize('NFC'))].length;
export const validCustomBadge = (text: unknown): text is string => typeof text === 'string' && badgeLength(text) <= CUSTOM_BADGE_LIMIT && !/[\p{Cc}\p{Cf}]/u.test(text.replaceAll('\u200d', ''));
export function badgeIds(item: Publication, legacyLabel?: string) {
  const selected = item.badges ?? (legacyLabel === 'キャンペーン' ? ['campaign'] : []);
  return BADGE_OPTIONS.filter(option => selected.includes(option.id)).map(option => option.id);
}
export function badgeLabels(item: Publication) {
  const labels = BADGE_OPTIONS.filter(option => badgeIds(item).includes(option.id)).map(option => option.label);
  if (item.customBadgeEnabled && validCustomBadge(item.customBadge) && item.customBadge.trim()) labels.push(item.customBadge.trim().normalize('NFC'));
  return labels;
}
export function publicationState(item: Publication, time = Date.now()) {
  if (item.visible === false) return '非表示';
  if (item.published === false) return '下書き';
  if (item.startAt && time < item.startAt) return '公開待ち';
  if (item.endAt && time >= item.endAt) return '終了';
  return '公開中';
}
export const hasNew = (item: Publication, time: number, days = 14) => !!item.newEnabled && publicationState(item, time) === '公開中' && (item.newMode === 'manual' || !!item.newStartedAt && time >= item.newStartedAt && time < item.newStartedAt + days * 86400000);
export const localDateTime = (time?: number | null) => time ? new Date(time - new Date(time).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
export const showDate = (time: number, withTime = false) => new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(time);
export function validPublication(item: Record<string, unknown>) {
  const flags = ['published', 'newEnabled', 'customBadgeEnabled', 'reapplyNew'];
  if (!flags.every(key => item[key] === undefined || typeof item[key] === 'boolean')) return false;
  if (item.newMode !== undefined && item.newMode !== 'auto' && item.newMode !== 'manual') return false;
  if (!['startAt', 'endAt', 'firstPublishedAt', 'newStartedAt', 'updatedAt'].every(key => item[key] == null || typeof item[key] === 'number' && Number.isSafeInteger(item[key]) && Number(item[key]) > 0 && Number(item[key]) < 8640000000000000)) return false;
  if (item.endAt && item.startAt && Number(item.endAt) <= Number(item.startAt)) return false;
  if (item.badges !== undefined && (!Array.isArray(item.badges) || item.badges.length > BADGE_OPTIONS.length || new Set(item.badges).size !== item.badges.length || !item.badges.every(id => BADGE_OPTIONS.some(option => option.id === id)))) return false;
  if (item.customBadge !== undefined && !validCustomBadge(item.customBadge)) return false;
  return !item.customBadgeEnabled || typeof item.customBadge === 'string' && !!item.customBadge.trim();
}
export function normalizeContent(content: Content): Content {
  const next = structuredClone(content);
  const normalize = <T extends Publication>(item: T, legacyLabel?: string): T => ({ ...item,
    published: item.published ?? true, newEnabled: item.newEnabled ?? false, newMode: item.newMode ?? 'auto',
    badges: badgeIds(item, legacyLabel), customBadge: item.customBadge ?? '', customBadgeEnabled: item.customBadgeEnabled ?? false,
    reapplyNew: item.reapplyNew ?? false,
  });
  next.menu = next.menu.map(item => normalize(item));
  next.news = next.news.map(item => normalize(item, item.label));
  next.newDays ??= 14;
  next.lastUpdated ??= Date.UTC(2026, 9, 1);
  // Split the previously shared hero/soba setting without losing saved photos.
  if (next.photos.soba === undefined) {
    next.photos.soba = next.photos.hero;
    // Replace only the former sample default; retain custom main photos.
    if (next.photos.hero === '/images/soba-hero.png') next.photos.hero = '/images/udon.png';
  }
  next.photos.gozen ??= '/images/m4.jpg';
  next.inquiries ??= [];
  // Supplement sample articles only once; never replace edits or exceed 20.
  if (next.demoNewsRevision !== 1) {
    for (const article of [
      { id: 'demo-news-photo', date: '2026-10-03', label: '表示見本', title: '写真付きのお知らせの見本', body: '写真と文章を組み合わせて、お店からのご案内を掲載できます。\nこれは操作を試すための見本記事で、実際のお店の告知ではありません。', image: '/images/udon.png', featured: true },
      { id: 'demo-news-menu', date: '2026-10-02', label: '表示見本', title: '商品紹介とバッジの見本', body: '新メニューや期間限定の案内にも使える、お知らせの見本です。\n設定画面で写真・本文・バッジ・掲載期間を変更できます。実際の商品情報ではありません。', badges: ['recommended'] },
    ]) if (next.news.length < 20 && !next.news.some(item => item.id === article.id)) next.news.push(normalize({ ...article, visible: true }));
    next.demoNewsRevision = 1;
  }
  return next;
}
export function prepareContent(before: Content, draft: Content, time = Date.now()): Content {
  const next = structuredClone(draft);
  for (const collection of ['menu', 'news'] as const) {
    for (const item of next[collection]) {
      const previous = before[collection].find(entry => entry.id === item.id);
      if(previous && JSON.stringify(item) === JSON.stringify(previous)) continue;
      if (item.published !== false) {
        const start = item.startAt || time;
        item.startAt = start;
        if (item.endAt && item.endAt <= start) throw new Error('終了日時は公開日時より後にしてください。');
        // A legacy entry was already published: ordinary edits must not restart NEW.
        const first = !previous?.firstPublishedAt;
        if (first) { item.firstPublishedAt = start; item.newStartedAt = start; }
        else if (item.reapplyNew && item.newEnabled) item.newStartedAt = Math.max(time, start);
        else item.newStartedAt = previous.newStartedAt;
        if (!first) item.firstPublishedAt = previous.firstPublishedAt;
      } else if (item.endAt && item.endAt <= (item.startAt || time)) throw new Error('終了日時は公開日時より後にしてください。');
      item.badges = badgeIds(item);
      item.customBadge = (item.customBadge ?? '').trim().normalize('NFC');
      item.reapplyNew = false;
      if (!previous || JSON.stringify({ ...item, updatedAt: previous.updatedAt }) !== JSON.stringify(previous)) item.updatedAt = time;
    }
  }
  return next;
}

export function publishedContentChanged(before: Content, after: Content) {
  if(JSON.stringify(before.shop)!==JSON.stringify(after.shop)||JSON.stringify(before.photos)!==JSON.stringify(after.photos)||before.newDays!==after.newDays)return true;
  for(const collection of ['menu','news'] as const){
    const publiclyConfigured=(c:Content)=>c[collection].filter(i=>i.published!==false).map(i=>({...i,reapplyNew:false}));
    if(JSON.stringify(publiclyConfigured(before))!==JSON.stringify(publiclyConfigured(after)))return true;
  }
  return false;
}
