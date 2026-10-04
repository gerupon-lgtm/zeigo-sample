// © 2026 SIKUMI LAB
import { useState, type FormEvent } from 'react';
import type { Inquiry } from './types';
export default function Contact({ submit }: { submit: (inquiry: Inquiry) => boolean }) {
  const [message, setMessage] = useState('');
  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget, values = new FormData(form);
    const email = String(values.get('email')).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setMessage('受信できるメールアドレスを入力してください。'); return; }
    if (email !== String(values.get('email2')).trim()) { setMessage('メールアドレスの入力が一致していません。'); return; }
    const name = String(values.get('name')).trim(), body = String(values.get('body')).trim();
    if (!name || !body) { setMessage('お名前とお問い合わせ内容を入力してください。'); return; }
    const inquiry: Inquiry = { id: crypto.randomUUID(), name, email, kind: values.get('kind') as Inquiry['kind'], body, receivedAt: Date.now(), status: '未対応', memo: '', notification: '未送信（サンプル）' };
    if (!submit(inquiry)) { setMessage('保存できませんでした。入力内容は残しています。ブラウザの保存容量や設定を確認してください。'); return; }
    form.reset();setMessage('架空のお問い合わせを、このブラウザに保存しました。編集デモの「お問い合わせ」で確認できます。メールは送信していません。');
  }
  return <section className="section-shell contact-section" id="contact"><div className="section-title"><span className="little-line" /><p>お問い合わせ</p><h2>ご相談を、こちらから。</h2><p className="contact-demo-note">このフォームは操作サンプルです。架空の内容でお試しください。<br />実際のお店には送信されず、このブラウザ内だけに保存されます。</p></div>
    <form className="contact-form" onSubmit={send}><label>お名前<input name="name" maxLength={80} required autoComplete="off" placeholder="デモ 太郎" /></label><label>メールアドレス<input type="email" name="email" maxLength={150} required autoComplete="off" placeholder="sample@example.com" /></label><label>メールアドレス（再度入力）<input type="email" name="email2" maxLength={150} required autoComplete="off" /></label><fieldset><legend>問合せ種別</legend><label className="check-field"><input type="radio" name="kind" value="各種お問合せ" required defaultChecked />各種お問合せ</label><label className="check-field"><input type="radio" name="kind" value="その他" />その他</label></fieldset><label>お問い合わせ内容<textarea name="body" rows={5} maxLength={2000} required placeholder="架空の相談内容を入力してください" /></label><button className="button primary" type="submit">受付を試す（メール送信なし）</button><p role="status" aria-live="polite">{message}</p></form>
  </section>;
}
