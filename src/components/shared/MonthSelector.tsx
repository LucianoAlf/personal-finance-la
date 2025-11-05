import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface MonthSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  className?: string;
}

const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

export function MonthSelector({ selectedDate, onDateChange, className = '' }: MonthSelectorProps) {
  const [monthModalOpen, setMonthModalOpen] = useState(false);

  const formatMonthYear = (date: Date) => {
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${monthNames[date.getMonth()]} de ${date.getFullYear()}`;
  };

  const handlePreviousMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    onDateChange(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    onDateChange(newDate);
  };

  const handlePreviousYear = () => {
    const newDate = new Date(selectedDate);
    newDate.setFullYear(newDate.getFullYear() - 1);
    onDateChange(newDate);
  };

  const handleNextYear = () => {
    const newDate = new Date(selectedDate);
    newDate.setFullYear(newDate.getFullYear() + 1);
    onDateChange(newDate);
  };

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(monthIndex);
    onDateChange(newDate);
    setMonthModalOpen(false);
  };

  const handleCurrentMonth = () => {
    onDateChange(new Date());
    setMonthModalOpen(false);
  };

  return (
    <>
      {/* Seletor de Mês */}
      <div className={`flex items-center gap-2 ${className}`}>
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePreviousMonth}
          className="h-8 w-8"
        >
          <ChevronLeft size={16} />
        </Button>
        
        <Button
          variant="outline"
          onClick={() => setMonthModalOpen(true)}
          className="px-4 py-2 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 font-medium min-w-[180px]"
        >
          {formatMonthYear(selectedDate)}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextMonth}
          className="h-8 w-8"
        >
          <ChevronRight size={16} />
        </Button>
      </div>

      {/* MODAL DE SELEÇÃO DE MÊS */}
      <Dialog open={monthModalOpen} onOpenChange={setMonthModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Selecionar Período</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Header com ano */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePreviousYear}
                className="h-8 w-8"
              >
                <ChevronLeft size={16} />
              </Button>
              
              <h2 className="text-xl font-bold text-purple-600 min-w-[80px] text-center">
                {selectedDate.getFullYear()}
              </h2>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextYear}
                className="h-8 w-8"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
            
            {/* Grid de meses */}
            <div className="grid grid-cols-4 gap-3">
              {months.map((month, index) => {
                const isCurrentMonth = selectedDate.getMonth() === index;
                const isToday = new Date().getMonth() === index && new Date().getFullYear() === selectedDate.getFullYear();
                
                return (
                  <Button
                    key={month}
                    variant={isCurrentMonth ? "default" : "outline"}
                    onClick={() => handleMonthSelect(index)}
                    className={`h-10 text-sm font-medium ${
                      isCurrentMonth 
                        ? 'bg-purple-500 hover:bg-purple-600 text-white' 
                        : isToday
                        ? 'border-purple-200 text-purple-600 hover:bg-purple-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {month}
                  </Button>
                );
              })}
            </div>
            
            {/* Botões */}
            <div className="flex justify-between pt-4">
              <Button 
                variant="outline" 
                onClick={() => setMonthModalOpen(false)}
                className="text-purple-600 border-purple-200 hover:bg-purple-50"
              >
                CANCELAR
              </Button>
              <Button 
                onClick={handleCurrentMonth}
                className="bg-purple-500 hover:bg-purple-600"
              >
                MÊS ATUAL
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
