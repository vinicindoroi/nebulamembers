import { GitFork, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FunnelsEmptyStateProps {
  onCreateFunnel: () => void;
}

export function FunnelsEmptyState({ onCreateFunnel }: FunnelsEmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <GitFork className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Crie seu primeiro funil</h2>
        <p className="text-muted-foreground mb-6">
          Mapeie visualmente seus funis de vendas. Arraste elementos, conecte-os e
          acompanhe suas métricas de conversão em tempo real.
        </p>
        <Button onClick={onCreateFunnel} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Criar Funil
        </Button>
      </div>
    </div>
  );
}
