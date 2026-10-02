import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = ''; previous?.focus(); };
  }, []);
  return <dialog ref={ref} className={`dialog ${wide ? 'dialog-wide' : ''}`} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }} aria-labelledby="dialog-title">
    <div className="dialog-inner">
      <div className="dialog-heading"><h2 id="dialog-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="閉じる"><X size={22} /></button></div>
      {children}
    </div>
  </dialog>;
}
