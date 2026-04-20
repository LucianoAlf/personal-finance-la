import { ArrowLeft, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/store/uiStore';

export function AnaClaraStubScreen() {
  const { anaCoachOpen, setAnaCoachOpen } = useUIStore();
  const navigate = useNavigate();

  if (!anaCoachOpen) return null;

  const close = () => setAnaCoachOpen(false);

  const goToWhatsApp = () => {
    close();
    navigate('/configuracoes#integrations-whatsapp');
  };

  return (
    <div
      data-testid="ana-clara-stub-root"
      role="dialog"
      aria-modal="true"
      aria-label="Ana Clara"
      className="fixed inset-0 z-50 flex flex-col bg-background text-foreground lg:hidden"
    >
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={close}
          aria-label="Voltar"
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-elevated"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <h1 className="text-base font-semibold">Ana Clara</h1>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-[calc(64px+env(safe-area-inset-bottom)+32px)] text-center">
        <picture>
          <source srcSet="/ana-clara-avatar-512.webp" type="image/webp" />
          <img
            src="/ana-clara-avatar-512.png"
            alt="Ana Clara"
            width={192}
            height={192}
            className="h-48 w-48 rounded-full border-2 border-primary/20 object-cover object-top shadow-lg"
          />
        </picture>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Ana Clara chega em breve aqui.</h2>
          <p className="text-sm text-muted-foreground">
            Por enquanto, fale comigo no WhatsApp.
          </p>
        </div>

        <button
          type="button"
          onClick={goToWhatsApp}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-emerald-600"
        >
          <MessageCircle size={18} aria-hidden="true" />
          Abrir no WhatsApp
        </button>
      </main>
    </div>
  );
}
