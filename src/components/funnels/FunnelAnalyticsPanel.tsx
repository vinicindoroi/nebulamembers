import { Eye, Users, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FunnelAnalyticsPanelProps {
  totalVisitors: number;
  totalPageviews: number;
  timeRangeHours: number;
  onTimeRangeChange: (hours: number) => void;
  isLoading?: boolean;
  hasTrackingToken?: boolean;
}

const timeRanges = [
  { label: '1h', value: 1 },
  { label: '6h', value: 6 },
  { label: 'Hoje', value: -1 },
  { label: 'Ontem', value: -2 },
  { label: '7d', value: 168 },
];

export function FunnelAnalyticsPanel({
  totalVisitors,
  totalPageviews,
  timeRangeHours,
  onTimeRangeChange,
  isLoading,
  hasTrackingToken = true,
}: FunnelAnalyticsPanelProps) {
  return (
    <div className="absolute bottom-4 right-4 z-10 bg-[#1a1a1f]/95 border border-[#2a2a30] rounded-xl shadow-2xl backdrop-blur-sm p-3 min-w-[200px]">
      {/* No tracking token warning */}
      {!hasTrackingToken && (
        <div className="flex items-center gap-2 mb-3 px-2 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <p className="text-[10px] text-amber-300">Configure o Tracking para coletar dados</p>
        </div>
      )}
      {/* Time range selector */}
      <div className="flex items-center gap-1 mb-3">
        <Clock className="w-3 h-3 text-muted-foreground" />
        <div className="flex bg-[#2a2a30] rounded-full p-0.5 flex-1">
          {timeRanges.map((range) => (
            <button
              key={range.value}
              onClick={() => onTimeRangeChange(range.value)}
              className={cn(
                'flex-1 text-[10px] font-medium py-1 px-2 rounded-full transition-colors',
                timeRangeHours === range.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 bg-[#2a2a30] rounded-lg p-2">
          <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Users className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Visitantes</p>
            <p className="text-sm font-bold text-foreground">
              {isLoading ? '...' : totalVisitors.toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-[#2a2a30] rounded-lg p-2">
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Pageviews</p>
            <p className="text-sm font-bold text-foreground">
              {isLoading ? '...' : totalPageviews.toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
