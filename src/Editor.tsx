// © 2026 SIKUMI LAB
import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { Download, GripVertical, ImagePlus, Save, RotateCcw } from 'lucide-react';
import Modal from './Modal';
import PublicationControls from './PublicationControls';
import Badges from './Badges';
import { attachReorder } from './reorder.js';
import { normalizeContent, prepareContent, publicationState, publishedContentChanged, PHOTO_SLOTS, showDate } from './site-features';
import type { Content, MenuItem, NewsItem } from './types';
import { getJapanDate } from './founding';
import { assetUrl } from './assets';
import { STORAGE_KEY, validateContent, contentChanges, MENU_CATEGORIES, MAX_MENU_ITEMS, MAX_IMPORT_BYTES, displayedNews } from './content-model';
export { STORAGE_KEY, validateContent } from './content-model';

const tabs = ['お品書き', 'お知らせ', '写真', '営業情報', 'お問い合わせ', '表示設定'] as const;
export default function Editor({ content, original, onSave, onClose, time, onClockChange }: { content: Content; original: Content; onSave: (c: Content) => void; onClose: () => void; time: number; onClockChange: (time: number | null) => void }) {
  const [draft, setDraft] = useState<Content>(structuredClone(content));
  const [baseline, setBaseline] = useState(content);
  const [tab, setTab] = useState<typeof tabs[number]>('お品書き');
  const [category, setCategory] = useState('うどん');
  const [status, setStatus] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [reading, setReading] = useState(false);
  const [review, setReview] = useState(false);
  const [closeAsked, setCloseAsked] = useState(false);
  const [resetAsked, setResetAsked] = useState(false);
  const [deleteAsked, setDeleteAsked] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<Content | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [clockInput, setClockInput] = useState('');
  const changes = contentChanges(baseline, prepared ?? draft);
  const menu = draft.menu.filter(item => item.category === category);
  const dirty = JSON.stringify(baseline) !== JSON.stringify(draft) || reading;
  useEffect(() => {
    if (!dirty) return;
    function warn(event: BeforeUnloadEvent) { event.preventDefault(); event.returnValue = ''; }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function requestClose() {
    if (closeAsked) { setCloseAsked(false); return; }
    if (dirty) setCloseAsked(true); else onClose();
  }
  useEffect(() => { document.querySelector('.editor-dialog .dialog-scroll')?.scrollTo({top:0}); }, [review, closeAsked, tab]);
  useEffect(() => { if(resetAsked)document.querySelector('.editor-dialog .reset-confirm')?.scrollIntoView({block:'nearest'}); }, [resetAsked]);

  function updateMenu(id: string, patch: Partial<MenuItem>) { setDraft(prev => ({ ...prev, menu: prev.menu.map(item => item.id === id ? { ...item, ...patch } : item) })); }
  function updateNews(id: string, patch: Partial<NewsItem>) { setDraft(prev => ({ ...prev, news: prev.news.map(item => item.id === id ? { ...item, ...patch } : item) })); }
  function moveMenu(id: string, direction: number) {
    setDraft(prev => {
      const items = prev.menu.filter(item => item.category === category);
      const other = items[items.findIndex(item => item.id === id) + direction];
      if (!other) return prev;
      const next = [...prev.menu];
      const a = next.findIndex(item => item.id === id), b = next.findIndex(item => item.id === other.id);
      [next[a], next[b]] = [next[b], next[a]];
      return { ...prev, menu: next };
    });
  }
  useEffect(() => {
    if(tab!=='お品書き'||review||closeAsked||!listRef.current)return;
    const list=listRef.current,scroller=list.closest<HTMLElement>('.dialog-scroll')!;
    return attachReorder(list,(from,to)=>{
      const current=draft.menu.filter(i=>i.category===category);
      if(from===to||!current[from]||!current[to])return;
      const reordered=[...current];reordered.splice(to,0,reordered.splice(from,1)[0]);
      let index=0;const next={...draft,menu:draft.menu.map(i=>i.category===category?reordered[index++]:i)};
      setDraft(next);setPrepared(null);
      setStatus('順番を変更しました。続けて編集し、最後に「変更を保存」でまとめて確認してください。');
    },scroller);
  },[draft,category,tab,review,closeAsked]);
  async function upload(e: ChangeEvent<HTMLInputElement>, apply: (data: string) => void) {
    const input = e.target, file = input.files?.[0];
    if (!file) return;
    setInvalid(false);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8*1024*1024) { setStatus('JPEG・PNG・WebP形式の8MB以下の画像を選んでください。'); setInvalid(true); input.value = ''; return; }
    setReading(true);
    try {
      const bitmap=await createImageBitmap(file);
      let data='';
      try{const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);data=canvas.toDataURL('image/webp',.8);if(data.length>1500000)throw new Error('image too large');}finally{bitmap.close();}
      apply(data); setStatus('写真を読み込みました。容量を整えました。「変更を保存」で確認画面へ進めます。');
    } catch { setStatus('画像を読み込めませんでした。別の画像を選んでください。'); setInvalid(true); }
    finally { setReading(false); input.value = ''; }
  }
  function save() {
    setInvalid(false);
    if (!validateContent(draft)) { setInvalid(true); setStatus('品名・価格、お知らせの日付・タイトル・本文、自由入力バッジ（全角6文字まで）、掲載期間を確認してください。保存は20件、表示は10件が上限です。'); return; }
    if (!changes.length) { setStatus('変更はありません。'); return; }
    try { const next=prepareContent(baseline,draft);if(publishedContentChanged(baseline,next))next.lastUpdated=Date.now();setPrepared(next);setStatus('');setReview(true); }catch(error){setStatus(error instanceof Error?error.message:'掲載期間を確認してください。');setInvalid(true);}
  }
  function commit() {
    let next:Content;
    try { next=prepared ?? prepareContent(baseline,draft); } catch(error) { setInvalid(true);setStatus(error instanceof Error?error.message:'掲載期間を確認してください。');return; }
    try { if(publishedContentChanged(baseline,next))next.lastUpdated=Date.now();localStorage.setItem(STORAGE_KEY, JSON.stringify(next));onSave(structuredClone(next));setDraft(structuredClone(next));setBaseline(structuredClone(next));setPrepared(null); setReview(false); setStatus('このブラウザに保存し、3案すべてに反映しました。'); setInvalid(false); }
    catch { setInvalid(true); setStatus('ブラウザの保存容量が足りません。編集内容は残っています。編集へ戻り、写真を小さくするかJSONを書き出して保管してください。'); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'zeigo-content.json'; a.click(); URL.revokeObjectURL(url);
  }
  async function importFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setInvalid(false);
    try { if (file.size > MAX_IMPORT_BYTES) throw new Error(); const data: unknown = JSON.parse(await file.text()); if (!validateContent(data)) throw new Error(); setDraft(normalizeContent(data));setPrepared(null); setStatus('内容を読み込みました。「変更を保存」で確認画面へ進めます。'); }
    catch { setStatus('読み込めるJSONではありません。このデモから書き出した40MB以下のファイルを選び、内容や件数も確認してください。'); setInvalid(true); }
    e.target.value = '';
  }
  function addNews() {
    if (draft.news.length >= 20) return;
    const today = getJapanDate();
    const date = [today.year, String(today.month).padStart(2, '0'), String(today.day).padStart(2, '0')].join('-');
    setDraft(prev => ({ ...prev, news: [...prev.news, { id: crypto.randomUUID(), date, label: 'お店から', title: '', body: '', visible: true, featured: false,published:true,newEnabled:false,newMode:'auto',badges:[],customBadge:'',customBadgeEnabled:false }] }));
  }
  return <Modal title={closeAsked ? '終了前の確認' : review ? '変更内容の確認' : '内容の編集デモ'} onClose={requestClose} wide className="editor-dialog"
    toolbar={<div className="editor-toolbar"><div className="editor-banner"><div className="editor-service-brand" aria-label="SITE BASE by SIKUMI LAB"><strong>{Array.from('SITE BASE').map((letter,index)=><span key={index}>{letter===' '? '\u00a0':letter}</span>)}</strong><span aria-hidden="true">{Array.from('by SIKUMI LAB').map((letter,index)=><span key={index}>{letter===' '? '\u00a0':letter}</span>)}</span></div><p className="editor-intro">変更はこのブラウザ内のみ。実際のお店のサイトは更新されません。</p></div>{!review && !closeAsked && <div className="editor-tabs" role="tablist" aria-label="編集する内容">{tabs.map((name, index) => <button type="button" role="tab" id={`edit-tab-${index}`} aria-controls="edit-panel" aria-selected={tab === name} tabIndex={tab === name ? 0 : -1} key={name} onClick={() => {setTab(name);document.querySelector('.editor-dialog .dialog-scroll')?.scrollTo({top:0});}} onKeyDown={e => { const next = e.key === 'ArrowRight' ? (index + 1) % tabs.length : e.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1; if (next >= 0) { e.preventDefault(); setTab(tabs[next]);document.querySelector('.editor-dialog .dialog-scroll')?.scrollTo({top:0}); document.getElementById(`edit-tab-${next}`)?.focus(); } }}>{name}</button>)}</div>}</div>}
    footer={<>{closeAsked ? <div className="editor-actions" key="exit"><button className="button primary" type="button" disabled={reading} onClick={() => { setCloseAsked(false); save(); }}>反映する</button><button className="button" type="button" onClick={onClose}>反映せずに終了</button><button className="text-button" type="button" onClick={() => setCloseAsked(false)}>編集を続ける</button></div> : review ? <div className="editor-actions" key="review"><button className="button primary" type="button" onClick={e => { e.preventDefault(); commit(); }}>このブラウザに保存</button><button className="button" type="button" onClick={() => { setReview(false);setPrepared(null); setInvalid(false); setStatus(''); }}>編集へ戻る</button></div> : <div className="editor-actions" key="edit"><button className="button primary" type="submit" form="zeigo-editor-form" disabled={reading}><Save size={17} />変更を保存</button><button className="button" type="button" onClick={download}><Download size={17} />JSONを書き出す</button><label className="button">JSONを読み込む<input className="file-input" type="file" accept="application/json,.json" onChange={e => void importFile(e)} disabled={reading} /></label><button className="text-button" type="button" onClick={() => setResetAsked(!resetAsked)}><RotateCcw size={15} />初期内容に戻す</button></div>}<p className={`editor-status ${invalid ? 'status-error' : ''}`} role="status" aria-live="polite">{status}</p></>}>
    {closeAsked ? <section className="editor-exit-confirm"><h3>変更を反映しますか？</h3><p>まだ反映していない変更があります。「反映する」で変更内容の確認へ進みます。</p></section> : review ? <div className="change-review"><p>次の変更を、このブラウザに保存します。</p><div className="change-list">{changes.map((change, index) => <section className="change-card" key={index}><h3>{change.label}</h3><div className="change-values"><span className="change-before">{change.before}</span><span className="change-arrow" aria-label="から"> → </span><strong>{change.after}</strong></div>{(change.beforeImage || change.afterImage) && <div className="change-columns compact-comparison">{(['before', 'after'] as const).map(side => <div key={side}><span>{side === 'before' ? '変更前の写真' : '変更後の写真'}</span>{change[`${side}Image`] ? <img src={assetUrl(change[`${side}Image`]!)} alt={side === 'before' ? '変更前の写真' : '変更後の写真'} /> : <p>写真なし</p>}</div>)}</div>}</section>)}</div></div> : <>
      <form id="zeigo-editor-form" onSubmit={e => { e.preventDefault(); save(); }}>
        <section className="editor-section" id="edit-panel" role="tabpanel" aria-labelledby={`edit-tab-${tabs.indexOf(tab)}`}>
          {tab === 'お品書き' && <><h3>お品書きの編集</h3><p className="fine-print">カード上部の品名（⋮⋮の目印）を約0.5秒長押しし、カテゴリ内で並べ替えできます。入力欄やボタンは移動の開始対象ではありません。上下ボタンも使えます。非表示にした品もここから再表示できます。</p><label className="editor-category">編集するカテゴリ<select value={category} onChange={e => setCategory(e.target.value)}>{MENU_CATEGORIES.map(name => <option key={name}>{name}</option>)}</select></label><div className="edit-cards" ref={listRef}>{menu.map((item, index) => <article className={`edit-card menu-edit-card item-row reorderable ${item.visible === false ? 'is-hidden' : ''}`} key={item.id} data-id={item.id} data-index={index}><div className="edit-card-heading"><h4><GripVertical className="menu-drag-handle" size={20} aria-hidden="true" />{item.name || '新しい品'}</h4><span className="edit-state">{publicationState(item,time)}</span></div><Badges item={item} days={draft.newDays ?? 14} time={time} /><div className="edit-fields"><label>品名<input maxLength={100} required value={item.name} onChange={e => updateMenu(item.id, { name: e.target.value })} /></label><label>価格（円・税込）<input aria-label={`${item.name || '新しい品'}の価格`} type="number" min="0" max="1000000" step="1" required value={Number.isNaN(item.price) ? '' : item.price} onChange={e => updateMenu(item.id, { price: e.target.value === '' ? NaN : Number(e.target.value) })} /></label><label>カテゴリ<select value={item.category} onChange={e => updateMenu(item.id, { category: e.target.value })}>{MENU_CATEGORIES.map(name => <option key={name}>{name}</option>)}</select></label><label>注記（任意）<input maxLength={100} value={item.note ?? ''} onChange={e => updateMenu(item.id, { note: e.target.value })} /></label></div><PublicationControls item={item} days={draft.newDays ?? 14} update={patch=>updateMenu(item.id,patch)} /><div className="edit-card-actions row-controls"><button className="button" type="button" onClick={() => updateMenu(item.id, { visible: item.visible === false })}>{item.visible === false ? '再表示する' : '非表示にする'}</button><button className="button" type="button" disabled={index === 0} onClick={() => moveMenu(item.id, -1)}>上へ</button><button className="button" type="button" disabled={index === menu.length - 1} onClick={() => moveMenu(item.id, 1)}>下へ</button></div></article>)}</div><button className="button" type="button" disabled={draft.menu.length >= MAX_MENU_ITEMS} onClick={() => setDraft(prev => ({ ...prev, menu: [...prev.menu, { id: crypto.randomUUID(), category, name: '', price: 0, visible: true,published:true,newEnabled:false,newMode:'auto',badges:[],customBadge:'',customBadgeEnabled:false }] }))}>品を追加する</button></>}
          {tab === 'お知らせ' && <><h3>お知らせの編集</h3><p className="news-count">保存 {draft.news.length} / 20件（非表示を含む）・トップ表示 {displayedNews(draft,time).length} / 10件</p><p className="fine-print">ピックアップを優先し、それぞれ日付の新しい順に最大10件を表示します。「表示対象」でも順位が11件目以降の記事はトップに出ません。写真はJPEG・PNG・WebP、各8MB以下（保存時に縮小・容量調整）です。表示枠に合わせて中央を自動で切り取ります。</p><div className="edit-cards">{draft.news.map(item => <article className={`edit-card news-edit-card ${item.visible === false ? 'is-hidden' : ''}`} key={item.id} data-id={item.id}><div className="edit-card-heading"><h4>{item.title || '新しいお知らせ'}</h4><span className="edit-state">{publicationState(item,time)}</span></div><Badges item={item} days={draft.newDays ?? 14} time={time} /><div className="edit-fields"><label>日付<input type="date" required value={item.date.replaceAll('.', '-')} onChange={e => updateNews(item.id, { date: e.target.value })} /></label><label>種類<input maxLength={40} required value={item.label} onChange={e => updateNews(item.id, { label: e.target.value })} /></label><label className="field-wide">タイトル<input maxLength={140} required value={item.title} onChange={e => updateNews(item.id, { title: e.target.value })} /></label><label className="field-wide">本文<textarea aria-label="本文" maxLength={5000} rows={5} required value={item.body} onChange={e => updateNews(item.id, { body: e.target.value })} /></label></div><PublicationControls item={item} days={draft.newDays ?? 14} update={patch=>updateNews(item.id,patch)} /><div className="news-photo-edit">{item.image && <img src={assetUrl(item.image)} alt="お知らせの写真" />}<label className="upload-button"><ImagePlus size={16} />写真を選ぶ<input type="file" accept="image/jpeg,image/png,image/webp" disabled={reading} onChange={e => void upload(e, data => updateNews(item.id, { image: data }))} /></label>{item.image && <button className="text-button" type="button" onClick={() => updateNews(item.id, { image: '' })}>写真を外す</button>}</div><div className="edit-card-actions"><label className="check-field"><input type="checkbox" checked={item.visible !== false} onChange={e => updateNews(item.id, { visible: e.target.checked })} />表示対象</label><label className="check-field"><input type="checkbox" checked={!!item.featured} onChange={e => updateNews(item.id, { featured: e.target.checked })} />ピックアップ</label><button className="text-button" type="button" onClick={() => setDeleteAsked(item.id)}>削除する</button></div>{deleteAsked === item.id && <div className="reset-confirm"><p>この記事を削除しますか？保存前なら、編集画面を閉じると元の内容に戻ります。</p><button className="button" type="button" onClick={() => { setDraft(prev => ({ ...prev, news: prev.news.filter(n => n.id !== item.id) })); setDeleteAsked(null); }}>削除を確認</button><button className="text-button" type="button" onClick={() => setDeleteAsked(null)}>キャンセル</button></div>}</article>)}</div><button className="button" type="button" disabled={draft.news.length >= 20} onClick={addNews}>お知らせを追加する</button>{draft.news.length >= 20 && <p className="fine-print">保存上限の20件です。追加する場合は、不要になった記事を削除してください。非表示にしても保存件数は減りません。</p>}</>}
          {tab === '写真' && <><h3>写真を差し替える</h3><p className="fine-print">JPEG・PNG・WebP、各8MB以下（保存時に縮小・容量調整）。表示枠に合わせて中央を自動で切り取ります。</p><div className="photo-edit-grid">{PHOTO_SLOTS.map(({id:key,label}) => <div className="photo-edit" key={key}><img src={assetUrl(draft.photos[key] ?? '/images/m4.jpg')} alt={label} /><label className="upload-button"><ImagePlus size={16} />{label}を変更<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => void upload(e, data => setDraft(prev => ({ ...prev, photos: { ...prev.photos, [key]: data } })))} disabled={reading} /></label></div>)}</div></>}
          {tab === '営業情報' && <><h3>営業情報</h3><div className="shop-edit-grid">{([['hours', '通常の営業時間'], ['lateHours', '土曜日の営業時間'], ['closed', '定休日']] as const).map(([key, label]) => <label key={key}>{label}<input maxLength={299} value={draft.shop[key]} required onChange={e => setDraft(prev => ({ ...prev, shop: { ...prev.shop, [key]: e.target.value } }))} /></label>)}</div></>}
          {tab==='お問い合わせ' && <><h3>受付履歴・対応状況</h3><p className="fine-print">架空の受付内容を、このブラウザ内で管理します。返信は本番では普段のメールから行います。見本のメール通知は未送信です。</p><div className="edit-cards">{draft.inquiries?.map(inquiry=><article className="edit-card inquiry-card" key={inquiry.id}><h4>{inquiry.name}</h4><p>{showDate(inquiry.receivedAt,true)} / {inquiry.kind}</p><p>{inquiry.email}</p><p className="inquiry-body">{inquiry.body}</p><p>{inquiry.notification}</p><div className="edit-fields"><label>対応状況<select aria-label="対応状況" value={inquiry.status} onChange={e=>setDraft(prev=>({...prev,inquiries:prev.inquiries?.map(i=>i.id===inquiry.id?{...i,status:e.target.value as typeof inquiry.status}:i)}))}>{['未対応','対応中','対応済み'].map(status=><option key={status}>{status}</option>)}</select></label><label>内部メモ<textarea aria-label="内部メモ" maxLength={2000} value={inquiry.memo} onChange={e=>setDraft(prev=>({...prev,inquiries:prev.inquiries?.map(i=>i.id===inquiry.id?{...i,memo:e.target.value}:i)}))} /></label></div></article>)}</div>{!draft.inquiries?.length&&<p>このブラウザで受け付けたお問い合わせはありません。</p>}</>}
          {tab==='表示設定' && <><h3>NEWの共通設定と表示確認</h3><div className="edit-fields"><label>NEWの共通日数<input type="number" min={1} max={365} required value={draft.newDays ?? 14} onChange={e=>setDraft(prev=>({...prev,newDays:Number(e.target.value)}))} /></label><label>表示確認時刻<input type="datetime-local" value={clockInput} onChange={e=>setClockInput(e.target.value)} /></label></div><p className="fine-print">現在の表示確認時刻：{showDate(time,true)}。日数の変更は既存のNEWにも適用します。確認時刻は表示判定だけに使い、公開操作の時刻は変更しません。</p><div className="edit-card-actions"><button type="button" className="button" onClick={()=>{const value=new Date(clockInput).getTime();if(!Number.isFinite(value)){setInvalid(true);setStatus('表示確認する日時を入力してください。');return;}onClockChange(value);}}>表示確認時刻を変更</button><button type="button" className="button" onClick={()=>{onClockChange(null);setClockInput('');}}>現在時刻に戻す</button></div></>}
        </section>

        {resetAsked && <div className="reset-confirm"><p>このブラウザに保存した内容と編集中の内容を消し、初期のお品書き・お知らせ・写真・営業情報に戻します。</p><button type="button" className="button" onClick={() => { try { localStorage.removeItem(STORAGE_KEY); const next = normalizeContent(original); setDraft(next); setBaseline(next); onSave(next); setResetAsked(false); setDeleteAsked(null); setPrepared(null);setStatus('初期内容に戻しました。'); setInvalid(false); } catch { setStatus('保存内容を削除できませんでした。ブラウザの設定を確認してください。'); setInvalid(true); } }}>初期内容に戻す</button><button type="button" className="text-button" onClick={() => setResetAsked(false)}>キャンセル</button></div>}
      </form>
    </>}
  </Modal>;
}
