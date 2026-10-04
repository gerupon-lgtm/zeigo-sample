// © 2026 SIKUMI LAB
import type { Publication } from './types';
import { BADGE_OPTIONS, badgeIds, badgeLength, CUSTOM_BADGE_LIMIT, localDateTime } from './site-features';
export default function PublicationControls({ item, days, update }: { item: Publication; days: number; update: (patch: Partial<Publication>) => void }) {
  return <details className="publication-settings"><summary>バッジ・掲載期間の設定</summary>
    <fieldset className="badge-settings"><legend>表示するバッジ（複数選択）</legend><div className="badge-choices">
      {BADGE_OPTIONS.map(option => <label className="check-field" key={option.id}><input type="checkbox" aria-label={option.label} checked={badgeIds(item).includes(option.id)} onChange={e => update({ badges: e.target.checked ? [...badgeIds(item), option.id] : badgeIds(item).filter(id => id !== option.id) })} />{option.label}</label>)}
      <label className="check-field"><input type="checkbox" checked={!!item.newEnabled} onChange={e => update({ newEnabled: e.target.checked })} />NEWを付ける</label>
      <label className="check-field"><input type="checkbox" checked={!!item.customBadgeEnabled} onChange={e => update({ customBadgeEnabled: e.target.checked })} />自由入力を付ける</label>
    </div><label className="custom-badge-field">自由入力（全角6文字まで・1つ）<input maxLength={60} value={item.customBadge ?? ''} onChange={e => update({ customBadge: e.target.value })} placeholder="例：予約限定" /></label>
    <p className={badgeLength(item.customBadge ?? '') > CUSTOM_BADGE_LIMIT ? 'status-error' : 'fine-print'}>{badgeLength(item.customBadge ?? '')} / {CUSTOM_BADGE_LIMIT}文字</p>
    {item.newEnabled && <><label className="custom-badge-field">NEWの消し方<select aria-label="NEWの消し方" value={item.newMode ?? 'auto'} onChange={e => update({ newMode: e.target.value as 'auto' | 'manual' })}><option value="auto">{days}日後に自動で消す</option><option value="manual">手動で外すまで残す</option></select></label>
      <label className="check-field"><input type="checkbox" checked={!!item.reapplyNew} onChange={e => update({ reapplyNew: e.target.checked })} />今回の公開でNEWを付け直す</label></>}
    <p className="fine-print">通常の編集ではNEWの期間を延ばしません。NEW以外はチェックを外すまで残ります。「終了」は表示用の言葉で、掲載期間とは別です。</p></fieldset>
    <div className="edit-fields"><label>公開日時（空欄なら今すぐ）<input type="datetime-local" value={localDateTime(item.startAt)} onChange={e => update({ startAt: e.target.value ? new Date(e.target.value).getTime() : null })} /></label>
      <label>終了日時（空欄なら終了なし）<input type="datetime-local" value={localDateTime(item.endAt)} onChange={e => update({ endAt: e.target.value ? new Date(e.target.value).getTime() : null })} /></label></div>
    <label className="check-field"><input type="checkbox" checked={item.published !== false} onChange={e => update({ published: e.target.checked })} />公開する（外すと下書き）</label>
  </details>;
}
