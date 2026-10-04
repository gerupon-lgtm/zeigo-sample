// © 2026 SIKUMI LAB — Fixed desktop detail / mobile bottom panel.
import { useLayoutEffect, useRef, useState } from 'react';
import type { NewsItem } from './types';
import { assetUrl } from './assets';
import Badges from './Badges';
export default function NewsDetail({ article, trigger, days, time, close }: { article: NewsItem; trigger: HTMLButtonElement; days: number; time: number; close: () => void }) {
  const panel = useRef<HTMLElement>(null);
  const [position, setPosition] = useState<{ left?: number; top?: number; maxHeight?: number }>({});
  useLayoutEffect(() => {
    const element = panel.current!;
    function place() {
      const headerBottom=document.querySelector('.site-header')!.getBoundingClientRect().bottom;
      if (matchMedia('(max-width:700px)').matches) { setPosition({maxHeight:Math.max(0,Math.min(innerHeight*.7,innerHeight-headerBottom-12))}); return; }
      const width = element.getBoundingClientRect().width, top = Math.max(96, headerBottom + 16);
      setPosition({ left: Math.max(16, (innerWidth - width) / 2), top, maxHeight: Math.max(0, innerHeight - top - 16) });
    }
    function outside(event: PointerEvent) { if(!element.contains(event.target as Node) && !trigger.contains(event.target as Node))close(); }
    function key(event: KeyboardEvent) { if(event.key==='Escape'){close();trigger.focus({preventScroll:true});} }
    place(); document.addEventListener('pointerdown', outside);document.addEventListener('keydown', key);window.addEventListener('resize', place);window.addEventListener('scroll', place, true);
    const observer = new ResizeObserver(place);observer.observe(element);
    return () => { observer.disconnect();document.removeEventListener('pointerdown', outside);document.removeEventListener('keydown', key);window.removeEventListener('resize', place);window.removeEventListener('scroll', place, true); };
  }, [article, trigger, close]);
  return <section className="news-detail" ref={panel} style={position} role="dialog" aria-labelledby="news-detail-title" id="news-detail"><div className="news-detail-heading"><h2 id="news-detail-title">{article.title}</h2><button onClick={() => { close();trigger.focus({preventScroll:true}); }} aria-label="閉じる" className="news-detail-close">閉じる</button></div><div className="news-detail-content"><div className="article-meta"><time>{article.date.replaceAll('-', '.')}</time><span>{article.label}</span><Badges item={article} days={days} time={time} /></div>{article.image && <img className="article-image" src={assetUrl(article.image)} alt={article.title} />}<p className="article-body">{article.body}</p><p className="article-signature">田舎家 ぜいご</p></div></section>;
}
