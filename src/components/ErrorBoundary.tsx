import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  declare props: Props;
  declare setState: (state: Partial<State>) => void;

  state: State = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): State {
    let readable = error.message || 'Terjadi kesalahan pada aplikasi.';
    try {
      const parsed = JSON.parse(error.message);
      if (parsed?.error) {
        readable = `Akses data gagal (${parsed.operationType}): ${parsed.error}`;
      }
    } catch {
      // Keep original message
    }
    return { hasError: true, message: readable };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-zinc flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={24} />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Terjadi Gangguan Koneksi</h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">{this.state.message}</p>
            <button
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 bg-brand-blue text-white px-5 py-2.5 rounded-lg text-xs font-bold hover:bg-brand-navy transition-colors cursor-pointer"
            >
              <RotateCcw size={14} /> Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
