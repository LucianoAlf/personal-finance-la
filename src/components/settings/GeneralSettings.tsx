// src/components/settings/GeneralSettings.tsx
// Tab de configurações gerais do usuário

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Save, Moon, Sun, Monitor, Globe, Calendar, DollarSign, Upload } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { SavingsGoalsManager } from './goals/SavingsGoalsManager';
import { FinancialCyclesManager } from './cycles/FinancialCyclesManager';
import { FinancialSettingsCard } from './financial/FinancialSettingsCard';
import type { BudgetAllocation } from '@/types/settings.types';

export function GeneralSettings() {
  const { userSettings, updateUserSettings, setTheme, loading } = useSettings();
  const [userEmail, setUserEmail] = useState<string>('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState(userSettings?.display_name || '');
  const [language, setLanguage] = useState(userSettings?.language || 'pt-BR');
  const [timezone, setTimezone] = useState(userSettings?.timezone || 'America/Sao_Paulo');
  const [currency, setCurrency] = useState(userSettings?.currency || 'BRL');
  const [dateFormat, setDateFormat] = useState(userSettings?.date_format || 'DD/MM/YYYY');
  const [numberFormat, setNumberFormat] = useState(userSettings?.number_format || 'pt-BR');
  const [theme, setThemeState] = useState(userSettings?.theme || 'auto');
  const [savingsGoal, setSavingsGoal] = useState(userSettings?.monthly_savings_goal_percentage || 20);
  const [closingDay, setClosingDay] = useState(userSettings?.monthly_closing_day || 1);
  const [budgetAllocation, setBudgetAllocation] = useState<BudgetAllocation>(
    userSettings?.budget_allocation || {
      essentials: 50,
      investments: 20,
      leisure: 20,
      others: 10,
    }
  );
  const [budgetAlertThreshold, setBudgetAlertThreshold] = useState(
    userSettings?.budget_alert_threshold || 80
  );

  // Validation errors
  const [errors, setErrors] = useState({
    displayName: '',
    savingsGoal: '',
    closingDay: '',
  });

  // Buscar email do usuário autenticado
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email || '');
        if (!displayName && user.user_metadata?.full_name) {
          setDisplayName(user.user_metadata.full_name);
        }
      }
    });
  }, []);

  // Sincronizar estado local quando userSettings mudar
  useEffect(() => {
    if (userSettings) {
      setDisplayName(userSettings.display_name || '');
      setLanguage(userSettings.language || 'pt-BR');
      setTimezone(userSettings.timezone || 'America/Sao_Paulo');
      setCurrency(userSettings.currency || 'BRL');
      setDateFormat(userSettings.date_format || 'DD/MM/YYYY');
      setNumberFormat(userSettings.number_format || 'pt-BR');
      setThemeState(userSettings.theme || 'auto');
      setSavingsGoal(userSettings.monthly_savings_goal_percentage || 20);
      setClosingDay(userSettings.monthly_closing_day || 1);
      setBudgetAllocation(
        userSettings.budget_allocation || {
          essentials: 50,
          investments: 20,
          leisure: 20,
          others: 10,
        }
      );
      setBudgetAlertThreshold(userSettings.budget_alert_threshold || 80);
    }
  }, [userSettings]);

  const [isSaving, setIsSaving] = useState(false);

  // Derivar locale do language (para o SettingsPreview)
  const locale = language;

  // Validação em tempo real para displayName
  const validateDisplayName = (value: string) => {
    if (value.length === 0) {
      return 'Nome é obrigatório';
    }
    if (value.length < 2) {
      return 'Nome deve ter no mínimo 2 caracteres';
    }
    if (value.length > 100) {
      return 'Nome deve ter no máximo 100 caracteres';
    }
    return '';
  };

  // Validação em tempo real para savingsGoal
  const validateSavingsGoal = (value: number) => {
    if (value < 0) {
      return 'Meta de economia não pode ser negativa';
    }
    if (value > 100) {
      return 'Meta de economia não pode exceder 100%';
    }
    return '';
  };

  // Validação em tempo real para closingDay
  const validateClosingDay = (value: number) => {
    if (value < 1) {
      return 'Dia de fechamento deve ser no mínimo 1';
    }
    if (value > 28) {
      return 'Dia de fechamento deve ser no máximo 28';
    }
    return '';
  };

  // Handler para displayName com validação
  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    const error = validateDisplayName(value);
    setErrors(prev => ({ ...prev, displayName: error }));
  };

  // Handler para savingsGoal com validação
  const handleSavingsGoalChange = (value: number) => {
    setSavingsGoal(value);
    const error = validateSavingsGoal(value);
    setErrors(prev => ({ ...prev, savingsGoal: error }));
  };

  // Handler para closingDay com validação
  const handleClosingDayChange = (value: number) => {
    setClosingDay(value);
    const error = validateClosingDay(value);
    setErrors(prev => ({ ...prev, closingDay: error }));
  };

  const handleSave = async () => {
    // Validar todos os campos antes de salvar
    const nameError = validateDisplayName(displayName);
    const goalError = validateSavingsGoal(savingsGoal);
    const dayError = validateClosingDay(closingDay);

    if (nameError || goalError || dayError) {
      setErrors({
        displayName: nameError,
        savingsGoal: goalError,
        closingDay: dayError,
      });
      toast.error('Por favor, corrija os erros antes de salvar');
      return;
    }

    try {
      setIsSaving(true);
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
        budget_allocation: budgetAllocation,
        budget_alert_threshold: budgetAlertThreshold,
      });
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
    setThemeState(newTheme);
    setTheme(newTheme);
  };

  // Avatar cache-busting
  const avatarSrc = userSettings?.avatar_url
    ? `${userSettings.avatar_url}?v=${encodeURIComponent(userSettings.updated_at || '')}`
    : undefined;

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo e tamanho
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione apenas arquivos de imagem (JPG, PNG, GIF)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('O arquivo deve ter no máximo 2MB');
      return;
    }

    try {
      setUploadingAvatar(true);

      // Obter userId
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload para o Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(filePath);

      // Atualizar no banco
      await updateUserSettings({ avatar_url: publicUrl });

      toast.success('Foto atualizada com sucesso!');
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      toast.error(err.message || 'Erro ao fazer upload da foto');
    } finally {
      setUploadingAvatar(false);
    }
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
              <AvatarImage
                key={avatarSrc || 'no-avatar'}
                src={avatarSrc}
                alt="Foto do perfil"
              />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-purple-600 text-white text-2xl">
                {displayName?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <input
                type="file"
                id="avatar-upload"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => document.getElementById('avatar-upload')?.click()}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="h-3 w-3 mr-2" />
                    Alterar Foto
                  </>
                )}
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
                onChange={(e) => handleDisplayNameChange(e.target.value)}
                placeholder="Seu nome"
                className={errors.displayName ? 'border-red-500' : ''}
              />
              {errors.displayName && (
                <p className="text-xs text-red-500 mt-1">{errors.displayName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                value={userEmail}
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
      <FinancialSettingsCard
        savingsGoal={savingsGoal}
        closingDay={closingDay}
        budgetAllocation={budgetAllocation}
        budgetAlertThreshold={budgetAlertThreshold}
        onSavingsGoalChange={handleSavingsGoalChange}
        onClosingDayChange={handleClosingDayChange}
        onBudgetAllocationChange={setBudgetAllocation}
        onBudgetAlertThresholdChange={setBudgetAlertThreshold}
      />

      {/* Metas de Economia */}
      <SavingsGoalsManager />

      {/* Ciclos Financeiros */}
      <FinancialCyclesManager />


      {/* Botão Salvar */}
      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg" disabled={isSaving || loading}>
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
