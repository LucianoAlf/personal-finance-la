// SPRINT 4: Componente para exibir badges do usuário
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Trophy, Lock, RefreshCw } from 'lucide-react';
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
                      relative p-4 rounded-lg border-2 transition-all
                      ${
                        badge.unlocked
                          ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-300 hover:border-amber-400'
                          : 'bg-gray-50 border-gray-200 opacity-60'
                      }
                    `}
                  >
                    {/* Icon e Lock overlay */}
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className="relative">
                        <span className="text-4xl">{badge.icon}</span>
                        {!badge.unlocked && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                            <Lock className="h-5 w-5 text-white" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-gray-900">{badge.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {badge.description}
                        </p>

                        {badge.unlocked && badge.unlockedAt && (
                          <Badge variant="outline" className="text-xs mt-2 bg-amber-50 border-amber-200">
                            {formatDistanceToNow(new Date(badge.unlockedAt), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Glow effect para badges desbloqueados */}
                    {badge.unlocked && (
                      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-amber-200/20 to-yellow-200/20 blur-xl rounded-lg" />
                    )}
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
