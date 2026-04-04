// SPRINT 4: Componente para exibir badges do usuário
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Trophy, Lock, RefreshCw, Target, Palette, Briefcase, Coins, Scale, Flame, Gem, LineChart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBadges } from '@/hooks/useBadges';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function BadgesDisplay() {
  const { userBadges, loading, checkBadges, getBadgeProgress, getBadgesByCategory } = useBadges();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-600" />
            Suas Conquistas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">Carregando...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const categoryLabels = {
    investment: 'Investimento',
    engagement: 'Engajamento',
    performance: 'Performance',
  };

  // Mapeia badge_id para ícone Lucide + cores vibrantes
  const getBadgeIcon = (badgeId: string) => {
    switch (badgeId) {
      case 'first_investment':
        return Target;
      case 'diversified':
        return Palette;
      case 'investor':
        return Briefcase;
      case 'dividend_earner':
        return Coins;
      case 'balanced':
        return Scale;
      case 'consistent':
        return Flame;
      case 'wealthy':
        return Gem;
      case 'long_term':
        return LineChart;
      default:
        return Trophy;
    }
  };

  // Cores por badge_id (fundos vibrantes estilo premium)
  const getBadgeColor = (badgeId: string, unlocked: boolean) => {
    if (!unlocked) {
      return {
        bg: 'bg-gray-100',
        icon: 'text-gray-400',
        border: 'border-gray-200',
        cardBg: 'bg-gray-50',
      };
    }

    const colors: Record<string, any> = {
      first_investment: {
        bg: 'bg-blue-500',
        icon: 'text-white',
        border: 'border-blue-300',
        cardBg: 'bg-gradient-to-br from-blue-50 to-blue-100',
      },
      diversified: {
        bg: 'bg-purple-500',
        icon: 'text-white',
        border: 'border-purple-300',
        cardBg: 'bg-gradient-to-br from-purple-50 to-purple-100',
      },
      investor: {
        bg: 'bg-indigo-500',
        icon: 'text-white',
        border: 'border-indigo-300',
        cardBg: 'bg-gradient-to-br from-indigo-50 to-indigo-100',
      },
      dividend_earner: {
        bg: 'bg-green-500',
        icon: 'text-white',
        border: 'border-green-300',
        cardBg: 'bg-gradient-to-br from-green-50 to-green-100',
      },
      balanced: {
        bg: 'bg-teal-500',
        icon: 'text-white',
        border: 'border-teal-300',
        cardBg: 'bg-gradient-to-br from-teal-50 to-teal-100',
      },
      consistent: {
        bg: 'bg-orange-500',
        icon: 'text-white',
        border: 'border-orange-300',
        cardBg: 'bg-gradient-to-br from-orange-50 to-orange-100',
      },
      wealthy: {
        bg: 'bg-amber-500',
        icon: 'text-white',
        border: 'border-amber-300',
        cardBg: 'bg-gradient-to-br from-amber-50 to-amber-100',
      },
      long_term: {
        bg: 'bg-emerald-500',
        icon: 'text-white',
        border: 'border-emerald-300',
        cardBg: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
      },
    };

    return colors[badgeId] || {
      bg: 'bg-gray-500',
      icon: 'text-white',
      border: 'border-gray-300',
      cardBg: 'bg-gradient-to-br from-gray-50 to-gray-100',
    };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-600" />
              Suas Conquistas
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {userBadges.length} badge{userBadges.length !== 1 ? 's' : ''} desbloqueado
              {userBadges.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={checkBadges} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Verificar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress por categoria */}
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(getBadgeProgress).map(([category, progress]) => (
            <div key={category} className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">
                  {categoryLabels[category as keyof typeof categoryLabels]}
                </span>
                <span className="font-semibold">
                  {progress.unlocked}/{progress.total}
                </span>
              </div>
              <Progress
                value={(progress.unlocked / progress.total) * 100}
                className="h-2"
              />
            </div>
          ))}
        </div>

        {/* Badges por categoria */}
        {Object.entries(getBadgesByCategory).map(([category, badges]) => (
          <div key={category}>
            <h4 className="text-sm font-semibold mb-3 text-gray-700">
              {categoryLabels[category as keyof typeof categoryLabels]}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <AnimatePresence mode="popLayout">
                {badges.map((badge, index) => (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className={`
                      relative p-4 rounded-xl border-2 transition-all
                      ${
                        badge.unlocked
                          ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-300 hover:border-amber-400 hover:shadow-lg'
                          : 'bg-gray-50 border-gray-200'
                      }
                    `}
                  >
                    {/* Cadeado no canto superior direito (apenas se bloqueado) */}
                    {!badge.unlocked && (
                      <div className="absolute top-2 right-2">
                        <div className="p-1.5 bg-gray-200 rounded-lg">
                          <Lock className="h-4 w-4 text-gray-500" />
                        </div>
                      </div>
                    )}

                    {/* Conteúdo do card */}
                    <div className="flex flex-col items-center text-center gap-3">
                      {/* Ícone dentro do card - CIRCULAR e menor */}
                      {(() => {
                        const Icon = getBadgeIcon(badge.id);
                        const colors = getBadgeColor(badge.id, badge.unlocked);
                        return (
                          <div className={`p-3 rounded-full ${colors.bg}`}>
                            <Icon className={`h-6 w-6 ${colors.icon}`} />
                          </div>
                        );
                      })()}

                      {/* Título e descrição */}
                      <div className="space-y-1">
                        <p className={`text-sm font-semibold ${badge.unlocked ? 'text-gray-900' : 'text-gray-500'}`}>
                          {badge.name}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {badge.description}
                        </p>
                      </div>

                      {/* Troféus/Medalhas ou Barra de Progresso */}
                      {badge.unlocked ? (
                        <div className="flex gap-1 items-center">
                          <Trophy className="h-4 w-4 text-amber-600 fill-amber-600" />
                          <Trophy className="h-4 w-4 text-gray-300" />
                          <Trophy className="h-4 w-4 text-gray-300" />
                        </div>
                      ) : (
                        <div className="w-full space-y-1">
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: '0%' }}
                            />
                          </div>
                          <p className="text-xs text-gray-500">0%</p>
                        </div>
                      )}

                      {/* Data de desbloqueio */}
                      {badge.unlocked && badge.unlockedAt && (
                        <p className="text-xs text-amber-700 font-medium">
                          {formatDistanceToNow(new Date(badge.unlockedAt), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}

        {/* Empty state */}
        {userBadges.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="p-4 bg-amber-100 rounded-full mb-4">
              <Trophy className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Comece a desbloquear conquistas!</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Invista, diversifique e atinja suas metas para ganhar badges exclusivos.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
