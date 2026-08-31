export interface MindMapTheme {
  id: string;
  name: string;
  background: string;
  dotColor: string;
  edgeColor: string;
  depthColors: Record<number, string>;
  edgeDepthColors: Record<number, string>;
  nodeTextDark: boolean;
}

export const MIND_MAP_THEMES: MindMapTheme[] = [
  {
    id: 'nebula',
    name: 'Nebula',
    background: '#0f0f14',
    dotColor: 'rgba(139,92,246,0.06)',
    edgeColor: 'rgba(139,92,246,0.25)',
    depthColors: { 0: '#8b5cf6', 1: '#1e1b2e', 2: '#1b2030', 3: '#2e1b28', 4: '#1b2e22', 5: '#2e2b1b' },
    edgeDepthColors: { 0: '#8b5cf6', 1: '#ec4899', 2: '#f59e0b', 3: '#10b981', 4: '#3b82f6', 5: '#06b6d4' },
    nodeTextDark: false,
  },
  {
    id: 'midnite',
    name: 'Midnite',
    background: '#0f0f11',
    dotColor: 'rgba(255,255,255,0.06)',
    edgeColor: 'rgba(255,255,255,0.18)',
    depthColors: { 0: '#6366f1', 1: '#2d2f3d', 2: '#2a3040', 3: '#3d2d34', 4: '#2d3d2e', 5: '#3d3a2d' },
    edgeDepthColors: { 0: '#6366f1', 1: '#818cf8', 2: '#38bdf8', 3: '#f472b6', 4: '#34d399', 5: '#fbbf24' },
    nodeTextDark: false,
  },
  {
    id: 'fireworks',
    name: 'Fireworks',
    background: '#1a1a2e',
    dotColor: 'rgba(255,255,255,0.05)',
    edgeColor: 'rgba(255,255,255,0.2)',
    depthColors: { 0: '#e91e63', 1: '#fbbf24', 2: '#34d399', 3: '#60a5fa', 4: '#a78bfa', 5: '#fb923c' },
    edgeDepthColors: { 0: '#e91e63', 1: '#fbbf24', 2: '#34d399', 3: '#60a5fa', 4: '#a78bfa', 5: '#fb923c' },
    nodeTextDark: false,
  },
  {
    id: 'nostalgia',
    name: 'Nostalgia',
    background: '#faf9f6',
    dotColor: 'rgba(0,0,0,0.05)',
    edgeColor: 'rgba(120,113,108,0.3)',
    depthColors: { 0: '#38bdf8', 1: '#e7e5e4', 2: '#d6d3d1', 3: '#e7e5e4', 4: '#d6d3d1', 5: '#e7e5e4' },
    edgeDepthColors: { 0: '#0284c7', 1: '#d97706', 2: '#059669', 3: '#dc2626', 4: '#7c3aed', 5: '#0891b2' },
    nodeTextDark: true,
  },
  {
    id: 'cubicle',
    name: 'Cubicle',
    background: '#f8fafc',
    dotColor: 'rgba(0,0,0,0.06)',
    edgeColor: 'rgba(100,116,139,0.25)',
    depthColors: { 0: '#1e40af', 1: '#e2e8f0', 2: '#cbd5e1', 3: '#e2e8f0', 4: '#cbd5e1', 5: '#e2e8f0' },
    edgeDepthColors: { 0: '#1e40af', 1: '#2563eb', 2: '#0891b2', 3: '#059669', 4: '#d97706', 5: '#dc2626' },
    nodeTextDark: true,
  },
  {
    id: 'blackboard',
    name: 'Blackboard',
    background: '#1c2127',
    dotColor: 'rgba(255,255,255,0.04)',
    edgeColor: 'rgba(148,163,184,0.25)',
    depthColors: { 0: '#94a3b8', 1: '#334155', 2: '#1e293b', 3: '#334155', 4: '#1e293b', 5: '#334155' },
    edgeDepthColors: { 0: '#94a3b8', 1: '#60a5fa', 2: '#f472b6', 3: '#fbbf24', 4: '#34d399', 5: '#a78bfa' },
    nodeTextDark: false,
  },
  {
    id: 'darkmode',
    name: 'Dark Mode',
    background: '#09090b',
    dotColor: 'rgba(255,255,255,0.04)',
    edgeColor: 'rgba(63,63,70,0.5)',
    depthColors: { 0: '#a78bfa', 1: '#27272a', 2: '#18181b', 3: '#27272a', 4: '#18181b', 5: '#27272a' },
    edgeDepthColors: { 0: '#a78bfa', 1: '#c084fc', 2: '#38bdf8', 3: '#fb923c', 4: '#34d399', 5: '#f472b6' },
    nodeTextDark: false,
  },
  {
    id: 'nature',
    name: 'Natureza',
    background: '#0d1117',
    dotColor: 'rgba(16,185,129,0.08)',
    edgeColor: 'rgba(16,185,129,0.25)',
    depthColors: { 0: '#10b981', 1: '#1a2e28', 2: '#1e2d23', 3: '#2a3028', 4: '#1e2828', 5: '#242e1e' },
    edgeDepthColors: { 0: '#10b981', 1: '#34d399', 2: '#2dd4bf', 3: '#a3e635', 4: '#fbbf24', 5: '#38bdf8' },
    nodeTextDark: false,
  },
  {
    id: 'business',
    name: 'Business',
    background: '#1c1c1e',
    dotColor: 'rgba(255,255,255,0.04)',
    edgeColor: 'rgba(150,150,150,0.3)',
    depthColors: { 0: '#3b82f6', 1: '#1e293b', 2: '#1e293b', 3: '#1e293b', 4: '#1e293b', 5: '#1e293b' },
    edgeDepthColors: { 0: '#3b82f6', 1: '#60a5fa', 2: '#f472b6', 3: '#fbbf24', 4: '#34d399', 5: '#a78bfa' },
    nodeTextDark: false,
  },
  {
    id: 'candy',
    name: 'Candy',
    background: '#fdf2f8',
    dotColor: 'rgba(236,72,153,0.06)',
    edgeColor: 'rgba(236,72,153,0.2)',
    depthColors: { 0: '#ec4899', 1: '#fce7f3', 2: '#fbcfe8', 3: '#f9a8d4', 4: '#fce7f3', 5: '#fbcfe8' },
    edgeDepthColors: { 0: '#ec4899', 1: '#f472b6', 2: '#a855f7', 3: '#3b82f6', 4: '#14b8a6', 5: '#f59e0b' },
    nodeTextDark: true,
  },
  {
    id: 'ocean',
    name: 'Oceano',
    background: '#0c1222',
    dotColor: 'rgba(56,189,248,0.06)',
    edgeColor: 'rgba(56,189,248,0.2)',
    depthColors: { 0: '#0ea5e9', 1: '#0c4a6e', 2: '#075985', 3: '#0369a1', 4: '#0c4a6e', 5: '#075985' },
    edgeDepthColors: { 0: '#0ea5e9', 1: '#38bdf8', 2: '#2dd4bf', 3: '#a78bfa', 4: '#fb923c', 5: '#f472b6' },
    nodeTextDark: false,
  },
];
