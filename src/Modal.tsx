// © 2026 SIKUMI LAB
import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, children, onClose, wide = false, className = '', toolbar, footer }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean; className?: string; toolbar?: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    const viewport=window.visualViewport;
    const fit=()=>{dialog.style.setProperty('--modal-viewport-height',`${viewport?.height ?? window.innerHeight}px`);dialog.style.setProperty('--modal-viewport-top',`${viewport?.offsetTop ?? 0}px`);};
    fit();viewport?.addEventListener('resize',fit);viewport?.addEventListener('scroll',fit);window.addEventListener('resize',fit);
    document.body.style.overflow = 'hidden';
    return () => { viewport?.removeEventListener('resize',fit);viewport?.removeEventListener('scroll',fit);window.removeEventListener('resize',fit);dialog.close(); document.body.style.overflow = ''; previous?.focus(); };
  }, []);
  return <dialog ref={ref} className={`dialog ${wide ? 'dialog-wide' : ''} ${className}`} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) { const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose(); } }} aria-labelledby="dialog-title">
    <div className="dialog-inner">
      <div className="dialog-heading"><h2 id="dialog-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="閉じる"><X size={22} /></button></div>
      {toolbar}
      {footer ? <><div className="dialog-scroll" tabIndex={0} aria-label="編集・確認内容">{children}</div><div className="dialog-footer">{footer}</div></> : children}
    </div>
  </dialog>;
}
