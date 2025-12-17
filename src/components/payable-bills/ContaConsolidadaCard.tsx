import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  CreditCard,
  Repeat,
  Split,
  ExternalLink,
  Lightbulb,
  Home,
  Smartphone,
  Heart,
  GraduationCap,
  Receipt,
  Shield,
  Banknote,
  Tv,
  UtensilsCrossed,
  Package,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ContaConsolidada } from '@/hooks/useContasConsolidadas';
import { formatCurrency, getBillCategoryName } from '@/utils/billCalculations';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContaConsolidadaCardProps {
  conta: ContaConsolidada;
  onClick?: (conta: ContaConsolidada) => void;
}

const BILL_TYPE_ICONS: Record<string, React.ReactNode> = {
  service: <Lightbulb className="h-5 w-5" />,
  telecom: <Smartphone className="h-5 w-5" />,
  subscription: <Tv className="h-5 w-5" />,
  housing: <Home className="h-5 w-5" />,
  education: <GraduationCap className="h-5 w-5" />,
  healthcare: <Heart className="h-5 w-5" />,
  insurance: <Shield className="h-5 w-5" />,
  loan: <Banknote className="h-5 w-5" />,
  credit_card: <CreditCard className="h-5 w-5" />,
  tax: <Receipt className="h-5 w-5" />,
  food: <UtensilsCrossed className="h-5 w-5" />,
  other: <Package className="h-5 w-5" />,
};

// Usa getBillCategoryName de billCalculations.ts para consistência

export function ContaConsolidadaCard({ conta, onClick }: ContaConsolidadaCardProps) {
  const navigate = useNavigate();
  const ehFaturaCartao = conta.source_type === 'credit_card_invoice';
  
  const dueDate = parseISO(conta.due_date);
  const hoje = new Date();
  const diasParaVencer = differenceInDays(dueDate, hoje);
  
  const getStatusColor = () => {
    if (conta.status === 'paid') return 'bg-green-100 text-green-800';
    if (conta.status === 'overdue') return 'bg-red-100 text-red-800';
    if (diasParaVencer <= 3) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };
  
  const getStatusLabel = () => {
    if (conta.status === 'paid') return 'Paga';
    if (conta.status === 'overdue') return 'Vencida';
    if (diasParaVencer === 0) return 'Vence hoje';
    if (diasParaVencer === 1) return 'Vence amanhã';
    if (diasParaVencer < 0) return `Vencida há ${Math.abs(diasParaVencer)} dias`;
    return `Vence em ${diasParaVencer} dias`;
  };
  
  const handleClick = () => {
    if (ehFaturaCartao && conta.credit_card_id) {
      navigate(`/cartoes?card=${conta.credit_card_id}`);
    } else if (onClick) {
      onClick(conta);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
          ehFaturaCartao ? 'border-l-4 border-l-purple-500' : ''
        }`}
        onClick={handleClick}
      >
        <div className="flex items-center justify-between">
          {/* Ícone e Info */}
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              ehFaturaCartao ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
            }`}>
              {BILL_TYPE_ICONS[conta.bill_type] || <Package className="h-5 w-5" />}
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-base">{conta.description}</h3>
                {conta.is_recurring && (
                  <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                {conta.is_installment && conta.installment_number && conta.installment_total && (
                  <Badge variant="outline" className="text-xs">
                    <Split className="h-3 w-3 mr-1" />
                    {conta.installment_number}/{conta.installment_total}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>{format(dueDate, "dd 'de' MMM", { locale: ptBR })}</span>
                {ehFaturaCartao && conta.credit_card_brand && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {conta.credit_card_brand}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {/* Valor e Status */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-semibold text-lg">{formatCurrency(conta.amount)}</p>
              <Badge className={`text-xs ${getStatusColor()}`}>
                {getStatusLabel()}
              </Badge>
            </div>
            
            {ehFaturaCartao && (
              <Button variant="ghost" size="icon" className="shrink-0">
                <ExternalLink className="h-4 w-4 text-purple-500" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Indicador de fatura de cartão */}
        {ehFaturaCartao && (
          <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Fatura do cartão {conta.credit_card_name}
            </span>
            <span className="text-purple-600 font-medium flex items-center gap-1">
              Ver detalhes <ExternalLink className="h-3.5 w-3.5" />
            </span>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
