// src/components/settings/SettingsPreview.tsx
// Componente que mostra preview em tempo real das mudanças de configuração

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sun, Moon, Monitor, Calendar, DollarSign, Globe } from 'lucide-react';
import { formatCurrency, formatDate, formatNumber } from '@/utils/formatters';

interface SettingsPreviewProps {
  // Configurações atuais para preview
  currency: string;
  locale: string;
  dateFormat: string;
  numberFormat: string;
  theme: 'light' | 'dark' | 'auto';
  savingsGoal: number;
  closingDay: number;
}

export function SettingsPreview({
  currency,
  locale,
  dateFormat,
  numberFormat,
  theme,
  savingsGoal,
  closingDay,
}: SettingsPreviewProps) {
  // Valores de exemplo para demonstração
  const exampleAmount = 1234.56;
  const exampleDate = new Date();
  const exampleNumber = 9876.54;

  // Ícones de tema
  const themeIcons = {
    light: <Sun className="h-4 w-4" />,
    dark: <Moon className="h-4 w-4" />,
    auto: <Monitor className="h-4 w-4" />,
  };

  return (
    <Card className="border-dashed border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Preview das Configurações</CardTitle>
            <CardDescription>
              Veja como suas preferências serão aplicadas
            </CardDescription>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            {themeIcons[theme]}
            <span className="capitalize">{theme === 'auto' ? 'Automático' : theme === 'light' ? 'Claro' : 'Escuro'}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview de Formatação de Moeda */}
        <div className="flex items-start justify-between p-3 rounded-lg bg-muted/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="h-4 w-4 text-primary" />
              Formato de Moeda
            </div>
            <p className="text-xs text-muted-foreground">
              Como valores monetários serão exibidos
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-primary">
              {formatCurrency(exampleAmount, currency, locale)}
            </p>
            <p className="text-xs text-muted-foreground">
              {currency} • {locale}
            </p>
          </div>
        </div>

        {/* Preview de Formatação de Data */}
        <div className="flex items-start justify-between p-3 rounded-lg bg-muted/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4 text-primary" />
              Formato de Data
            </div>
            <p className="text-xs text-muted-foreground">
              Como datas serão exibidas
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">
              {formatDate(exampleDate, dateFormat, locale)}
            </p>
            <p className="text-xs text-muted-foreground">
              {dateFormat}
            </p>
          </div>
        </div>

        {/* Preview de Formatação de Número */}
        <div className="flex items-start justify-between p-3 rounded-lg bg-muted/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Globe className="h-4 w-4 text-primary" />
              Formato de Número
            </div>
            <p className="text-xs text-muted-foreground">
              Como números serão exibidos
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">
              {formatNumber(exampleNumber, numberFormat, 2)}
            </p>
            <p className="text-xs text-muted-foreground">
              {numberFormat}
            </p>
          </div>
        </div>

        {/* Configurações Financeiras */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-xs text-muted-foreground mb-1">Meta de Economia</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {savingsGoal}%
            </p>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-muted-foreground mb-1">Dia de Fechamento</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {closingDay}
            </p>
          </div>
        </div>

        {/* Nota Informativa */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          As alterações serão aplicadas em toda a aplicação após salvar
        </div>
      </CardContent>
    </Card>
  );
}
