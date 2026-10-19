import { CheckCircle2 } from '../design-system/icons';
export type ToastProps = { message: string; isVisible: boolean };
export const Toast = ({ message, isVisible }: ToastProps) => {
  if (!isVisible) return null;

  return (
    <div className="rt188-toast fixed bottom-6 right-6 flex items-center gap-2 bg-slate-800 text-white px-4 py-3 rounded-lg shadow-lg animate-fade-in-up z-50" role="status" aria-live="polite" aria-atomic="true">
      <CheckCircle2 size={20} className="text-green-400" />
      <span className="font-medium">{message}</span>
    </div>
  );
};


