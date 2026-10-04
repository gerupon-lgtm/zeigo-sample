// © 2026 SIKUMI LAB
import type { Publication } from './types';
import { badgeLabels, hasNew } from './site-features';
export default function Badges({ item, days, time }: { item: Publication; days: number; time: number }) {
  return <span className="content-badges">{hasNew(item, time, days) && <span className="content-badge is-new">NEW</span>}{badgeLabels(item).map((label, index) => <span className="content-badge" key={index}>{label}</span>)}</span>;
}
