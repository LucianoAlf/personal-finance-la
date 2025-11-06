import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

export interface ComboboxOption {
  label: string;
  value: string;
}

interface ComboboxProps {
  value?: string;
  onValueChange: (value: string) => void;
  onInputChange?: (query: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
}

function useDebounce<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function Combobox({
  value,
  onValueChange,
  onInputChange,
  options,
  placeholder,
  emptyMessage = 'Nenhum item encontrado',
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const debounced = useDebounce(inputValue, 300);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (onInputChange) onInputChange(debounced);
  }, [debounced, onInputChange]);

  const selectedLabel = useMemo(() => {
    if (!value) return '';
    return options.find((o) => o.value === value)?.label || value;
  }, [options, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          type="button"
          className={cn('w-full justify-between', className)}
          onClick={() => setOpen((o) => !o)}
        >
          <span className={cn(!value && 'text-gray-500')}>
            {selectedLabel || placeholder || 'Selecione'}
          </span>
          <span className="text-gray-400">▼</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-2" align="start">
        <div className="space-y-2">
          <Input
            placeholder={placeholder || 'Pesquisar...'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <div className="max-h-64 overflow-y-auto">
            {options.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-500">{emptyMessage}</div>
            ) : (
              <ul className="space-y-1">
                {options.map((opt) => (
                  <li key={opt.value}>
                    <button
                      type="button"
                      className={cn(
                        'w-full text-left rounded-md px-2 py-1.5 hover:bg-gray-100',
                        value === opt.value && 'bg-gray-100'
                      )}
                      onClick={() => {
                        onValueChange(opt.value);
                        setOpen(false);
                        setInputValue('');
                        // focus back to trigger
                        setTimeout(() => triggerRef.current?.focus(), 0);
                      }}
                    >
                      {opt.label}
                    </button>
                  </li>)
                )}
              </ul>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
