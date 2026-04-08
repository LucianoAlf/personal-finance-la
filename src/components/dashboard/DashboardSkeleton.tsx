import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/70 bg-surface/95">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 w-48 animate-pulse rounded bg-surface-elevated" />
              <div className="h-4 w-64 animate-pulse rounded bg-surface-elevated" />
            </div>
            <div className="h-10 w-48 animate-pulse rounded-xl bg-surface-elevated" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse border-border/70 bg-surface/85 shadow-[0_18px_42px_rgba(3,8,20,0.2)]">
              <CardContent className="p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 rounded bg-surface-elevated" />
                    <div className="h-8 w-32 rounded bg-surface-elevated" />
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-surface-elevated" />
                </div>
                <div className="h-6 w-20 rounded bg-surface-elevated" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse border-border/70 bg-surface/85 shadow-[0_18px_42px_rgba(3,8,20,0.2)]">
              <CardHeader className="border-b border-border/70 bg-[linear-gradient(135deg,rgba(140,107,255,0.16),rgba(15,23,42,0.08)_40%,rgba(15,23,42,0.86)_100%)]">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-surface-elevated" />
                  <div className="h-5 w-40 rounded bg-surface-elevated" />
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex h-[300px] items-center justify-center rounded-[1.5rem] bg-surface-elevated/70">
                  <div className="h-32 w-32 animate-pulse rounded-full bg-surface-elevated" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="animate-pulse border-border/70 bg-surface/85 shadow-[0_18px_42px_rgba(3,8,20,0.2)]">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-surface-elevated" />
                <div className="space-y-2">
                  <div className="h-5 w-24 rounded bg-surface-elevated" />
                  <div className="h-4 w-32 rounded bg-surface-elevated" />
                </div>
              </div>
              <div className="h-24 rounded-[1.5rem] bg-surface-elevated/70" />
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse border-border/70 bg-surface/85 shadow-[0_18px_42px_rgba(3,8,20,0.2)]">
                <CardContent className="flex h-full flex-col items-center justify-center space-y-2 p-6">
                  <div className="h-8 w-8 rounded bg-surface-elevated" />
                  <div className="h-4 w-24 rounded bg-surface-elevated" />
                  <div className="h-3 w-16 rounded bg-surface-elevated" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse border-border/70 bg-surface/85 shadow-[0_18px_42px_rgba(3,8,20,0.2)]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="h-5 w-32 rounded bg-surface-elevated" />
                  <div className="h-8 w-20 rounded-xl bg-surface-elevated" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-surface-elevated/70 p-4">
                    <div className="h-10 w-10 rounded-xl bg-surface-elevated" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 rounded bg-surface-elevated" />
                      <div className="h-3 w-24 rounded bg-surface-elevated" />
                    </div>
                    <div className="space-y-2 text-right">
                      <div className="ml-auto h-5 w-20 rounded bg-surface-elevated" />
                      <div className="ml-auto h-3 w-16 rounded bg-surface-elevated" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse border-border/70 border-l-4 border-l-primary/30 bg-surface/85 shadow-[0_18px_42px_rgba(3,8,20,0.2)]">
              <CardContent className="p-6">
                <div className="flex items-start space-x-3">
                  <div className="h-6 w-6 rounded bg-surface-elevated" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded bg-surface-elevated" />
                    <div className="h-3 w-full rounded bg-surface-elevated" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
