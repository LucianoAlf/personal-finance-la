import { Flame } from 'lucide-react';

interface StreakHeatmapProps {
  currentStreak: number;
  bestStreak: number;
}

export function StreakHeatmap({ currentStreak, bestStreak }: StreakHeatmapProps) {
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    const maintained = i >= 12 - Math.min(12, currentStreak);
    return {
      key: `${d.getFullYear()}-${d.getMonth() + 1}`,
      label: d.toLocaleString('pt-BR', { month: 'short' }),
      maintained,
    };
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Flame className="h-5 w-5 text-orange-600" />
        <h3 className="text-lg font-semibold text-gray-900">Streak de Consistência</h3>
      </div>

      <div className="grid grid-cols-12 gap-1">
        {months.map((m) => (
          <div
            key={m.key}
            className={`aspect-[1/1] rounded-sm transition-all ${m.maintained ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-200 hover:bg-gray-300'}`}
            title={`${m.label} - ${m.maintained ? 'Mantido ✓' : 'Sem dados'}`}
          />
        ))}
      </div>

      <div className="flex justify-between text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-200 rounded-sm" />
          <span>Sem dados</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded-sm" />
          <span>Streak mantido</span>
        </div>
      </div>

      <div className="pt-3 border-t grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-orange-600">{currentStreak}</p>
          <p className="text-xs text-gray-600">Atual</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-yellow-600">{bestStreak}</p>
          <p className="text-xs text-gray-600">Recorde 🏆</p>
        </div>
      </div>
    </div>
  );
}
