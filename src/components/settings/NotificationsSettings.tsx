// src/components/settings/NotificationsSettings.tsx
// Tab de preferências de notificações

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Bell, Clock, Calendar, TrendingUp, Target, Sparkles, Save, AlertTriangle, DollarSign, TrendingDown, Wallet, PieChart } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { DayOfWeekSelector } from './DayOfWeekSelector';
import { MultipleDaysSelector } from './MultipleDaysSelector';

export function NotificationsSettings() {
  const { notificationPreferences, updateNotificationPreferences, loading } = useSettings();

  // Canais
  const [pushEnabled, setPushEnabled] = useState(notificationPreferences?.push_enabled ?? true);
  const [emailEnabled, setEmailEnabled] = useState(notificationPreferences?.email_enabled ?? true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(notificationPreferences?.whatsapp_enabled ?? false);

  // Modo Não Perturbe
  const [dndEnabled, setDndEnabled] = useState(notificationPreferences?.do_not_disturb_enabled ?? false);
  const [dndStartTime, setDndStartTime] = useState(notificationPreferences?.do_not_disturb_start_time || '22:00');
  const [dndEndTime, setDndEndTime] = useState(notificationPreferences?.do_not_disturb_end_time || '08:00');

  // Resumos Automáticos
  const [dailySummaryEnabled, setDailySummaryEnabled] = useState(notificationPreferences?.daily_summary_enabled ?? false);
  const [dailySummaryTime, setDailySummaryTime] = useState(notificationPreferences?.daily_summary_time || '20:00');
  
  const [weeklySummaryEnabled, setWeeklySummaryEnabled] = useState(notificationPreferences?.weekly_summary_enabled ?? false);
  const [weeklySummaryDay, setWeeklySummaryDay] = useState(notificationPreferences?.weekly_summary_day_of_week || 0);
  const [weeklySummaryTime, setWeeklySummaryTime] = useState(notificationPreferences?.weekly_summary_time || '09:00');
  
  const [monthlySummaryEnabled, setMonthlySummaryEnabled] = useState(notificationPreferences?.monthly_summary_enabled ?? false);
  const [monthlySummaryDay, setMonthlySummaryDay] = useState(notificationPreferences?.monthly_summary_day_of_month || 1);
  const [monthlySummaryTime, setMonthlySummaryTime] = useState(notificationPreferences?.monthly_summary_time || '09:00');

  // Alertas Específicos
  const [billRemindersEnabled, setBillRemindersEnabled] = useState(notificationPreferences?.bill_reminders_enabled ?? true);
  const [billReminderDays, setBillReminderDays] = useState(notificationPreferences?.bill_reminders_days_before || 3);
  
  const [budgetAlertsEnabled, setBudgetAlertsEnabled] = useState(notificationPreferences?.budget_alerts_enabled ?? true);
  const [budgetAlertThreshold, setBudgetAlertThreshold] = useState(notificationPreferences?.budget_alert_threshold_percentage || 80);
  
  const [goalMilestonesEnabled, setGoalMilestonesEnabled] = useState(notificationPreferences?.goal_milestones_enabled ?? true);
  const [achievementsEnabled, setAchievementsEnabled] = useState(notificationPreferences?.achievements_enabled ?? true);
  
  const [anaTipsEnabled, setAnaTipsEnabled] = useState(notificationPreferences?.ana_tips_enabled ?? true);
  const [anaTipsFrequency, setAnaTipsFrequency] = useState(notificationPreferences?.ana_tips_frequency || 'daily');
  
  // ✨ NOVOS STATES - ARRAYS E HORÁRIOS
  const [dndDaysOfWeek, setDndDaysOfWeek] = useState<number[]>(notificationPreferences?.do_not_disturb_days_of_week || [0,1,2,3,4,5,6]);
  const [dailySummaryDays, setDailySummaryDays] = useState<number[]>(notificationPreferences?.daily_summary_days_of_week || [1,2,3,4,5]);
  const [weeklySummaryDays, setWeeklySummaryDays] = useState<number[]>(notificationPreferences?.weekly_summary_days_of_week || [0]);
  const [monthlySummaryDays, setMonthlySummaryDays] = useState<number[]>(notificationPreferences?.monthly_summary_days_of_month || [1]);
  
  const [billReminderDaysArray, setBillReminderDaysArray] = useState<number[]>(notificationPreferences?.bill_reminders_days_before_array || [3,1,0]);
  const [billReminderTime, setBillReminderTime] = useState(notificationPreferences?.bill_reminders_time || '09:00');
  
  const [budgetThresholds, setBudgetThresholds] = useState<number[]>(notificationPreferences?.budget_alert_thresholds || [80,100]);
  const [budgetCooldown, setBudgetCooldown] = useState(notificationPreferences?.budget_alert_cooldown_hours || 24);
  
  const [goalPercentages, setGoalPercentages] = useState<number[]>(notificationPreferences?.goal_milestone_percentages || [25,50,75,100]);
  
  const [anaTipsTime, setAnaTipsTime] = useState(notificationPreferences?.ana_tips_time || '10:00');
  const [anaTipsDayOfWeek, setAnaTipsDayOfWeek] = useState(notificationPreferences?.ana_tips_day_of_week || 1);
  const [anaTipsDayOfMonth, setAnaTipsDayOfMonth] = useState(notificationPreferences?.ana_tips_day_of_month || 1);
  
  // ✨ NOVOS ALERTAS
  const [overdueAlertsEnabled, setOverdueAlertsEnabled] = useState(notificationPreferences?.overdue_bill_alerts_enabled ?? true);
  const [overdueDays, setOverdueDays] = useState<number[]>(notificationPreferences?.overdue_bill_alert_days || [1,3,7]);
  
  const [lowBalanceEnabled, setLowBalanceEnabled] = useState(notificationPreferences?.low_balance_alerts_enabled ?? false);
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState(notificationPreferences?.low_balance_threshold || 100);
  
  const [largeTransactionEnabled, setLargeTransactionEnabled] = useState(notificationPreferences?.large_transaction_alerts_enabled ?? false);
  const [largeTransactionThreshold, setLargeTransactionThreshold] = useState(notificationPreferences?.large_transaction_threshold || 1000);
  
  const [investmentSummaryEnabled, setInvestmentSummaryEnabled] = useState(notificationPreferences?.investment_summary_enabled ?? false);
  const [investmentSummaryFreq, setInvestmentSummaryFreq] = useState(notificationPreferences?.investment_summary_frequency || 'weekly');
  const [investmentSummaryDay, setInvestmentSummaryDay] = useState(notificationPreferences?.investment_summary_day_of_week || 5);
  const [investmentSummaryTime, setInvestmentSummaryTime] = useState(notificationPreferences?.investment_summary_time || '18:00');

  const handleSave = async () => {
    await updateNotificationPreferences({
      // Canais
      push_enabled: pushEnabled,
      email_enabled: emailEnabled,
      whatsapp_enabled: whatsappEnabled,
      
      // DND
      do_not_disturb_enabled: dndEnabled,
      do_not_disturb_start_time: dndStartTime,
      do_not_disturb_end_time: dndEndTime,
      do_not_disturb_days_of_week: dndDaysOfWeek,
      
      // Resumo Diário
      daily_summary_enabled: dailySummaryEnabled,
      daily_summary_time: dailySummaryTime,
      daily_summary_days_of_week: dailySummaryDays,
      
      // Resumo Semanal
      weekly_summary_enabled: weeklySummaryEnabled,
      weekly_summary_day_of_week: weeklySummaryDay,
      weekly_summary_days_of_week: weeklySummaryDays,
      weekly_summary_time: weeklySummaryTime,
      
      // Resumo Mensal
      monthly_summary_enabled: monthlySummaryEnabled,
      monthly_summary_day_of_month: monthlySummaryDay,
      monthly_summary_days_of_month: monthlySummaryDays,
      monthly_summary_time: monthlySummaryTime,
      
      // Lembretes de Contas
      bill_reminders_enabled: billRemindersEnabled,
      bill_reminders_days_before: billReminderDays,
      bill_reminders_days_before_array: billReminderDaysArray,
      bill_reminders_time: billReminderTime,
      
      // Orçamento
      budget_alerts_enabled: budgetAlertsEnabled,
      budget_alert_threshold_percentage: budgetAlertThreshold,
      budget_alert_thresholds: budgetThresholds,
      budget_alert_cooldown_hours: budgetCooldown,
      
      // Metas
      goal_milestones_enabled: goalMilestonesEnabled,
      goal_milestone_percentages: goalPercentages,
      
      // Outros
      achievements_enabled: achievementsEnabled,
      
      // Ana Clara
      ana_tips_enabled: anaTipsEnabled,
      ana_tips_frequency: anaTipsFrequency as 'daily' | 'weekly' | 'monthly',
      ana_tips_time: anaTipsTime,
      ana_tips_day_of_week: anaTipsDayOfWeek,
      ana_tips_day_of_month: anaTipsDayOfMonth,
      
      // Novos Alertas
      overdue_bill_alerts_enabled: overdueAlertsEnabled,
      overdue_bill_alert_days: overdueDays,
      
      low_balance_alerts_enabled: lowBalanceEnabled,
      low_balance_threshold: lowBalanceThreshold,
      
      large_transaction_alerts_enabled: largeTransactionEnabled,
      large_transaction_threshold: largeTransactionThreshold,
      
      investment_summary_enabled: investmentSummaryEnabled,
      investment_summary_frequency: investmentSummaryFreq,
      investment_summary_day_of_week: investmentSummaryDay,
      investment_summary_time: investmentSummaryTime,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando preferências...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Canais de Notificação */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Canais de Notificação</CardTitle>
          </div>
          <CardDescription>
            Escolha como deseja receber notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="push">Notificações Push</Label>
              <p className="text-sm text-muted-foreground">
                Receba notificações no navegador
              </p>
            </div>
            <Switch
              id="push"
              checked={pushEnabled}
              onCheckedChange={setPushEnabled}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="email">E-mail</Label>
              <p className="text-sm text-muted-foreground">
                Receba notificações por e-mail
              </p>
            </div>
            <Switch
              id="email"
              checked={emailEnabled}
              onCheckedChange={setEmailEnabled}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <p className="text-sm text-muted-foreground">
                Receba notificações via WhatsApp
              </p>
            </div>
            <Switch
              id="whatsapp"
              checked={whatsappEnabled}
              onCheckedChange={setWhatsappEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Modo Não Perturbe */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>Modo Não Perturbe</CardTitle>
          </div>
          <CardDescription>
            Defina horários em que não deseja receber notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="dnd">Ativar Modo Não Perturbe</Label>
              <p className="text-sm text-muted-foreground">
                Silenciar notificações em horários específicos
              </p>
            </div>
            <Switch
              id="dnd"
              checked={dndEnabled}
              onCheckedChange={setDndEnabled}
            />
          </div>

          {dndEnabled && (
            <div className="space-y-4 pl-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dndStart">Início</Label>
                  <Input
                    id="dndStart"
                    type="time"
                    value={dndStartTime}
                    onChange={(e) => setDndStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dndEnd">Fim</Label>
                  <Input
                    id="dndEnd"
                    type="time"
                    value={dndEndTime}
                    onChange={(e) => setDndEndTime(e.target.value)}
                  />
                </div>
              </div>
              <DayOfWeekSelector
                value={dndDaysOfWeek}
                onChange={setDndDaysOfWeek}
                label="Dias da semana ativos"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumos Automáticos */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle>Resumos Automáticos</CardTitle>
          </div>
          <CardDescription>
            Receba resumos periódicos das suas finanças
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Resumo Diário */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dailySummary">Resumo Diário</Label>
                <p className="text-sm text-muted-foreground">
                  Resumo das transações do dia
                </p>
              </div>
              <Switch
                id="dailySummary"
                checked={dailySummaryEnabled}
                onCheckedChange={setDailySummaryEnabled}
              />
            </div>
            {dailySummaryEnabled && (
              <div className="space-y-4 pl-4">
                <div className="space-y-2">
                  <Label htmlFor="dailyTime">Horário</Label>
                  <Input
                    id="dailyTime"
                    type="time"
                    value={dailySummaryTime}
                    onChange={(e) => setDailySummaryTime(e.target.value)}
                    className="max-w-[200px]"
                  />
                </div>
                <DayOfWeekSelector
                  value={dailySummaryDays}
                  onChange={setDailySummaryDays}
                  label="Dias da semana"
                />
              </div>
            )}
          </div>

          {/* Resumo Semanal */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="weeklySummary">Resumo Semanal</Label>
                <p className="text-sm text-muted-foreground">
                  Resumo da semana
                </p>
              </div>
              <Switch
                id="weeklySummary"
                checked={weeklySummaryEnabled}
                onCheckedChange={setWeeklySummaryEnabled}
              />
            </div>
            {weeklySummaryEnabled && (
              <div className="space-y-4 pl-4">
                <div className="space-y-2">
                  <Label htmlFor="weeklyTime">Horário</Label>
                  <Input
                    id="weeklyTime"
                    type="time"
                    value={weeklySummaryTime}
                    onChange={(e) => setWeeklySummaryTime(e.target.value)}
                    className="max-w-[200px]"
                  />
                </div>
                <DayOfWeekSelector
                  value={weeklySummaryDays}
                  onChange={setWeeklySummaryDays}
                  label="Dias da semana (múltiplos resumos)"
                />
              </div>
            )}
          </div>

          {/* Resumo Mensal */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="monthlySummary">Resumo Mensal</Label>
                <p className="text-sm text-muted-foreground">
                  Resumo do mês
                </p>
              </div>
              <Switch
                id="monthlySummary"
                checked={monthlySummaryEnabled}
                onCheckedChange={setMonthlySummaryEnabled}
              />
            </div>
            {monthlySummaryEnabled && (
              <div className="space-y-4 pl-4">
                <div className="space-y-2">
                  <Label htmlFor="monthlyTime">Horário</Label>
                  <Input
                    id="monthlyTime"
                    type="time"
                    value={monthlySummaryTime}
                    onChange={(e) => setMonthlySummaryTime(e.target.value)}
                    className="max-w-[200px]"
                  />
                </div>
                <MultipleDaysSelector
                  value={monthlySummaryDays}
                  onChange={setMonthlySummaryDays}
                  options={[
                    { value: 1, label: '1' }, { value: 5, label: '5' },
                    { value: 10, label: '10' }, { value: 15, label: '15' },
                    { value: 20, label: '20' }, { value: 25, label: '25' },
                    { value: 28, label: '28' }
                  ]}
                  label="Dias do mês (múltiplos resumos)"
                  variant="compact"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alertas Específicos */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Alertas Específicos</CardTitle>
          </div>
          <CardDescription>
            Configure alertas para eventos importantes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lembretes de Contas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="billReminders">Lembretes de Contas</Label>
                <p className="text-sm text-muted-foreground">
                  Avisos antes do vencimento
                </p>
              </div>
              <Switch
                id="billReminders"
                checked={billRemindersEnabled}
                onCheckedChange={setBillRemindersEnabled}
              />
            </div>
            {billRemindersEnabled && (
              <div className="space-y-4 pl-4">
                <div className="space-y-2">
                  <Label htmlFor="billTime">Horário dos lembretes</Label>
                  <Input
                    id="billTime"
                    type="time"
                    value={billReminderTime}
                    onChange={(e) => setBillReminderTime(e.target.value)}
                    className="max-w-[200px]"
                  />
                </div>
                <MultipleDaysSelector
                  value={billReminderDaysArray}
                  onChange={setBillReminderDaysArray}
                  options={[
                    { value: 7, label: '7 dias' }, { value: 5, label: '5 dias' },
                    { value: 3, label: '3 dias' }, { value: 2, label: '2 dias' },
                    { value: 1, label: '1 dia' }, { value: 0, label: 'No dia' }
                  ]}
                  label="Dias antes do vencimento (múltiplos lembretes)"
                />
              </div>
            )}
          </div>

          {/* Alerta de Orçamento */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="budgetAlerts">Alerta de Orçamento</Label>
                <p className="text-sm text-muted-foreground">
                  Aviso ao atingir limite do orçamento
                </p>
              </div>
              <Switch
                id="budgetAlerts"
                checked={budgetAlertsEnabled}
                onCheckedChange={setBudgetAlertsEnabled}
              />
            </div>
            {budgetAlertsEnabled && (
              <div className="space-y-4 pl-4">
                <MultipleDaysSelector
                  value={budgetThresholds}
                  onChange={setBudgetThresholds}
                  options={[
                    { value: 50, label: '50%' }, { value: 70, label: '70%' },
                    { value: 80, label: '80%' }, { value: 90, label: '90%' },
                    { value: 100, label: '100%' }
                  ]}
                  label="Limites de alerta (múltiplos avisos)"
                />
                <div className="space-y-2">
                  <Label htmlFor="budgetCooldown">Intervalo entre alertas (horas)</Label>
                  <Input
                    id="budgetCooldown"
                    type="number"
                    min={1}
                    max={168}
                    value={budgetCooldown}
                    onChange={(e) => setBudgetCooldown(Number(e.target.value))}
                    className="max-w-[200px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Evita spam de notificações
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Marcos de Metas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="goalMilestones">
                  <Target className="h-4 w-4 inline mr-2" />
                  Marcos de Metas
                </Label>
                <p className="text-sm text-muted-foreground">
                  Notificações ao atingir marcos das metas
                </p>
              </div>
              <Switch
                id="goalMilestones"
                checked={goalMilestonesEnabled}
                onCheckedChange={setGoalMilestonesEnabled}
              />
            </div>
            {goalMilestonesEnabled && (
              <div className="pl-4">
                <MultipleDaysSelector
                  value={goalPercentages}
                  onChange={setGoalPercentages}
                  options={[
                    { value: 10, label: '10%' }, { value: 25, label: '25%' },
                    { value: 50, label: '50%' }, { value: 75, label: '75%' },
                    { value: 90, label: '90%' }, { value: 100, label: '100%' }
                  ]}
                  label="Percentuais de progresso para avisar"
                />
              </div>
            )}
          </div>

          {/* Conquistas */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="achievements">Conquistas</Label>
              <p className="text-sm text-muted-foreground">
                Notificações ao desbloquear conquistas
              </p>
            </div>
            <Switch
              id="achievements"
              checked={achievementsEnabled}
              onCheckedChange={setAchievementsEnabled}
            />
          </div>

          {/* Dicas da Ana Clara */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="anaTips">
                  <Sparkles className="h-4 w-4 inline mr-2" />
                  Dicas da Ana Clara
                </Label>
                <p className="text-sm text-muted-foreground">
                  Dicas personalizadas de educação financeira
                </p>
              </div>
              <Switch
                id="anaTips"
                checked={anaTipsEnabled}
                onCheckedChange={setAnaTipsEnabled}
              />
            </div>
            {anaTipsEnabled && (
              <div className="space-y-4 pl-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="anaTipsFreq">Frequência</Label>
                    <Select value={anaTipsFrequency} onValueChange={(val) => setAnaTipsFrequency(val as 'daily' | 'weekly' | 'monthly')}>
                      <SelectTrigger id="anaTipsFreq">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Diária</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="anaTipsTime">Horário</Label>
                    <Input
                      id="anaTipsTime"
                      type="time"
                      value={anaTipsTime}
                      onChange={(e) => setAnaTipsTime(e.target.value)}
                    />
                  </div>
                </div>
                {anaTipsFrequency === 'weekly' && (
                  <div className="space-y-2">
                    <Label htmlFor="anaTipsWeekDay">Dia da semana</Label>
                    <Select value={String(anaTipsDayOfWeek)} onValueChange={(val) => setAnaTipsDayOfWeek(Number(val))}>
                      <SelectTrigger id="anaTipsWeekDay" className="max-w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Domingo</SelectItem>
                        <SelectItem value="1">Segunda</SelectItem>
                        <SelectItem value="2">Terça</SelectItem>
                        <SelectItem value="3">Quarta</SelectItem>
                        <SelectItem value="4">Quinta</SelectItem>
                        <SelectItem value="5">Sexta</SelectItem>
                        <SelectItem value="6">Sábado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {anaTipsFrequency === 'monthly' && (
                  <div className="space-y-2">
                    <Label htmlFor="anaTipsMonthDay">Dia do mês</Label>
                    <Input
                      id="anaTipsMonthDay"
                      type="number"
                      min={1}
                      max={28}
                      value={anaTipsDayOfMonth}
                      onChange={(e) => setAnaTipsDayOfMonth(Number(e.target.value))}
                      className="max-w-[200px]"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Novos Alertas Avançados */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            <CardTitle>Alertas Avançados</CardTitle>
          </div>
          <CardDescription>
            Alertas inteligentes para situações específicas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Contas Vencidas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="overdueAlerts">
                  <AlertTriangle className="h-4 w-4 inline mr-2" />
                  Alerta de Contas Vencidas
                </Label>
                <p className="text-sm text-muted-foreground">
                  Avisos após vencimento de contas não pagas
                </p>
              </div>
              <Switch
                id="overdueAlerts"
                checked={overdueAlertsEnabled}
                onCheckedChange={setOverdueAlertsEnabled}
              />
            </div>
            {overdueAlertsEnabled && (
              <div className="pl-4">
                <MultipleDaysSelector
                  value={overdueDays}
                  onChange={setOverdueDays}
                  options={[
                    { value: 1, label: '1 dia' }, { value: 3, label: '3 dias' },
                    { value: 7, label: '7 dias' }, { value: 15, label: '15 dias' }
                  ]}
                  label="Dias após vencimento para alertar"
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Saldo Baixo */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="lowBalance">
                  <Wallet className="h-4 w-4 inline mr-2" />
                  Alerta de Saldo Baixo
                </Label>
                <p className="text-sm text-muted-foreground">
                  Aviso quando saldo em conta estiver baixo
                </p>
              </div>
              <Switch
                id="lowBalance"
                checked={lowBalanceEnabled}
                onCheckedChange={setLowBalanceEnabled}
              />
            </div>
            {lowBalanceEnabled && (
              <div className="pl-4 space-y-2">
                <Label htmlFor="lowBalanceValue">Valor mínimo (R$)</Label>
                <Input
                  id="lowBalanceValue"
                  type="number"
                  min={0}
                  step={50}
                  value={lowBalanceThreshold}
                  onChange={(e) => setLowBalanceThreshold(Number(e.target.value))}
                  className="max-w-[200px]"
                />
                <p className="text-xs text-muted-foreground">
                  Avisar quando saldo &lt; R$ {lowBalanceThreshold.toFixed(2)}
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Transação Grande */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="largeTransaction">
                  <DollarSign className="h-4 w-4 inline mr-2" />
                  Alerta de Transação Grande
                </Label>
                <p className="text-sm text-muted-foreground">
                  Aviso para despesas acima de certo valor
                </p>
              </div>
              <Switch
                id="largeTransaction"
                checked={largeTransactionEnabled}
                onCheckedChange={setLargeTransactionEnabled}
              />
            </div>
            {largeTransactionEnabled && (
              <div className="pl-4 space-y-2">
                <Label htmlFor="largeTransactionValue">Valor mínimo (R$)</Label>
                <Input
                  id="largeTransactionValue"
                  type="number"
                  min={0}
                  step={100}
                  value={largeTransactionThreshold}
                  onChange={(e) => setLargeTransactionThreshold(Number(e.target.value))}
                  className="max-w-[200px]"
                />
                <p className="text-xs text-muted-foreground">
                  Avisar para despesas &gt; R$ {largeTransactionThreshold.toFixed(2)}
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Resumo de Investimentos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="investmentSummary">
                  <PieChart className="h-4 w-4 inline mr-2" />
                  Resumo de Investimentos
                </Label>
                <p className="text-sm text-muted-foreground">
                  Relatórios periódicos da carteira
                </p>
              </div>
              <Switch
                id="investmentSummary"
                checked={investmentSummaryEnabled}
                onCheckedChange={setInvestmentSummaryEnabled}
              />
            </div>
            {investmentSummaryEnabled && (
              <div className="space-y-4 pl-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="investFreq">Frequência</Label>
                    <Select value={investmentSummaryFreq} onValueChange={setInvestmentSummaryFreq}>
                      <SelectTrigger id="investFreq">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="investTime">Horário</Label>
                    <Input
                      id="investTime"
                      type="time"
                      value={investmentSummaryTime}
                      onChange={(e) => setInvestmentSummaryTime(e.target.value)}
                    />
                  </div>
                </div>
                {investmentSummaryFreq === 'weekly' && (
                  <div className="space-y-2">
                    <Label htmlFor="investDay">Dia da semana</Label>
                    <Select value={String(investmentSummaryDay)} onValueChange={(val) => setInvestmentSummaryDay(Number(val))}>
                      <SelectTrigger id="investDay" className="max-w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Domingo</SelectItem>
                        <SelectItem value="1">Segunda</SelectItem>
                        <SelectItem value="2">Terça</SelectItem>
                        <SelectItem value="3">Quarta</SelectItem>
                        <SelectItem value="4">Quinta</SelectItem>
                        <SelectItem value="5">Sexta</SelectItem>
                        <SelectItem value="6">Sábado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg">
          <Save className="h-4 w-4 mr-2" />
          Salvar Preferências
        </Button>
      </div>
    </div>
  );
}
