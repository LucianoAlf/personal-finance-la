import { useMemo } from 'react';
import { Combobox } from '@/components/ui/combobox';
import { BILL_CATEGORIES } from '@/constants/bill-categories';

interface CategorySelectorProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function CategorySelector({
  value,
  onChange,
  placeholder = 'Selecione uma categoria',
}: CategorySelectorProps) {
  const options = useMemo(
    () => BILL_CATEGORIES.map((c) => ({ value: c.id, label: c.name })),
    []
  );

  return (
    <Combobox
      value={value}
      onValueChange={onChange}
      options={options}
      placeholder={placeholder}
      emptyMessage="Nenhuma categoria encontrada"
    />
  );
}
