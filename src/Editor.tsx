import { useState, type ChangeEvent } from 'react';
import { Download, ImagePlus, Save, RotateCcw } from 'lucide-react';
import Modal from './Modal';
import type { Content, MenuItem, NewsItem } from './types';
import { getJapanDate } from './founding';
import { assetUrl } from './assets';
import { STORAGE_KEY, validateContent, contentChanges, MENU_CATEGORIES, MAX_MENU_ITEMS, MAX_IMPORT_BYTES, displayedNews } from './content-model';
export { STORAGE_KEY, validateContent } from './content-model';

const tabs = ['お品書き', 'お知らせ', '写真', '営業情報'] as const;
export default function Editor({ content, original, onSave, onClose }: { content: Content; original: Content; onSave: (c: Content) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<Content>(structuredClone(content));
  const [baseline, setBaseline] = useState(content);
  const [tab, setTab] = useState<typeof tabs[number]>('お品書き');
  const [category, setCategory] = useState('うどん');
  const [status, setStatus] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [reading, setReading] = useState(false);
  const [review, setReview] = useState(false);
  const [resetAsked, setResetAsked] = useState(false);
  const [deleteAsked, setDeleteAsked] = useState<string | null>(null);
  const changes = contentChanges(baseline, draft);
  const menu = draft.menu.filter(item => item.category === category);
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
  async function upload(e: ChangeEvent<HTMLInputElement>, apply: (data: string) => void) {
    const input = e.target, file = input.files?.[0];
    if (!file) return;
    setInvalid(false);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) { setStatus('JPEG・PNG・WebP形式の1MB以下の画像を選んでください。'); setInvalid(true); input.value = ''; return; }
    setReading(true);
    try {
      const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
      await new Promise<void>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(); img.onerror = reject; img.src = data; });
      apply(data); setStatus('写真を読み込みました。「変更を保存」で確認画面へ進めます。');
    } catch { setStatus('画像を読み込めませんでした。別の画像を選んでください。'); setInvalid(true); }
    finally { setReading(false); input.value = ''; }
  }
  function save() {
    setInvalid(false);
    if (!validateContent(draft)) { setInvalid(true); setStatus('品名・価格、お知らせの日付・タイトル・本文を確認してください。保存は20件、表示は10件が上限です。'); return; }
    if (!changes.length) { setStatus('変更はありません。'); return; }
    setStatus(''); setReview(true);
  }
  function commit() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); onSave(structuredClone(draft)); setBaseline(structuredClone(draft)); setReview(false); setStatus('このブラウザに保存し、3案すべてに反映しました。'); setInvalid(false); }
    catch { setInvalid(true); setStatus('ブラウザの保存容量が足りません。編集内容は残っています。編集へ戻り、写真を小さくするかJSONを書き出して保管してください。'); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'zeigo-content.json'; a.click(); URL.revokeObjectURL(url);
  }
  async function importFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setInvalid(false);
    try { if (file.size > MAX_IMPORT_BYTES) throw new Error(); const data: unknown = JSON.parse(await file.text()); if (!validateContent(data)) throw new Error(); setDraft(data); setStatus('内容を読み込みました。「変更を保存」で確認画面へ進めます。'); }
    catch { setStatus('読み込めるJSONではありません。このデモから書き出した40MB以下のファイルを選び、内容や件数も確認してください。'); setInvalid(true); }
    e.target.value = '';
  }
  function addNews() {
    if (draft.news.length >= 20) return;
    const today = getJapanDate();
    const date = [today.year, String(today.month).padStart(2, '0'), String(today.day).padStart(2, '0')].join('-');
    setDraft(prev => ({ ...prev, news: [...prev.news, { id: crypto.randomUUID(), date, label: 'お店から', title: '', body: '', visible: true, featured: false }] }));
  }
  return <Modal title={review ? '変更内容の確認' : '内容の編集デモ'} onClose={onClose} wide>
    <p className="editor-intro">お品書き・お知らせ・写真・営業情報を、3つのデザインに反映できます。<br /><strong>この端末・ブラウザ内だけの保存です。実際のお店のサイトは更新されません。</strong></p>
    {review ? <div className="change-review"><p>次の変更を、このブラウザに保存します。</p><div className="change-list">{changes.map((change, index) => <section className="change-card" key={index}><h3>{change.label}</h3><div className="change-columns">{(['before', 'after'] as const).map(side => <div key={side}><strong>{side === 'before' ? '変更前' : '変更後'}</strong>{change[`${side}Image`] && <img src={assetUrl(change[`${side}Image`]!)} alt={side === 'before' ? '変更前の写真' : '変更後の写真'} />}<p>{change[side]}</p></div>)}</div></section>)}</div><div className="editor-actions"><button className="button primary" onClick={commit}>このブラウザに保存</button><button className="button" onClick={() => { setReview(false); setInvalid(false); setStatus(''); }}>編集へ戻る</button></div></div> : <>
      <div className="editor-tabs" role="tablist" aria-label="編集する内容">{tabs.map((name, index) => <button type="button" role="tab" id={`edit-tab-${index}`} aria-controls="edit-panel" aria-selected={tab === name} tabIndex={tab === name ? 0 : -1} key={name} onClick={() => setTab(name)} onKeyDown={e => { const next = e.key === 'ArrowRight' ? (index + 1) % tabs.length : e.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1; if (next >= 0) { e.preventDefault(); setTab(tabs[next]); document.getElementById(`edit-tab-${next}`)?.focus(); } }}>{name}</button>)}</div>
      <form onSubmit={e => { e.preventDefault(); save(); }}>
        <section className="editor-section" id="edit-panel" role="tabpanel" aria-labelledby={`edit-tab-${tabs.indexOf(tab)}`}>
          {tab === 'お品書き' && <><h3>お品書きの編集</h3><p className="fine-print">上下ボタンでカテゴリ内の順番を変更できます。非表示にした品もここから再表示できます。</p><label className="editor-category">編集するカテゴリ<select value={category} onChange={e => setCategory(e.target.value)}>{MENU_CATEGORIES.map(name => <option key={name}>{name}</option>)}</select></label><div className="edit-cards">{menu.map((item, index) => <article className={`edit-card menu-edit-card ${item.visible === false ? 'is-hidden' : ''}`} key={item.id} data-id={item.id}><div className="edit-card-heading"><h4>{item.name || '新しい品'}</h4><span className="edit-state">{item.visible === false ? '非表示' : '表示'}</span></div><div className="edit-fields"><label>品名<input maxLength={100} required value={item.name} onChange={e => updateMenu(item.id, { name: e.target.value })} /></label><label>価格（円・税込）<input aria-label={`${item.name || '新しい品'}の価格`} type="number" min="0" max="1000000" step="1" required value={Number.isNaN(item.price) ? '' : item.price} onChange={e => updateMenu(item.id, { price: e.target.value === '' ? NaN : Number(e.target.value) })} /></label><label>カテゴリ<select value={item.category} onChange={e => updateMenu(item.id, { category: e.target.value })}>{MENU_CATEGORIES.map(name => <option key={name}>{name}</option>)}</select></label><label>注記（任意）<input maxLength={100} value={item.note ?? ''} onChange={e => updateMenu(item.id, { note: e.target.value })} /></label></div><div className="edit-card-actions"><button className="button" type="button" onClick={() => updateMenu(item.id, { visible: item.visible === false })}>{item.visible === false ? '再表示する' : '非表示にする'}</button><button className="button" type="button" disabled={index === 0} onClick={() => moveMenu(item.id, -1)}>上へ</button><button className="button" type="button" disabled={index === menu.length - 1} onClick={() => moveMenu(item.id, 1)}>下へ</button></div></article>)}</div><button className="button" type="button" disabled={draft.menu.length >= MAX_MENU_ITEMS} onClick={() => setDraft(prev => ({ ...prev, menu: [...prev.menu, { id: crypto.randomUUID(), category, name: '', price: 0, visible: true }] }))}>品を追加する</button></>}
          {tab === 'お知らせ' && <><h3>お知らせの編集</h3><p className="news-count">保存 {draft.news.length} / 20件（非表示を含む）・トップ表示 {displayedNews(draft).length} / 10件</p><p className="fine-print">ピックアップを優先し、それぞれ日付の新しい順に最大10件を表示します。「表示対象」でも順位が11件目以降の記事はトップに出ません。写真はJPEG・PNG・WebP、各1MB以下です。</p><div className="edit-cards">{draft.news.map(item => <article className={`edit-card news-edit-card ${item.visible === false ? 'is-hidden' : ''}`} key={item.id} data-id={item.id}><div className="edit-card-heading"><h4>{item.title || '新しいお知らせ'}</h4><span className="edit-state">{item.visible === false ? '非表示' : '表示対象'}</span></div><div className="edit-fields"><label>日付<input type="date" required value={item.date.replaceAll('.', '-')} onChange={e => updateNews(item.id, { date: e.target.value })} /></label><label>種類<input maxLength={40} required value={item.label} onChange={e => updateNews(item.id, { label: e.target.value })} /></label><label className="field-wide">タイトル<input maxLength={140} required value={item.title} onChange={e => updateNews(item.id, { title: e.target.value })} /></label><label className="field-wide">本文<textarea maxLength={5000} rows={5} required value={item.body} onChange={e => updateNews(item.id, { body: e.target.value })} /></label></div><div className="news-photo-edit">{item.image && <img src={assetUrl(item.image)} alt="お知らせの写真" />}<label className="upload-button"><ImagePlus size={16} />写真を選ぶ<input type="file" accept="image/jpeg,image/png,image/webp" disabled={reading} onChange={e => void upload(e, data => updateNews(item.id, { image: data }))} /></label>{item.image && <button className="text-button" type="button" onClick={() => updateNews(item.id, { image: '' })}>写真を外す</button>}</div><div className="edit-card-actions"><label className="check-field"><input type="checkbox" checked={item.visible !== false} onChange={e => updateNews(item.id, { visible: e.target.checked })} />表示対象</label><label className="check-field"><input type="checkbox" checked={!!item.featured} onChange={e => updateNews(item.id, { featured: e.target.checked })} />ピックアップ</label><button className="text-button" type="button" onClick={() => setDeleteAsked(item.id)}>削除する</button></div>{deleteAsked === item.id && <div className="reset-confirm"><p>この記事を削除しますか？保存前なら、編集画面を閉じると元の内容に戻ります。</p><button className="button" type="button" onClick={() => { setDraft(prev => ({ ...prev, news: prev.news.filter(n => n.id !== item.id) })); setDeleteAsked(null); }}>削除を確認</button><button className="text-button" type="button" onClick={() => setDeleteAsked(null)}>キャンセル</button></div>}</article>)}</div><button className="button" type="button" disabled={draft.news.length >= 20} onClick={addNews}>お知らせを追加する</button>{draft.news.length >= 20 && <p className="fine-print">保存上限の20件です。追加する場合は、不要になった記事を削除してください。非表示にしても保存件数は減りません。</p>}</>}
          {tab === '写真' && <><h3>写真を差し替える</h3><p className="fine-print">JPEG・PNG・WebP、各1MB以下。横長の写真がおすすめです。</p><div className="photo-edit-grid">{([['hero', 'そば・メイン写真'], ['udon', 'うどん写真'], ['exterior', 'お店の外観']] as const).map(([key, label]) => <div className="photo-edit" key={key}><img src={assetUrl(draft.photos[key])} alt={label} /><label className="upload-button"><ImagePlus size={16} />{label}を変更<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => void upload(e, data => setDraft(prev => ({ ...prev, photos: { ...prev.photos, [key]: data } })))} disabled={reading} /></label></div>)}</div></>}
          {tab === '営業情報' && <><h3>営業情報</h3><div className="shop-edit-grid">{([['hours', '通常の営業時間'], ['lateHours', '土曜日の営業時間'], ['closed', '定休日']] as const).map(([key, label]) => <label key={key}>{label}<input maxLength={299} value={draft.shop[key]} required onChange={e => setDraft(prev => ({ ...prev, shop: { ...prev.shop, [key]: e.target.value } }))} /></label>)}</div></>}
        </section>
        <div className="editor-actions"><button className="button primary" type="submit" disabled={reading}><Save size={17} />変更を保存</button><button className="button" type="button" onClick={download}><Download size={17} />JSONを書き出す</button><label className="button">JSONを読み込む<input className="file-input" type="file" accept="application/json,.json" onChange={e => void importFile(e)} disabled={reading} /></label><button className="text-button" type="button" onClick={() => setResetAsked(!resetAsked)}><RotateCcw size={15} />初期内容に戻す</button></div>
        {resetAsked && <div className="reset-confirm"><p>このブラウザに保存した内容と編集中の内容を消し、初期のお品書き・お知らせ・写真・営業情報に戻します。</p><button type="button" className="button" onClick={() => { try { localStorage.removeItem(STORAGE_KEY); const next = structuredClone(original); setDraft(next); setBaseline(next); onSave(next); setResetAsked(false); setDeleteAsked(null); setStatus('初期内容に戻しました。'); setInvalid(false); } catch { setStatus('保存内容を削除できませんでした。ブラウザの設定を確認してください。'); setInvalid(true); } }}>初期内容に戻す</button><button type="button" className="text-button" onClick={() => setResetAsked(false)}>キャンセル</button></div>}
      </form>
    </>}
    <p className={`editor-status ${invalid ? 'status-error' : ''}`} role="status" aria-live="polite">{status}</p>
  </Modal>;
}
