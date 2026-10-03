import type { Content, NewsItem } from './types';
import { getJapanDate, isFoundingDate } from './founding';

export const STORAGE_KEY = 'zeigo-proposal-content-v1';
export const MENU_CATEGORIES = ['うどん', 'そば', '丼・定食', '寿司・御膳', '会席'];
export const MAX_MENU_ITEMS = 199;
export const DEFAULT_NEWS_MAX = 20;
export const DEFAULT_NEWS_DISPLAY = 10;
export const MAX_NEWS_ITEMS = 20;
// Covers all 24 allowed images after base64 encoding, plus text and metadata.
export const MAX_IMPORT_BYTES = 40 * 1024 * 1024;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, max: number, required = false): value is string => typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0);
const optionalFlag = (value: unknown) => value === undefined || typeof value === 'boolean';
export const safePhoto = (value: unknown): value is string => typeof value === 'string' && value.length <= 1500000 && (/^\/images\/[a-zA-Z0-9._-]+$/.test(value) || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value));

export function validNewsDate(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}[.-]\d{2}[.-]\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split(/[.-]/).map(Number);
  return year >= 100 && isFoundingDate(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, year);
}

export function validateContent(value: unknown): value is Content {
  if (!record(value) || value.schemaVersion !== 1 || !record(value.shop) || !record(value.photos)) return false;
  const shop = value.shop;
  const shopKeys = ['name', 'reading', 'founded', 'address', 'phone', 'hours', 'lateHours', 'closed', 'parking', 'instagram'];
  if (!shopKeys.every(key => text(shop[key], 299)) || !/^https:\/\/www\.instagram\.com\//.test(String(shop.instagram)) || !/^[0-9-]{8,20}$/.test(String(shop.phone))) return false;
  if (shop.foundedYear !== undefined && !(Number.isInteger(shop.foundedYear) && Number(shop.foundedYear) >= 1800 && Number(shop.foundedYear) <= getJapanDate().year)) return false;
  if (shop.foundedDate != null && !isFoundingDate(shop.foundedDate, Number(shop.foundedYear ?? 1979))) return false;
  const photos = value.photos;
  if (!['hero', 'udon', 'exterior', 'interior'].every(key => safePhoto(photos[key]))) return false;
  if (!Array.isArray(value.menu) || !value.menu.length || value.menu.length > MAX_MENU_ITEMS) return false;
  if (!value.menu.every(item => record(item) && text(item.id, 100, true) && text(item.name, 100, true) && MENU_CATEGORIES.includes(String(item.category)) && Number.isSafeInteger(item.price) && Number(item.price) >= 0 && Number(item.price) <= 1000000 && (item.note === undefined || text(item.note, 100)) && optionalFlag(item.visible))) return false;
  if (new Set(value.menu.map(item => item.id)).size !== value.menu.length) return false;
  const max = value.newsMaxItems ?? DEFAULT_NEWS_MAX;
  const display = value.newsDisplayLimit ?? Math.min(DEFAULT_NEWS_DISPLAY, Number(max));
  if (max !== DEFAULT_NEWS_MAX || display !== DEFAULT_NEWS_DISPLAY) return false;
  if (!Array.isArray(value.news) || value.news.length > Number(max)) return false;
  if (!value.news.every(item => record(item) && text(item.id, 100, true) && validNewsDate(item.date) && text(item.label, 40, true) && text(item.title, 140, true) && text(item.body, 5000, true) && optionalFlag(item.visible) && optionalFlag(item.featured) && (item.image === undefined || item.image === '' || safePhoto(item.image)))) return false;
  return new Set(value.news.map(item => item.id)).size === value.news.length;
}

export function displayedNews(content: Content): NewsItem[] {
  return content.news.filter(item => item.visible !== false)
    .sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || b.date.replaceAll('.', '-').localeCompare(a.date.replaceAll('.', '-')))
    .slice(0, content.newsDisplayLimit ?? DEFAULT_NEWS_DISPLAY);
}

