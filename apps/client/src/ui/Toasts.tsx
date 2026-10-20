import { useEffect } from "react";
import { useGame, type Toast } from "../state/store";
import { IconCheck, IconClose, IconSpark } from "./icons";

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useGame((store) => store.dismissToast);
  const setPanel = useGame((store) => store.setPanel);

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), toast.tone === "error" ? 5200 : 6800);
    return () => clearTimeout(timer);
  }, [dismiss, toast.id, toast.tone]);

  return (
    <div
      className={`toast toast--${toast.tone}${toast.questId ? " toast--quest" : ""}`}
      role="status"
    >
      <span className="toast__icon" aria-hidden="true">
        {toast.tone === "good" ? <IconCheck size={15} /> : <IconSpark size={15} />}
      </span>
      <div className="toast__body">
        {toast.titleRu ? <div className="toast__title mono-caps">{toast.titleRu}</div> : null}
        <p className="toast__text">{toast.textRu}</p>
        {toast.textEn ? <p className="toast__en faint">{toast.textEn}</p> : null}
        {toast.questId ? (
          <button
            type="button"
            className="toast__link mono-caps"
            onClick={() => {
              dismiss(toast.id);
              setPanel("journal");
            }}
          >
            в дневник
          </button>
        ) : null}
      </div>
      <button
        type="button"
        className="toast__close"
        onClick={() => dismiss(toast.id)}
        aria-label="Скрыть"
      >
        <IconClose size={13} />
      </button>
    </div>
  );
}

export function Toasts() {
  const toasts = useGame((store) => store.toasts);
  if (!toasts.length) return null;
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
