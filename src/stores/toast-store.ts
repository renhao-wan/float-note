import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type'], duration?: number) => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

let toastCounter = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (message, type = 'info', duration = 3000) => {
    const id = `toast-${Date.now()}-${++toastCounter}`;
    set((state) => ({
      toasts: [...state.toasts.slice(-49), { id, message, type, duration }],
    }));
  },

  dismiss: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearAll: () => {
    set({ toasts: [] });
  },
}));

// 便捷的全局 toast 函数
export const toast = {
  success: (message: string, duration?: number) => {
    useToastStore.getState().addToast(message, 'success', duration);
  },
  error: (message: string, duration?: number) => {
    useToastStore.getState().addToast(message, 'error', duration);
  },
  warning: (message: string, duration?: number) => {
    useToastStore.getState().addToast(message, 'warning', duration);
  },
  info: (message: string, duration?: number) => {
    useToastStore.getState().addToast(message, 'info', duration);
  },
};
