import toast from 'react-hot-toast';
import { Zap, Trophy, Flame, TrendingUp } from 'lucide-react';

/**
 * Toast quando ganha XP
 */
export const showXPGainToast = (xpAmount: number, reason?: string) => {
  toast.success(
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
        <Zap className="h-5 w-5 text-indigo-600 fill-current" />
      </div>
      <div>
        <p className="font-bold text-gray-900">+{xpAmount} XP</p>
        {reason && <p className="text-sm text-gray-600">{reason}</p>}
      </div>
    </div>,
    {
      duration: 3000,
    }
  );
};

/**
 * Toast quando sobe de nível
 */
export const showLevelUpToast = (newLevel: number, levelTitle: string) => {
  toast.success(
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center animate-pulse">
        <Trophy className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="font-bold text-gray-900 text-lg">Subiu de Nível!</p>
        <p className="text-sm text-gray-600">
          Nível {newLevel} - {levelTitle}
        </p>
      </div>
    </div>,
    {
      duration: 5000,
      icon: '🎉',
    }
  );
};

/**
 * Toast quando mantém streak
 */
export const showStreakToast = (streakCount: number) => {
  toast.success(
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
        <Flame className="h-5 w-5 text-orange-600 fill-current" />
      </div>
      <div>
        <p className="font-bold text-gray-900">Streak mantido!</p>
        <p className="text-sm text-gray-600">
          {streakCount} {streakCount === 1 ? 'mês' : 'meses'} consecutivos 🔥
        </p>
      </div>
    </div>,
    {
      duration: 4000,
    }
  );
};

/**
 * Toast quando completa uma meta
 */
export const showGoalCompletedToast = (goalName: string) => {
  toast.success(
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
        <TrendingUp className="h-5 w-5 text-green-600" />
      </div>
      <div>
        <p className="font-bold text-gray-900">Meta Completada!</p>
        <p className="text-sm text-gray-600">{goalName}</p>
      </div>
    </div>,
    {
      duration: 4000,
      icon: '✅',
    }
  );
};

/**
 * Toast genérico de conquista
 */
export const showAchievementToast = (achievementName: string, tier: string) => {
  toast.success(
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
        <Trophy className="h-5 w-5 text-yellow-600" />
      </div>
      <div>
        <p className="font-bold text-gray-900">Nova Conquista!</p>
        <p className="text-sm text-gray-600">
          {achievementName} - {tier}
        </p>
      </div>
    </div>,
    {
      duration: 4000,
      icon: '🏆',
    }
  );
};

/**
 * Toast de progresso de conquista
 */
export const showProgressToast = (achievementName: string, progress: number) => {
  toast(
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
        <TrendingUp className="h-5 w-5 text-blue-600" />
      </div>
      <div className="flex-1">
        <p className="font-bold text-gray-900 text-sm">{achievementName}</p>
        <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-600 mt-1">{Math.round(progress)}% completo</p>
      </div>
    </div>,
    {
      duration: 3000,
    }
  );
};
