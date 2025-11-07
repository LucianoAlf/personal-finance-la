import { motion } from 'framer-motion';
import { PiggyBank, Shield } from 'lucide-react';

type TabType = 'savings' | 'spending';

interface GoalSegmentedControlProps {
  active: TabType;
  onChange: (tab: TabType) => void;
  savingsCount: number;
  spendingCount: number;
  savingsMetric?: string;
  spendingMetric?: string;
}

export function GoalSegmentedControl({
  active,
  onChange,
  savingsCount,
  spendingCount,
  savingsMetric,
  spendingMetric,
}: GoalSegmentedControlProps) {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="relative rounded-2xl bg-white/90 backdrop-blur border p-2 shadow-sm">
        <div className="relative grid grid-cols-2">
          <motion.div
            className="absolute top-2 bottom-2 w-[calc(50%-8px)] rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow"
            animate={{ x: active === 'savings' ? 0 : '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          />

          <button
            type="button"
            className={`relative z-10 flex items-center gap-3 px-4 py-4 rounded-xl text-left transition-colors ${
              active === 'savings' ? 'text-white' : 'text-gray-700'
            }`}
            aria-pressed={active === 'savings'}
            onClick={() => onChange('savings')}
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              active === 'savings' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
            }`}>
              <PiggyBank className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Economia ({savingsCount})</span>
              {savingsMetric && (
                <span className={`text-xs ${active === 'savings' ? 'text-white/80' : 'text-gray-500'}`}>{savingsMetric}</span>
              )}
            </div>
          </button>

          <button
            type="button"
            className={`relative z-10 flex items-center gap-3 px-4 py-4 rounded-xl text-left transition-colors ${
              active === 'spending' ? 'text-white' : 'text-gray-700'
            }`}
            aria-pressed={active === 'spending'}
            onClick={() => onChange('spending')}
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              active === 'spending' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
            }`}>
              <Shield className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Gastos ({spendingCount})</span>
              {spendingMetric && (
                <span className={`text-xs ${active === 'spending' ? 'text-white/80' : 'text-gray-500'}`}>{spendingMetric}</span>
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
