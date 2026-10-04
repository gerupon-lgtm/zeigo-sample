// © 2026 SIKUMI LAB — SITE BASE-style anchored detail / mobile bottom panel.
import { useEffect, useRef, useState } from 'react';
import type { NewsItem } from './types';
import { assetUrl } from './assets';
import Badges from './Badges';
export default function NewsDetail({ article, trigger, days, time, close }: { article: NewsItem; trigger: HTMLButtonElement; days: number; time: number; close: () => void }) {
  const panel = useRef<HTMLElement>(null);
  const [position, setPosition] = useState<{ left?: number; top?: number; maxHeight?: number }>({});
  useEffect(() => {
    const element = panel.current!;
    function place() {
      if (matchMedia('(max-width:700px)').matches) { const headerBottom=document.querySelector('.site-header')!.getBoundingClientRect().bottom;setPosition({maxHeight:Math.max(100,innerHeight-headerBottom-12)}); return; }
      const rect = trigger.getBoundingClientRect(), size = element.getBoundingClientRect(), headerBottom = document.querySelector('.site-header')!.getBoundingClientRect().bottom;
      if(rect.bottom<=headerBottom||rect.top>=innerHeight){close();return;}
      const below = rect.bottom + 12, top = below + size.height <= innerHeight - 16 ? below : rect.top - size.height - 12;
      setPosition({ left: Math.max(16, Math.min(rect.left, innerWidth - size.width - 16)), top: Math.max(headerBottom + 12, Math.min(top, innerHeight - size.height - 16)) });
    }
    function outside(event: PointerEvent) { if(!element.contains(event.target as Node) && !trigger.contains(event.target as Node))close(); }
    function key(event: KeyboardEvent) { if(event.key==='Escape'){close();trigger.focus({preventScroll:true});} }
    place(); document.addEventListener('pointerdown', outside);document.addEventListener('keydown', key);window.addEventListener('resize', place);window.addEventListener('scroll', place, true);
    const observer = new ResizeObserver(place);observer.observe(element);
    return () => { observer.disconnect();document.removeEventListener('pointerdown', outside);document.removeEventListener('keydown', key);window.removeEventListener('resize', place);window.removeEventListener('scroll', place, true); };
  }, [article, trigger, close]);
  return <section className="news-detail" ref={panel} style={position} role="dialog" aria-labelledby="news-detail-title" id="news-detail"><div className="news-detail-heading"><h2 id="news-detail-title">{article.title}</h2><button onClick={() => { close();trigger.focus({preventScroll:true}); }} aria-label="閉じる" className="news-detail-close">閉じる</button></div><div className="news-detail-content"><div className="article-meta"><time>{article.date.replaceAll('-', '.')}</time><span>{article.label}</span><Badges item={article} days={days} time={time} /></div>{article.image && <img className="article-image" src={assetUrl(article.image)} alt={article.title} />}<p className="article-body">{article.body}</p><p className="article-signature">田舎家 ぜいご</p></div></section>;
}
