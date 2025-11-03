import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { Accounts } from './pages/Accounts';
import { Transactions } from './pages/Transactions';
import { CreditCards } from './pages/CreditCards';
import { Planning } from './pages/Planning';
import { Goals } from './pages/Goals';
import { Investments } from './pages/Investments';
import { Reports } from './pages/Reports';
import { Education } from './pages/Education';
import { Settings } from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="contas" element={<Accounts />} />
          <Route path="transacoes" element={<Transactions />} />
          <Route path="cartoes" element={<CreditCards />} />
          <Route path="planejamento" element={<Planning />} />
          <Route path="metas" element={<Goals />} />
          <Route path="investimentos" element={<Investments />} />
          <Route path="relatorios" element={<Reports />} />
          <Route path="educacao" element={<Education />} />
          <Route path="configuracoes" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

