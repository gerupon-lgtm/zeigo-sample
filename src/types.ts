// © 2026 SIKUMI LAB
export type Design = 'shiro' | 'ai' | 'komorebi';
export type Publication = {
  published?: boolean; startAt?: number | null; endAt?: number | null;
  firstPublishedAt?: number | null; newStartedAt?: number | null; updatedAt?: number | null;
  newEnabled?: boolean; newMode?: 'auto' | 'manual'; reapplyNew?: boolean;
  badges?: string[]; customBadge?: string; customBadgeEnabled?: boolean;
  visible?: boolean;
};
export type MenuItem = Publication & { id: string; category: string; name: string; price: number; note?: string };
export type NewsItem = Publication & { id: string; date: string; label: string; title: string; body: string; featured?: boolean; image?: string };
export type Inquiry = { id: string; name: string; email: string; kind: '各種お問合せ' | 'その他'; body: string; receivedAt: number; status: '未対応' | '対応中' | '対応済み'; memo: string; notification: '未送信（サンプル）' };
export type Content = {
  schemaVersion: number;
  shop: { name: string; reading: string; founded: string; foundedYear?: number; foundedDate?: string | null; address: string; phone: string; hours: string; lateHours: string; closed: string; parking: string; instagram: string };
  photos: { hero: string; soba?: string; udon: string; exterior: string; interior: string; gozen?: string };
  menu: MenuItem[];
  news: NewsItem[];
  newsMaxItems?: number;
  newsDisplayLimit?: number;
  newDays?: number;
  lastUpdated?: number;
  demoNewsRevision?: number;
  inquiries?: Inquiry[];
};
