// src/components/settings/GeneralSettings.tsx
// Tab de configurações gerais do usuário

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Save, Moon, Sun, Monitor, Globe, Calendar, DollarSign } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useAuthStore } from '@/store/authStore';

export function GeneralSettings() {
  const { user } = useAuthStore();
  const { userSettings, updateUserSettings, setTheme, loading } = useSettings();

  // Form state
  const [displayName, setDisplayName] = useState(userSettings?.display_name || user?.name || '');
  const [language, setLanguage] = useState(userSettings?.language || 'pt-BR');
  const [timezone, setTimezone] = useState(userSettings?.timezone || 'America/Sao_Paulo');
  const [currency, setCurrency] = useState(userSettings?.currency || 'BRL');
  const [dateFormat, setDateFormat] = useState(userSettings?.date_format || 'DD/MM/YYYY');
  const [numberFormat, setNumberFormat] = useState(userSettings?.number_format || 'pt-BR');
  const [theme, setThemeState] = useState(userSettings?.theme || 'auto');
  const [savingsGoal, setSavingsGoal] = useState(userSettings?.monthly_savings_goal_percentage || 20);
  const [closingDay, setClosingDay] = useState(userSettings?.monthly_closing_day || 1);

  const handleSave = async () => {
    await updateUserSettings({
      display_name: displayName,
      language,
      timezone,
      currency,
      date_format: dateFormat,
      number_format: numberFormat,
      theme: theme as 'light' | 'dark' | 'auto',
      monthly_savings_goal_percentage: savingsGoal,
      monthly_closing_day: closingDay,
    });
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
    setThemeState(newTheme);
    setTheme(newTheme);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Perfil */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>Perfil</CardTitle>
          </div>
          <CardDescription>
            Informações básicas da sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={userSettings?.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-purple-600 text-white text-2xl">
                {displayName?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <Button variant="outline" size="sm">
                Alterar Foto
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG ou GIF (máx. 2MB)
              </p>
            </div>
          </div>

          {/* Nome e Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Nome de Exibição</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferências Gerais */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle>Preferências Gerais</CardTitle>
          </div>
          <CardDescription>
            Idioma, fuso horário e formatos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Idioma */}
            <div className="space-y-2">
              <Label htmlFor="language">Idioma</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="es-ES">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fuso Horário */}
            <div className="space-y-2">
              <Label htmlFor="timezone">Fuso Horário</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/Sao_Paulo">Brasília (GMT-3)</SelectItem>
                  <SelectItem value="America/Manaus">Manaus (GMT-4)</SelectItem>
                  <SelectItem value="America/Rio_Branco">Acre (GMT-5)</SelectItem>
                  <SelectItem value="America/Noronha">Fernando de Noronha (GMT-2)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Moeda */}
            <div className="space-y-2">
              <Label htmlFor="currency">Moeda</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">Real (R$)</SelectItem>
                  <SelectItem value="USD">Dólar ($)</SelectItem>
                  <SelectItem value="EUR">Euro (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Formato de Data */}
            <div className="space-y-2">
              <Label htmlFor="dateFormat">Formato de Data</Label>
              <Select value={dateFormat} onValueChange={setDateFormat}>
                <SelectTrigger id="dateFormat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/AAAA</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/AAAA</SelectItem>
                  <SelectItem value="YYYY-MM-DD">AAAA-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Formato de Número */}
            <div className="space-y-2">
              <Label htmlFor="numberFormat">Formato de Número</Label>
              <Select value={numberFormat} onValueChange={setNumberFormat}>
                <SelectTrigger id="numberFormat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">1.234,56 (Brasil)</SelectItem>
                  <SelectItem value="en-US">1,234.56 (EUA)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tema */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            <CardTitle>Aparência</CardTitle>
          </div>
          <CardDescription>
            Escolha o tema da interface
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <Button
              variant={theme === 'light' ? 'default' : 'outline'}
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => handleThemeChange('light')}
            >
              <Sun className="h-6 w-6" />
              <span>Claro</span>
            </Button>
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => handleThemeChange('dark')}
            >
              <Moon className="h-6 w-6" />
              <span>Escuro</span>
            </Button>
            <Button
              variant={theme === 'auto' ? 'default' : 'outline'}
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => handleThemeChange('auto')}
            >
              <Monitor className="h-6 w-6" />
              <span>Automático</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configurações Financeiras */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <CardTitle>Configurações Financeiras</CardTitle>
          </div>
          <CardDescription>
            Metas e preferências de controle financeiro
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Meta de Economia */}
            <div className="space-y-2">
              <Label htmlFor="savingsGoal">Meta de Economia Mensal (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="savingsGoal"
                  type="number"
                  min={0}
                  max={100}
                  value={savingsGoal}
                  onChange={(e) => setSavingsGoal(Number(e.target.value))}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Percentual da sua renda que deseja economizar
              </p>
            </div>

            {/* Dia de Fechamento */}
            <div className="space-y-2">
              <Label htmlFor="closingDay">Dia de Fechamento Mensal</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="closingDay"
                  type="number"
                  min={1}
                  max={28}
                  value={closingDay}
                  onChange={(e) => setClosingDay(Number(e.target.value))}
                />
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                Dia do mês para fechamento do período (1-28)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg">
          <Save className="h-4 w-4 mr-2" />
          Salvar Alterações
        </Button>
      </div>
    </div>
  );
}
