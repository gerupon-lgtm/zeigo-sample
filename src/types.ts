export type Design = 'shiro' | 'ai' | 'komorebi';
export type MenuItem = { id: string; category: string; name: string; price: number; note?: string; visible?: boolean };
export type NewsItem = { id: string; date: string; label: string; title: string; body: string; visible?: boolean; featured?: boolean; image?: string };
export type Content = {
  schemaVersion: number;
  shop: { name: string; reading: string; founded: string; foundedYear?: number; foundedDate?: string | null; address: string; phone: string; hours: string; lateHours: string; closed: string; parking: string; instagram: string };
  photos: { hero: string; udon: string; exterior: string; interior: string };
  menu: MenuItem[];
  news: NewsItem[];
  newsMaxItems?: number;
  newsDisplayLimit?: number;
};
