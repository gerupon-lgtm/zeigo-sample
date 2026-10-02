import { useState, type ChangeEvent } from 'react';
import { Download, ImagePlus, Save, RotateCcw } from 'lucide-react';
import Modal from './Modal';
import type { Content } from './types';
import { getJapanDate, isFoundingDate } from './founding';
import { assetUrl } from './assets';

export const STORAGE_KEY = 'zeigo-proposal-content-v1';
export function validateContent(value: unknown): value is Content {
  if (!value || typeof value !== 'object') return false;
  const c = value as Content;
  const safePhoto = (v: unknown) => typeof v === 'string' && (/^\/images\/[a-zA-Z0-9._-]+$/.test(v) || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v));
  const shopKeys = ['name', 'reading', 'founded', 'address', 'phone', 'hours', 'lateHours', 'closed', 'parking', 'instagram'] as const;
  return c.schemaVersion === 1 && !!c.shop && shopKeys.every(k => typeof c.shop[k] === 'string' && c.shop[k].length < 300) && /^https:\/\/www\.instagram\.com\//.test(c.shop.instagram) && /^[0-9-]{8,20}$/.test(c.shop.phone)
    && (c.shop.foundedYear === undefined || (Number.isInteger(c.shop.foundedYear) && c.shop.foundedYear >= 1800 && c.shop.foundedYear <= getJapanDate().year))
    && (c.shop.foundedDate == null || isFoundingDate(c.shop.foundedDate, c.shop.foundedYear ?? 1979))
    && !!c.photos && ['hero', 'udon', 'exterior', 'interior'].every(k => safePhoto(c.photos[k as keyof Content['photos']]))
    && Array.isArray(c.menu) && c.menu.length > 0 && c.menu.length < 200 && new Set(c.menu.map(m => m.id)).size === c.menu.length && c.menu.every(m => typeof m.id === 'string' && typeof m.name === 'string' && typeof m.category === 'string' && Number.isSafeInteger(m.price) && m.price >= 0 && m.price <= 1000000 && (m.note === undefined || typeof m.note === 'string'))
    && Array.isArray(c.news) && c.news.length < 50 && c.news.every(n => ['id', 'date', 'label', 'title', 'body'].every(k => typeof n[k as keyof typeof n] === 'string'));
}

export default function Editor({ content, original, onSave, onClose }: { content: Content; original: Content; onSave: (c: Content) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<Content>(structuredClone(content));
  const [status, setStatus] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [reading, setReading] = useState(false);
  const [resetAsked, setResetAsked] = useState(false);
  async function upload(e: ChangeEvent<HTMLInputElement>, field: keyof Content['photos']) {
    const file = e.target.files?.[0];
    if (!file) return;
    setInvalid(false);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) { setStatus('JPEG・PNG・WebP形式の1MB以下の画像を選んでください。'); setInvalid(true); e.target.value = ''; return; }
    setReading(true);
    try {
      const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
      await new Promise<void>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(); img.onerror = reject; img.src = data; });
      setDraft(prev => ({ ...prev, photos: { ...prev.photos, [field]: data } }));
      setStatus('写真を読み込みました。「変更を保存」でサイトに反映します。');
    } catch { setStatus('画像を読み込めませんでした。別の画像を選んでください。'); setInvalid(true); }
    finally { setReading(false); e.target.value = ''; }
  }
  function save() {
    setInvalid(false);
    if (!validateContent(draft)) { setInvalid(true); setStatus('価格は0〜1,000,000円の整数で入力してください。店舗情報の入力も確認してください。'); return; }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); onSave(structuredClone(draft)); setStatus('このブラウザに保存し、3案すべてに反映しました。'); }
    catch { setInvalid(true); setStatus('保存容量が足りません。画像を小さくするか、JSONを書き出して内容を保管してください。'); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'zeigo-content.json'; a.click(); URL.revokeObjectURL(url);
  }
  async function importFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setInvalid(false);
    try { if (file.size > 5 * 1024 * 1024) throw new Error(); const data: unknown = JSON.parse(await file.text()); if (!validateContent(data)) throw new Error(); setDraft(data); setStatus('内容を読み込みました。「変更を保存」で反映します。'); }
    catch { setStatus('読み込めるJSONではありません。このデモから書き出した5MB以下のファイルを選んでください。'); setInvalid(true); }
    e.target.value = '';
  }
  return <Modal title="写真・価格の編集デモ" onClose={onClose} wide>
    <p className="editor-intro">写真や価格を変えると、3つのデザインに同じ内容が反映されます。<br /><strong>この端末・ブラウザ内だけの保存です。実際のお店のサイトは更新されません。</strong></p>
    <form onSubmit={e => { e.preventDefault(); save(); }}>
      <section className="editor-section"><h3>写真を差し替える</h3><p className="fine-print">JPEG・PNG・WebP、各1MB以下。横長の写真がおすすめです。</p>
        <div className="photo-edit-grid">{([['hero', 'そば・メイン写真'], ['udon', 'うどん写真'], ['exterior', 'お店の外観']] as const).map(([key, label]) => <div className="photo-edit" key={key}>
          <img src={assetUrl(draft.photos[key])} alt={label} /><label className="upload-button"><ImagePlus size={16} />{label}を変更<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => void upload(e, key)} disabled={reading} /></label>
        </div>)}</div>
      </section>
      <section className="editor-section"><h3>お品書きの価格</h3><div className="price-edit-grid">{draft.menu.map(item => <label key={item.id} className="price-edit"><span>{item.name}</span><span><input aria-label={`${item.name}の価格`} type="number" min="0" max="1000000" step="1" required value={Number.isNaN(item.price) ? '' : item.price} onChange={e => setDraft(prev => ({ ...prev, menu: prev.menu.map(m => m.id === item.id ? { ...m, price: e.target.value === '' ? NaN : Number(e.target.value) } : m) }))} />円</span></label>)}</div></section>
      <section className="editor-section"><h3>営業情報</h3><div className="shop-edit-grid">{([['hours', '通常の営業時間'], ['lateHours', '土曜日の営業時間'], ['closed', '定休日']] as const).map(([key, label]) => <label key={key}>{label}<input value={draft.shop[key]} required onChange={e => setDraft(prev => ({ ...prev, shop: { ...prev.shop, [key]: e.target.value } }))} /></label>)}</div></section>
      <div className="editor-actions"><button className="button primary" type="submit" disabled={reading}><Save size={17} />変更を保存</button><button className="button" type="button" onClick={download}><Download size={17} />JSONを書き出す</button><label className="button">JSONを読み込む<input className="file-input" type="file" accept="application/json,.json" onChange={e => void importFile(e)} /></label><button className="text-button" type="button" onClick={() => setResetAsked(!resetAsked)}><RotateCcw size={15} />初期内容に戻す</button></div>
      {resetAsked && <div className="reset-confirm"><p>保存した内容を消して、初期の写真・価格に戻します。</p><button type="button" className="button" onClick={() => { localStorage.removeItem(STORAGE_KEY); const next = structuredClone(original); setDraft(next); onSave(next); setResetAsked(false); setStatus('初期内容に戻しました。'); setInvalid(false); }}>初期内容に戻す</button><button type="button" className="text-button" onClick={() => setResetAsked(false)}>キャンセル</button></div>}
      <p className={`editor-status ${invalid ? 'status-error' : ''}`} role="status" aria-live="polite">{status}</p>
    </form>
  </Modal>;
}
