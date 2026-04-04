import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { ThemeProvider } from './contexts/ThemeContext';
import { MainLayout } from './components/layout/MainLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Toaster } from './components/ui/toaster';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Contas } from './pages/Contas';
import { Transacoes } from './pages/Transacoes';
import { CreditCards } from './pages/CreditCards';
import { Goals } from './pages/Goals';
import { Investments } from './pages/Investments';
import { Reports } from './pages/Reports';
import { Education } from './pages/Education';
import { Settings } from './pages/Settings';
import { Tags } from './pages/Tags';
import Categories from './pages/Categories';
import PayableBills from './pages/PayableBills';
import TestEmail from './pages/TestEmail';

// ✅ Configurar React Query com CACHE PERSISTENTE (localStorage)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 24 * 60 * 60 * 1000, // 24 horas (mantém no cache)
      refetchOnWindowFocus: true, // Atualiza ao focar (mas mostra cache primeiro)
      refetchOnMount: true, // Atualiza ao montar (mas mostra cache primeiro)
      retry: 1,
    },
  },
});

// ✅ Persistir queries no localStorage
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'PERSONAL_FINANCE_CACHE', // Chave única
});

function App() {
  return (
    <ThemeProvider defaultTheme="auto" storageKey="pf-theme">
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister }}
      >
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
      <Routes>
        {/* Rota de Login (sem layout) */}
        <Route path="/login" element={<Login />} />
        
        {/* Rotas protegidas com layout */}
        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="contas" element={<Contas />} />
          <Route path="transacoes" element={<Transacoes />} />
          <Route path="cartoes" element={<CreditCards />} />
          <Route path="contas-pagar" element={<PayableBills />} />
          <Route path="metas" element={<Goals />} />
          <Route path="investimentos" element={<Investments />} />
          <Route path="relatorios" element={<Reports />} />
          <Route path="educacao" element={<Education />} />
          <Route path="configuracoes" element={<Settings />} />
          <Route path="tags" element={<Tags />} />
          <Route path="categorias" element={<Categories />} />
          <Route path="test-email" element={<TestEmail />} />
        </Route>
      </Routes>
      <Toaster />
        </BrowserRouter>
      </PersistQueryClientProvider>
    </ThemeProvider>
  );
}

export default App;

