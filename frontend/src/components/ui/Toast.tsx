import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const styles = {
    success: {
      card: 'bg-white border-[#B8E8D9] text-[#17212B]',
      icon: <CheckCircle2 className="w-5 h-5 text-[#159A72] flex-shrink-0" />,
      titleColor: 'text-[#159A72]',
    },
    error: {
      card: 'bg-white border-[#FAC5C9] text-[#17212B]',
      icon: <AlertCircle className="w-5 h-5 text-[#D64550] flex-shrink-0" />,
      titleColor: 'text-[#D64550]',
    },
    info: {
      card: 'bg-white border-[#C6E3EB] text-[#17212B]',
      icon: <Info className="w-5 h-5 text-[#176B87] flex-shrink-0" />,
      titleColor: 'text-[#176B87]',
    },
  };

  const currentStyle = styles[toast.type];

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md w-full px-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className={`p-4 rounded-xl border shadow-lg flex items-start space-x-3 ${currentStyle.card}`}>
        {currentStyle.icon}
        <div className="flex-1 pr-2">
          {toast.title && <h4 className={`font-bold text-sm ${currentStyle.titleColor}`}>{toast.title}</h4>}
          <p className="text-xs text-[#687582] leading-relaxed mt-0.5">{toast.message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-[#8995A1] hover:text-[#17212B] p-1 rounded-md transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
