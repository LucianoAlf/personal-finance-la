import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // BYPASS TEMPORÁRIO PARA DESENVOLVIMENTO - REMOVER EM PRODUÇÃO
  const isDevelopment = import.meta.env.DEV;
  const bypassAuth = isDevelopment && location.pathname === '/contas';
  
  if (bypassAuth) {
    return <>{children}</>;
  }

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-purple-600" size={48} />
          <p className="text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Redirecionar para login se não autenticado
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Renderizar children se autenticado
  return <>{children}</>;
}