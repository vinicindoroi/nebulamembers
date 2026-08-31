import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Palette } from 'lucide-react';
import { MIND_MAP_THEMES, MindMapTheme } from './mindMapThemes';
import { cn } from '@/lib/utils';

interface Props {
  currentTheme: string;
  onChangeTheme: (id: string) => void;
}

function ThemePreview({ theme, selected }: { theme: MindMapTheme; selected: boolean }) {
  const colors = Object.values(theme.depthColors);
  const edgeColors = Object.values(theme.edgeDepthColors);
  const root = colors[0];
  const c1 = colors[1] || root;
  const c2 = colors[2] || c1;
  const c3 = colors[3] || c2;
  const ec1 = edgeColors[1] || edgeColors[0] || theme.edgeColor;
  const ec2 = edgeColors[2] || ec1;
  const ec3 = edgeColors[3] || ec2;
  const ec4 = edgeColors[4] || ec1;
  const ec5 = edgeColors[5] || ec2;

  return (
    <button
      className={cn(
        'flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all cursor-pointer hover:scale-[1.03]',
        selected
          ? 'border-primary shadow-md shadow-primary/20'
          : 'border-transparent hover:border-border'
      )}
      style={{ backgroundColor: theme.background }}
    >
      {/* Mini mind map preview */}
      <svg width="72" height="48" viewBox="0 0 72 48" fill="none" className="shrink-0">
        {/* Root node */}
        <rect x="24" y="16" width="24" height="14" rx="4" fill={root} />

        {/* Edges — colored per branch */}
        <path d={`M 48 23 C 56 23 52 8 60 8`} stroke={ec1} strokeWidth="1.5" fill="none" />
        <path d={`M 48 23 C 56 23 52 23 60 23`} stroke={ec2} strokeWidth="1.5" fill="none" />
        <path d={`M 48 23 C 56 23 52 38 60 38`} stroke={ec3} strokeWidth="1.5" fill="none" />
        <path d={`M 24 23 C 16 23 18 12 10 12`} stroke={ec4} strokeWidth="1.5" fill="none" />
        <path d={`M 24 23 C 16 23 18 34 10 34`} stroke={ec5} strokeWidth="1.5" fill="none" />

        {/* Child nodes right */}
        <rect x="56" y="4" width="14" height="8" rx="3" fill={c1} />
        <rect x="56" y="19" width="14" height="8" rx="3" fill={c2} />
        <rect x="56" y="34" width="14" height="8" rx="3" fill={c3} />

        {/* Child nodes left */}
        <rect x="2" y="8" width="14" height="8" rx="3" fill={c2} />
        <rect x="2" y="30" width="14" height="8" rx="3" fill={c1} />
      </svg>
      <span
        className="text-[10px] font-medium leading-none"
        style={{ color: theme.nodeTextDark ? '#374151' : '#d1d5db', fontStyle: theme.id === 'blackboard' ? 'italic' : 'normal' }}
      >
        {theme.name}
      </span>
    </button>
  );
}

export function MindMapThemeSelector({ currentTheme, onChangeTheme }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant="secondary" className="h-8 w-8 rounded-lg shadow" title="Temas">
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-3" side="top" align="center">
        <p className="text-xs font-semibold text-foreground mb-2">Temas</p>
        <div className="grid grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
          {MIND_MAP_THEMES.map((t) => (
            <div key={t.id} onClick={() => onChangeTheme(t.id)}>
              <ThemePreview theme={t} selected={currentTheme === t.id} />
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
