import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Toaster } from './components/ui/toaster';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Contas } from './pages/Contas';
import { Transacoes } from './pages/Transacoes';
import { CreditCards } from './pages/CreditCards';
import { Planning } from './pages/Planning';
import { Goals } from './pages/Goals';
import { Investments } from './pages/Investments';
import { Reports } from './pages/Reports';
import { Education } from './pages/Education';
import { Settings } from './pages/Settings';
import { Tags } from './pages/Tags';

function App() {
  return (
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
          <Route path="planejamento" element={<Planning />} />
          <Route path="metas" element={<Goals />} />
          <Route path="investimentos" element={<Investments />} />
          <Route path="relatorios" element={<Reports />} />
          <Route path="educacao" element={<Education />} />
          <Route path="configuracoes" element={<Settings />} />
          <Route path="tags" element={<Tags />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;