export type ContentChange = { label: string; before: string; after: string; beforeImage?: string; afterImage?: string };
export function contentChanges(before: Content, after: Content): ContentChange[] {
  const changes: ContentChange[] = [];
  const add = (label: string, old: string, next: string, beforeImage?: string, afterImage?: string) => {
    if (old !== next) changes.push({ label, before: old || 'なし', after: next || 'なし', beforeImage, afterImage });
  };
  for (const [key, label] of [['hours', '営業時間'], ['lateHours', '土曜日の営業時間'], ['closed', '定休日']] as const) add(label, before.shop[key], after.shop[key]);
  for (const [key, label] of [['name', '店名'], ['reading', '店名の読み'], ['founded', '創業の表記'], ['address', '住所'], ['phone', '電話番号'], ['parking', '駐車場'], ['instagram', 'Instagram']] as const) add(label, before.shop[key], after.shop[key]);
  add('創業年', String(before.shop.foundedYear ?? ''), String(after.shop.foundedYear ?? ''));
  add('創業日', before.shop.foundedDate ?? '', after.shop.foundedDate ?? '');
  for (const [key, label] of [['hero', 'メイン写真'], ['udon', 'うどん写真'], ['exterior', '外観写真'], ['interior', '店内写真']] as const) {
    if (before.photos[key] !== after.photos[key]) changes.push({ label, before: '変更前の写真', after: '変更後の写真', beforeImage: before.photos[key], afterImage: after.photos[key] });
  }
  for (const item of after.menu) {
    const old = before.menu.find(entry => entry.id === item.id);
    if (!old) { add('お品書きの追加', '', `${item.name} / ${item.category} / ${item.price}円 / ${item.visible === false ? '非表示' : '表示'}`); continue; }
    add(`${old.name}：品名`, old.name, item.name);
    add(`${old.name}：価格`, `${old.price}円`, `${item.price}円`);
    add(`${old.name}：カテゴリ`, old.category, item.category);
    add(`${old.name}：注記`, old.note ?? '', item.note ?? '');
    add(`${old.name}：掲載`, old.visible === false ? '非表示' : '表示', item.visible === false ? '非表示' : '表示');
  }
  for (const item of before.menu.filter(item => !after.menu.some(entry => entry.id === item.id))) add('お品書きの削除', item.name, '削除');
  for (const category of MENU_CATEGORIES) {
    const oldItems = before.menu.filter(item => item.category === category);
    const newItems = after.menu.filter(item => item.category === category);
    const sharedIds = new Set(oldItems.map(item => item.id).filter(id => newItems.some(item => item.id === id)));
    if (oldItems.filter(item => sharedIds.has(item.id)).map(item => item.id).join(',') !== newItems.filter(item => sharedIds.has(item.id)).map(item => item.id).join(',')) {
      add(`${category}：表示順`, oldItems.map(item => item.name).join(' → '), newItems.map(item => item.name).join(' → '));
    }
  }
  add('お知らせの保存上限', String(before.newsMaxItems ?? DEFAULT_NEWS_MAX), String(after.newsMaxItems ?? DEFAULT_NEWS_MAX));
  add('お知らせの表示上限', String(before.newsDisplayLimit ?? DEFAULT_NEWS_DISPLAY), String(after.newsDisplayLimit ?? DEFAULT_NEWS_DISPLAY));
  for (const item of after.news) {
    const old = before.news.find(entry => entry.id === item.id);
    if (!old) { changes.push({ label: 'お知らせの追加', before: 'なし', after: `${item.title}\n${item.date} / ${item.label} / ${item.visible === false ? '非表示' : '表示対象'}${item.featured ? ' / ピックアップ' : ''}\n${item.body}`, afterImage: item.image }); continue; }
    for (const [key, label] of [['title', 'タイトル'], ['date', '日付'], ['label', '種類'], ['body', '本文']] as const) add(`${old.title}：${label}`, old[key], item[key]);
    add(`${old.title}：掲載`, old.visible === false ? '非表示' : '表示対象', item.visible === false ? '非表示' : '表示対象');
    add(`${old.title}：ピックアップ`, old.featured ? 'する' : 'しない', item.featured ? 'する' : 'しない');
    if (old.image !== item.image && (old.image || item.image)) changes.push({ label: `${old.title}：写真`, before: old.image ? '変更前の写真' : 'なし', after: item.image ? '変更後の写真' : 'なし', beforeImage: old.image, afterImage: item.image });
  }
  for (const item of before.news.filter(item => !after.news.some(entry => entry.id === item.id))) add('お知らせの削除', item.title, '削除');
  return changes;
}
