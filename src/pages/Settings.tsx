import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';
import { User, Save, Settings as SettingsIcon } from 'lucide-react';
import { PushNotificationSettings } from '@/components/settings/PushNotificationSettings';

export function Settings() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Configurações" 
        subtitle="Personalize sua experiência" 
        icon={<SettingsIcon size={24} />} 
      />

      <div className="p-6 space-y-6 max-w-4xl">
        {/* Perfil */}
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div>
                <Button size="sm" variant="outline">
                  Alterar Foto
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                <Input defaultValue={user?.name} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input defaultValue={user?.email} disabled />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meta de Economia (%)
                </label>
                <Input type="number" defaultValue={user?.monthly_economy_goal} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dia de Fechamento
                </label>
                <Input type="number" min="1" max="31" defaultValue={user?.closing_day} />
              </div>
            </div>

            <Button>
              <Save size={16} className="mr-1" />
              Salvar Alterações
            </Button>
          </CardContent>
        </Card>

        {/* Push Notifications */}
        <PushNotificationSettings />

        {/* WhatsApp */}
        <Card>
          <CardHeader>
            <CardTitle>WhatsApp</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg mb-4">
              <div>
                <p className="font-semibold text-gray-900">Status da Conexão</p>
                <p className="text-sm text-gray-600">Conectar seu WhatsApp para receber atualizações</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                <span className="text-sm text-gray-600">Desconectado</span>
              </div>
            </div>
            <Button>Conectar WhatsApp</Button>
          </CardContent>
        </Card>

        {/* Aparência */}
        <Card>
          <CardHeader>
            <CardTitle>Aparência</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tema</label>
              <div className="flex space-x-4">
                <Button variant="outline" className="flex-1">
                  Claro
                </Button>
                <Button variant="outline" className="flex-1">
                  Escuro
                </Button>
                <Button variant="outline" className="flex-1">
                  Automático
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sobre */}
        <Card>
          <CardHeader>
            <CardTitle>Sobre</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <strong>Versão:</strong> 1.0.0 (MVP)
              </p>
              <p>
                <strong>Desenvolvido por:</strong> LA Music Team
              </p>
              <p>
                <strong>Contato:</strong> contato@lamusicltda.com
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
