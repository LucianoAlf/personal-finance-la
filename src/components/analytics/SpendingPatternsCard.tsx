import { Clock, Calendar, CreditCard, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function SpendingPatternsCard() {
  // Dados mockados por enquanto
  const patterns = {
    dayOfWeek: 'Sábado',
    preferredTime: '14h - 18h',
    purchaseType: 'Física (65%)',
    paymentType: 'À vista (78%)',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Padrões de Gasto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <Calendar className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">Dia com mais gastos</p>
              <p className="font-semibold text-gray-900">{patterns.dayOfWeek}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <Clock className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">Horário preferencial</p>
              <p className="font-semibold text-gray-900">{patterns.preferredTime}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <CreditCard className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">Tipo de compra</p>
              <p className="font-semibold text-gray-900">{patterns.purchaseType}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <TrendingUp className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">Forma de pagamento</p>
              <p className="font-semibold text-gray-900">{patterns.paymentType}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-900">
            💡 <strong>Insight:</strong> Você gasta mais aos sábados à tarde. Considere revisar compras impulsivas nesse período.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
