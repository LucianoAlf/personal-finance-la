import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, BookOpen, Trophy, Lightbulb, Lock, CheckCircle2, GraduationCap } from 'lucide-react';

export function Education() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Educação Financeira"
        subtitle="Aprenda a cuidar melhor do seu dinheiro"
        icon={<GraduationCap size={24} />}
      />

      <div className="p-6 space-y-6">
        {/* Hero Section */}
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-8">
            <div className="flex items-center space-x-4 mb-4">
              <Bot size={48} />
              <div>
                <h2 className="text-2xl font-bold">Aprenda com a Ana Clara</h2>
                <p className="text-white/80">
                  Sua coach financeira está aqui para te ajudar!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trilha de Aprendizado */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trilha de Aprendizado</h3>
          <div className="space-y-4">
            <Card className="border-l-4 border-green-500">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <CheckCircle2 className="text-green-500 flex-shrink-0" size={24} />
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">
                        Módulo 1: Organização Básica
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">5/5 lições completas</p>
                      <Badge variant="success">Concluído</Badge>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    Revisar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-blue-500">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <BookOpen className="text-blue-500 flex-shrink-0" size={24} />
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">
                        Módulo 2: Eliminando Dívidas
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">3/5 lições completas (60%)</p>
                      <Badge variant="info">Em Progresso</Badge>
                    </div>
                  </div>
                  <Button size="sm">Continuar</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-gray-300 opacity-60">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <Lock className="text-gray-400 flex-shrink-0" size={24} />
                    <div>
                      <h4 className="font-semibold text-gray-600 mb-1">
                        Módulo 3: Começando a Investir
                      </h4>
                      <p className="text-sm text-gray-500 mb-2">
                        Bloqueado - Complete o Módulo 2
                      </p>
                      <Badge variant="outline">Bloqueado</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Conquistas */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Suas Conquistas</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { icon: Trophy, label: 'Primeiro Mês', unlocked: true },
              { icon: CheckCircle2, label: 'Economizou 10%', unlocked: true },
              { icon: Trophy, label: '30 Dias Streak', unlocked: true },
              { icon: Trophy, label: 'Meta Alcançada', unlocked: false },
              { icon: Trophy, label: 'Investidor', unlocked: false },
              { icon: Trophy, label: 'Mestre das Finanças', unlocked: false },
            ].map((achievement, index) => {
              const Icon = achievement.icon;
              return (
                <Card
                  key={index}
                  className={achievement.unlocked ? 'border-purple-500' : 'opacity-50'}
                >
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <Icon
                      size={32}
                      className={achievement.unlocked ? 'text-purple-500' : 'text-gray-400'}
                    />
                    <p className="text-xs font-medium text-gray-900 mt-2">
                      {achievement.label}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Dica do Dia */}
        <Card className="border-l-4 border-yellow-500">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <Lightbulb className="text-yellow-500 flex-shrink-0" size={32} />
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Dica do Dia</h4>
                <p className="text-gray-700">
                  Que tal revisar seus gastos com serviços de streaming? Você pode estar pagando
                  por serviços que não usa mais. Cancele assinaturas desnecessárias e economize!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
