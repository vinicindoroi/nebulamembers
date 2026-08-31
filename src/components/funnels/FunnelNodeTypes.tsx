import { memo } from 'react';
import { Handle, Position, NodeProps, useReactFlow, NodeResizer } from '@xyflow/react';
import { FreeTextNode as FreeTextNodeComponent } from './FreeTextNode';
import { useFunnelEducationalMode } from './FunnelEducationalContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { 
  Facebook, 
  Globe, 
  Instagram, 
  Youtube,
  FileText,
  ShoppingCart,
  CreditCard,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  Mail,
  MessageCircle,
  Smartphone,
  MousePointer,
  Circle,
  Users,
  Wallet,
  QrCode,
  RefreshCcw,
  Clock,
  CheckCheck,
  XCircle,
  StickyNote,
  Package,
  LucideIcon,
  X,
  MessageSquare,
  Megaphone,
  Layers,
  Image as ImageIcon,
  Sparkles,
  Target,
  GitBranch,
  Crosshair,
  Send,
  Link2,
  Smartphone as AppIcon,
  ShoppingBasket,
  ThumbsUp,
  ThumbsDown,
  LayoutTemplate,
  ScrollText,
  HelpCircle,
  Play,
  Phone,
  GraduationCap,
  Search,
  Handshake,
  Tv,
  Webhook,
  Bell,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MessageNode } from './MessageNode';

// TikTok icon component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

// Pix icon component
const PixIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.66 10.34l-2.83-2.83a2 2 0 00-2.83 0L9.17 10.34a2 2 0 000 2.83L12 16l2.83-2.83a2 2 0 000-2.83zM12 4L6.34 9.66a4 4 0 000 5.66L12 21l5.66-5.66a4 4 0 000-5.66L12 4z"/>
  </svg>
);

// Quiz funnel icon - horizontal connected steps
const QuizFunnelIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {/* Step 1 */}
    <rect x="1" y="7" width="5" height="10" rx="1" />
    {/* Connector 1 */}
    <line x1="6" y1="12" x2="9" y2="12" />
    {/* Step 2 */}
    <rect x="9" y="7" width="5" height="10" rx="1" />
    {/* Connector 2 */}
    <line x1="14" y1="12" x2="17" y2="12" />
    {/* Step 3 */}
    <rect x="17" y="7" width="5" height="10" rx="1" />
    {/* Dots inside */}
    <circle cx="3.5" cy="10" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="3.5" cy="12" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="3.5" cy="14" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="11.5" cy="10" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="11.5" cy="12" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="19.5" cy="10" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);

// VSL icon - video player with button below
const VslIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {/* Video block */}
    <rect x="3" y="2" width="18" height="12" rx="1.5" />
    {/* Play triangle */}
    <polygon points="10,5.5 10,10.5 14.5,8" fill="currentColor" stroke="none" />
    {/* CTA button below */}
    <rect x="5" y="16" width="14" height="4" rx="2" />
    <line x1="8" y1="18" x2="16" y2="18" />
  </svg>
);

// Meta Pixel icon component (official Meta Pixel logo)
const MetaPixelIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 6c-3.31 0-6 2.69-6 6h2c0-2.21 1.79-4 4-4V6z"/>
    <path d="M18 12c0-3.31-2.69-6-6-6v2c2.21 0 4 1.79 4 4h2z"/>
  </svg>
);

// AI Tool image imports
import chatgptIcon from '@/assets/ai-icons/chatgpt.png';
import geminiIcon from '@/assets/ai-icons/gemini.png';
import claudeIcon from '@/assets/ai-icons/claude.png';
import grokIcon from '@/assets/ai-icons/grok.png';
import lovableIcon from '@/assets/ai-icons/lovable.png';
import boltIcon from '@/assets/ai-icons/bolt.png';
import cursorIcon from '@/assets/ai-icons/cursor.png';
import perplexityIcon from '@/assets/ai-icons/perplexity.png';
import deepseekIcon from '@/assets/ai-icons/deepseek.png';

// AI tool options for the config panel
export const aiToolOptions = [
  { value: 'gpt', label: 'ChatGPT', image: chatgptIcon, color: '#10A37F' },
  { value: 'gemini', label: 'Gemini', image: geminiIcon, color: '#FFFFFF' },
  { value: 'claude', label: 'Claude', image: claudeIcon, color: '#FFFFFF' },
  { value: 'grok', label: 'Grok', image: grokIcon, color: '#FFFFFF' },
  { value: 'lovable', label: 'Lovable', image: lovableIcon, color: '#FFFFFF' },
  { value: 'bolt', label: 'Bolt', image: boltIcon, color: '#FFFFFF' },
  { value: 'cursor', label: 'Cursor', image: cursorIcon, color: '#FFFFFF' },
  { value: 'perplexity', label: 'Perplexity', image: perplexityIcon, color: '#FFFFFF' },
  { value: 'deepseek', label: 'DeepSeek', image: deepseekIcon, color: '#FFFFFF' },
];

// AI tool image map for quick lookup
export const aiToolImageMap: Record<string, string> = {
  gpt: chatgptIcon,
  gemini: geminiIcon,
  claude: claudeIcon,
  grok: grokIcon,
  lovable: lovableIcon,
  bolt: boltIcon,
  cursor: cursorIcon,
  perplexity: perplexityIcon,
  deepseek: deepseekIcon,
};

// AI tool color map
export const aiToolColorMap: Record<string, string> = {
  gpt: '#10A37F',
  gemini: '#FFFFFF',
  claude: '#FFFFFF',
  grok: '#FFFFFF',
  lovable: '#FFFFFF',
  bolt: '#FFFFFF',
  cursor: '#FFFFFF',
  perplexity: '#FFFFFF',
  deepseek: '#FFFFFF',
};

// Node data interface
export interface FunnelNodeData {
  label: string;
  type: string;
  visitors?: number;
  leads?: number;
  sales?: number;
  url?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  conversionGoal?: number;
  trackingEvent?: string;
  waitTime?: number;
  waitUnit?: 'hours' | 'days';
  content?: string;
  edgeStyle?: 'solid' | 'dashed' | 'success' | 'failure';
  // Text formatting
  textBold?: boolean;
  textItalic?: boolean;
  textUnderline?: boolean;
  textColor?: string;
  // Note/Text color
  backgroundColor?: string;
  fontSize?: 'sm' | 'md' | 'lg';
  // Dimensions for resizable nodes
  width?: number;
  height?: number;
  // Screenshot for page nodes
  screenshot?: string;
  screenshotAspectRatio?: number;
  screenshotBlur?: boolean;
  // Custom icon for any block
  customIcon?: string;
  // Page subtype (for sales-page)
  pageType?: 'landing-page' | 'presell' | 'quiz' | 'vsl';
  // Page notes/annotations
  pageNotes?: string;
  // Campaign settings (fb-campaign)
  budgetType?: 'cbo' | 'abo';
  campaignType?: 'normal' | 'advantage_plus';
  budget?: number;
  showBudgetBadge?: boolean;
  // Ad Set settings (fb-adset) - targeting
  segmentationType?: 'open' | 'interest' | 'advantage';
  adsetBudget?: number;
  ageMin?: number;
  ageMax?: number;
  gender?: 'all' | 'male' | 'female';
  regions?: string[];
  languages?: string[];
  placements?: string[];
  interests?: string;
  pixelId?: string;
  // Pixel block settings (standalone pixel node)
  pixelName?: string;
  pixelAccessToken?: string;
  // Ad settings (fb-ad)
  driveLink?: string;
  adMedia?: string;
  adMediaType?: 'image' | 'video';
  adPrimaryText?: string;
  adSecondaryText?: string;
  adCaption?: string;
  adCopy?: string;
  // Email content
  emailContent?: string;
  // WhatsApp message content
  whatsappMessage?: string;
  // WhatsApp phone number
  whatsappPhone?: string;
  // WhatsApp status (active or down)
  whatsappStatus?: 'active' | 'down';
  // Group ID for grouped nodes
  groupId?: string;
  // AI tool selection for ai-tool nodes
  aiTool?: string;
  // Analytics data (injected by FunnelCanvas when liveMode is on)
  analyticsEnabled?: boolean;
  analyticsPageviews?: number;
  analyticsVisitors?: number;
  analyticsIsLive?: boolean;
  [key: string]: unknown;
}

// Icon mapping
export const iconMap: Record<string, LucideIcon | React.ComponentType<{ className?: string }>> = {
  'facebook-ads': Facebook,
  'fb-campaign': Megaphone,
  'fb-adset': Layers,
  'fb-ad': ImageIcon,
  'google-ads': Globe,
  'instagram': Instagram,
  'youtube': Youtube,
  'tiktok-ads': TikTokIcon,
  'lead-capture': Users,
  'pixel': MetaPixelIcon,
  'optin': FileText,
  'sales-page': ShoppingCart,
  'checkout': CreditCard,
  'upsell': ArrowUp,
  'downsell': ArrowDown,
  'orderbump': Package,
  'thankyou': CheckCircle,
  'cart': ShoppingBasket,
  'link-bio': Link2,
  'app': AppIcon,
  'members-area': GraduationCap,
  'organic-traffic': Search,
  'affiliates': Handshake,
  'webinar': Tv,
  'quiz': QuizFunnelIcon,
  'vsl': VslIcon,
  'presell': ScrollText,
  'webhook': Webhook,
  'push-notification': Bell,
  'credit-card': CreditCard,
  'boleto': Wallet,
  'pix': PixIcon,
  'recurrence': RefreshCcw,
  'email': Mail,
  'whatsapp': MessageCircle,
  'whatsapp-message': Send,
  'sms': Smartphone,
  'cta': MousePointer,
  'ab-test': GitBranch,
  'condition-bought': CheckCheck,
  'condition-not-bought': XCircle,
  'condition-timer': Clock,
  'condition-accepted': ThumbsUp,
  'condition-rejected': ThumbsDown,
  'sticky-note': StickyNote,
  'free-text': FileText,
  'message': MessageSquare,
  'standalone-line': ArrowDown,
  'line-anchor': Circle,
  'ai-tool': Sparkles,
};

// Category mapping
export const categoryMap: Record<string, 'traffic' | 'page' | 'action' | 'payment' | 'automation' | 'condition' | 'note' | 'text' | 'fb-campaign' | 'fb-adset' | 'fb-ad' | 'connector'> = {
  'facebook-ads': 'traffic',
  'fb-campaign': 'fb-campaign',
  'fb-adset': 'fb-adset',
  'fb-ad': 'fb-ad',
  'google-ads': 'traffic',
  'instagram': 'traffic',
  'youtube': 'traffic',
  'tiktok-ads': 'traffic',
  'lead-capture': 'traffic',
  'pixel': 'traffic',
  'optin': 'page',
  'sales-page': 'page',
  'checkout': 'page',
  'upsell': 'page',
  'downsell': 'page',
  'orderbump': 'page',
  'thankyou': 'page',
  'cart': 'page',
  'link-bio': 'page',
  'app': 'page',
  'members-area': 'page',
  'organic-traffic': 'traffic',
  'affiliates': 'traffic',
  'webinar': 'page',
  'quiz': 'page',
  'vsl': 'page',
  'presell': 'page',
  'webhook': 'automation',
  'push-notification': 'automation',
  'credit-card': 'payment',
  'boleto': 'payment',
  'pix': 'payment',
  'recurrence': 'payment',
  'email': 'automation',
  'whatsapp': 'automation',
  'whatsapp-message': 'automation',
  'sms': 'automation',
  'cta': 'action',
  'ab-test': 'action',
  'condition-bought': 'condition',
  'condition-not-bought': 'condition',
  'condition-timer': 'condition',
  'condition-accepted': 'condition',
  'condition-rejected': 'condition',
  'sticky-note': 'note',
  'free-text': 'text',
  'message': 'action',
  'standalone-line': 'connector',
  'line-anchor': 'connector',
  'ai-tool': 'action',
};

// Color mapping for circular icons (Traffic/Actions/Payment/Automation)
const iconColorMap: Record<string, { bg: string; icon: string; shadow: string }> = {
  'facebook-ads': { 
    bg: 'bg-[#1877F2]', 
    icon: 'text-white', 
    shadow: 'shadow-[0_4px_20px_rgba(24,119,242,0.4)]' 
  },
  'fb-campaign': { 
    bg: 'bg-[#1877F2]', 
    icon: 'text-white', 
    shadow: 'shadow-[0_4px_20px_rgba(24,119,242,0.4)]' 
  },
  'fb-adset': { 
    bg: 'bg-[#4267B2]', 
    icon: 'text-white', 
    shadow: 'shadow-[0_4px_20px_rgba(66,103,178,0.4)]' 
  },
  'fb-ad': { 
    bg: 'bg-[#3578E5]', 
    icon: 'text-white', 
    shadow: 'shadow-[0_4px_20px_rgba(53,120,229,0.4)]' 
  },
  'google-ads': { 
    bg: 'bg-gradient-to-br from-[#4285F4] via-[#EA4335] to-[#FBBC05]', 
    icon: 'text-white', 
    shadow: 'shadow-[0_4px_20px_rgba(66,133,244,0.4)]' 
  },
  'instagram': { 
    bg: 'bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737]', 
    icon: 'text-white', 
    shadow: 'shadow-[0_4px_20px_rgba(225,48,108,0.4)]' 
  },
  'youtube': { 
    bg: 'bg-[#FF0000]', 
    icon: 'text-white', 
    shadow: 'shadow-[0_4px_20px_rgba(255,0,0,0.4)]' 
  },
  'tiktok-ads': { 
    bg: 'bg-gradient-to-br from-[#00F2EA] via-[#000000] to-[#FF0050]', 
    icon: 'text-white', 
    shadow: 'shadow-[0_4px_20px_rgba(0,242,234,0.4)]' 
  },
  'lead-capture': { 
    bg: 'bg-[#10B981]', 
    icon: 'text-white', 
    shadow: 'shadow-[0_4px_20px_rgba(16,185,129,0.4)]' 
  },
  'organic-traffic': {
    bg: 'bg-gradient-to-br from-[#64748B] to-[#475569]',
    icon: 'text-white',
    shadow: 'shadow-[0_4px_20px_rgba(100,116,139,0.4)]'
  },
  'affiliates': {
    bg: 'bg-[#F59E0B]',
    icon: 'text-white',
    shadow: 'shadow-[0_4px_20px_rgba(245,158,11,0.4)]'
  },
  'webhook': {
    bg: 'bg-gradient-to-br from-[#4F46E5] to-[#7C3AED]',
    icon: 'text-white',
    shadow: 'shadow-[0_4px_20px_rgba(79,70,229,0.4)]'
  },
  'push-notification': {
    bg: 'bg-[#FBBF24]',
    icon: 'text-white',
    shadow: 'shadow-[0_4px_20px_rgba(251,191,36,0.4)]'
  },
  'credit-card': { 
    bg: 'bg-[#3B82F6]', 
    icon: 'text-white', 
    shadow: 'shadow-[0_4px_20px_rgba(59,130,246,0.4)]' 
  },
  'boleto': { 
    bg: 'bg-[#64748B]', 
    icon: 'text-white', 
    shadow: 'shadow-[0_4px_20px_rgba(100,116,139,0.4)]' 
  },
  'pix': { 
    bg: 'bg-[#32BCAD]', 
    icon: 'text-white', 
    shadow: 'shadow-[0_4px_20px_rgba(50,188,173,0.4)]' 
  },
  'recurrence': { 
    bg: 'bg-[#8B5CF6]', 
    icon: 'text-white', 
    shadow: 'shadow-[0_4px_20px_rgba(139,92,246,0.4)]' 
  },
  'email': { 
    bg: 'bg-[#7C3AED]', 
    icon: 'text-white', 
    shadow: 'shadow-[0_4px_20px_rgba(124,58,237,0.4)]' 
  },
  'whatsapp': { 
    bg: 'bg-[#25D366]', 
    icon: 'text-white', 
    shadow: 'shadow-[0_4px_20px_rgba(37,211,102,0.4)]' 
  },
  'whatsapp-message': { 
    bg: 'bg-[#25D366]', 
    icon: 'text-white', 
    shadow: 'shadow-[0_4px_20px_rgba(37,211,102,0.4)]' 
  },
  'sms': { 
    bg: 'bg-[#6366F1]', 
    icon: 'text-white', 
    shadow: 'shadow-[0_4px_20px_rgba(99,102,241,0.4)]' 
  },
  'cta': { 
    bg: 'bg-[#F97316]', 
    icon: 'text-white', 
    shadow: 'shadow-[0_4px_20px_rgba(249,115,22,0.4)]' 
  },
  'ab-test': { 
    bg: 'bg-gradient-to-br from-[#8B5CF6] to-[#EC4899]', 
    icon: 'text-white', 
    shadow: 'shadow-[0_4px_20px_rgba(139,92,246,0.4)]' 
  },
  'pixel': { 
    bg: 'bg-gradient-to-br from-[#0081FB] to-[#0064E0]', 
    icon: 'text-white', 
    shadow: 'shadow-[0_4px_20px_rgba(0,129,251,0.4)]' 
  },
  'condition-bought': { 
    bg: 'bg-[#22C55E]', 
    icon: 'text-white', 
    shadow: 'shadow-[0_4px_20px_rgba(34,197,94,0.4)]' 
  },
  'condition-not-bought': { 
    bg: 'bg-[#EF4444]', 
    icon: 'text-white', 
    shadow: 'shadow-[0_4px_20px_rgba(239,68,68,0.4)]' 
  },
  'condition-accepted': { 
    bg: 'bg-[#10B981]', 
    icon: 'text-white', 
    shadow: 'shadow-[0_4px_20px_rgba(16,185,129,0.4)]' 
  },
  'condition-rejected': { 
    bg: 'bg-[#F43F5E]', 
    icon: 'text-white', 
    shadow: 'shadow-[0_4px_20px_rgba(244,63,94,0.4)]' 
  },
  'condition-timer': {
    bg: 'bg-[#F59E0B]', 
    icon: 'text-white', 
    shadow: 'shadow-[0_4px_20px_rgba(245,158,11,0.4)]' 
  },
  'sticky-note': { 
    bg: 'bg-[#FCD34D]', 
    icon: 'text-[#78350F]', 
    shadow: 'shadow-[0_4px_20px_rgba(252,211,77,0.4)]' 
  },
  'free-text': { 
    bg: 'bg-transparent', 
    icon: 'text-foreground', 
    shadow: '' 
  },
  'message': { 
    bg: 'bg-[#3B82F6]', 
    icon: 'text-white', 
    shadow: 'shadow-[0_4px_20px_rgba(59,130,246,0.4)]' 
  },
  'ai-tool': { 
    bg: 'bg-gradient-to-br from-[#8B5CF6] via-[#6366F1] to-[#3B82F6]', 
    icon: 'text-white', 
    shadow: 'shadow-[0_4px_20px_rgba(99,102,241,0.4)]' 
  },
};

// Predefined colors for sticky notes and text
export const noteColors = [
  { name: 'Amarelo', value: '#FCD34D', textColor: '#78350F' },
  { name: 'Verde', value: '#86EFAC', textColor: '#166534' },
  { name: 'Azul', value: '#93C5FD', textColor: '#1E40AF' },
  { name: 'Rosa', value: '#F9A8D4', textColor: '#9D174D' },
  { name: 'Roxo', value: '#C4B5FD', textColor: '#5B21B6' },
  { name: 'Laranja', value: '#FDBA74', textColor: '#9A3412' },
  { name: 'Cinza', value: '#D1D5DB', textColor: '#374151' },
];

// Text colors for free text
export const textColors = [
  { name: 'Branco', value: '#FFFFFF' },
  { name: 'Cinza Claro', value: '#A1A1AA' },
  { name: 'Amarelo', value: '#FCD34D' },
  { name: 'Verde', value: '#4ADE80' },
  { name: 'Azul', value: '#60A5FA' },
  { name: 'Rosa', value: '#F472B6' },
  { name: 'Roxo', value: '#A78BFA' },
  { name: 'Laranja', value: '#FB923C' },
  { name: 'Vermelho', value: '#F87171' },
];

// Handle style - invisible but large hit area for easy connections
const handleStyle = {
  width: 12,
  height: 12,
  background: 'transparent',
  border: 'none',
};

// Page type icon mapping for sales-page subtypes
const pageTypeIconMap: Record<string, LucideIcon | React.ComponentType<{ className?: string }>> = {
  'landing-page': LayoutTemplate,
  'presell': ScrollText,
  'quiz': QuizFunnelIcon,
  'vsl': VslIcon,
};

// Browser mockup node for pages - now with dynamic aspect ratio
function PageNode({ data, selected }: { data: FunnelNodeData; selected: boolean }) {
  // Use page subtype icon if it's a sales-page with a pageType set
  const Icon = (data.type === 'sales-page' && data.pageType && pageTypeIconMap[data.pageType]) 
    ? pageTypeIconMap[data.pageType] 
    : (iconMap[data.type] || Globe);
  const hasScreenshot = Boolean(data.screenshot);
  const aspectRatio = data.screenshotAspectRatio || (160 / 104);
  const { educationalMode } = useFunnelEducationalMode();
  
  // Calculate dimensions based on screenshot aspect ratio
  const baseWidth = (data.width as number) || 160;
  const calculatedHeight = hasScreenshot && data.screenshotAspectRatio 
    ? baseWidth / data.screenshotAspectRatio + 24 
    : (data.height as number) || 104;
  
  const width = baseWidth;
  const height = calculatedHeight;
  const contentHeight = Math.max(height - 24, 40);
  
  // Apply blur if educational mode is active OR if individual screenshot blur is enabled
  const shouldBlur = (educationalMode && hasScreenshot) || data.screenshotBlur;
  
  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden transition-all duration-200 group',
        'bg-[#15151a] border border-white/[0.06]',
        'shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.02)_inset]',
        'hover:border-white/10 hover:shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)_inset]',
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-[#08080a] border-primary/40'
      )}
      style={{ width, height }}
    >
      {/* Browser top bar */}
      <div className="h-6 bg-gradient-to-b from-[#26262c] to-[#22222a] flex items-center px-2 gap-1.5 border-b border-white/[0.04]">
        <div className="flex gap-1">
          <Circle className="w-2.5 h-2.5 fill-[#ff5f57] text-[#ff5f57]" />
          <Circle className="w-2.5 h-2.5 fill-[#ffbd2e] text-[#ffbd2e]" />
          <Circle className="w-2.5 h-2.5 fill-[#28ca41] text-[#28ca41]" />
        </div>
        <div className="flex-1 mx-2">
          <div className="h-3 bg-[#0f0f12] rounded-sm border border-white/[0.04]" />
        </div>
      </div>
      
      {/* Page content area */}
      <div 
        className="flex items-center justify-center overflow-hidden"
        style={{ height: contentHeight }}
      >
        {hasScreenshot ? (
          <img 
            src={data.screenshot} 
            alt={data.label} 
            className={cn(
              "w-full h-full object-cover transition-all duration-300",
              shouldBlur && "blur-md"
            )}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1a1a1f] to-[#252530] flex items-center justify-center">
            <Icon className="w-12 h-12 text-muted-foreground/50" />
          </div>
        )}
      </div>
      
      {/* Unified metrics pill - manual + analytics */}
      {(data.visitors || data.leads || data.sales || (data.analyticsEnabled && (data.analyticsPageviews || data.analyticsVisitors))) ? (
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1a1a1f]/95 border border-[#2a2a30] shadow-lg">
            {(data.analyticsIsLive || data.visitors) && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
            {data.analyticsEnabled && data.analyticsVisitors ? (
              <span className="text-[9px] font-medium text-emerald-400">
                {(data.analyticsVisitors || 0).toLocaleString('pt-BR')} live
              </span>
            ) : null}
            {(data.analyticsEnabled && data.analyticsVisitors && (data.analyticsPageviews || data.visitors)) ? (
              <span className="text-[9px] text-muted-foreground">·</span>
            ) : null}
            {data.analyticsEnabled && data.analyticsPageviews ? (
              <span className="text-[9px] font-medium text-blue-400">
                {(data.analyticsPageviews || 0).toLocaleString('pt-BR')} views
              </span>
            ) : data.visitors ? (
              <span className="text-[9px] font-medium text-blue-400">
                {Number(data.visitors).toLocaleString('pt-BR')} views
              </span>
            ) : null}
            {data.leads ? (
              <>
                <span className="text-[9px] text-muted-foreground">·</span>
                <span className="text-[9px] font-medium text-amber-400">
                  {Number(data.leads).toLocaleString('pt-BR')} leads
                </span>
              </>
            ) : null}
            {data.sales ? (
              <>
                <span className="text-[9px] text-muted-foreground">·</span>
                <span className="text-[9px] font-medium text-emerald-400">
                  {Number(data.sales).toLocaleString('pt-BR')} vendas
                </span>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Circular icon node for Traffic, Actions, Payments, Automation
function IconNode({ data, selected }: { data: FunnelNodeData; selected: boolean }) {
  // For ai-tool nodes, use the selected AI tool image
  const isAiTool = data.type === 'ai-tool';
  const selectedAiTool = isAiTool && data.aiTool ? aiToolOptions.find(t => t.value === data.aiTool) : null;
  const aiToolImage = selectedAiTool ? aiToolImageMap[selectedAiTool.value] : null;
  
  const Icon = iconMap[data.type] || Globe;
  const isWhatsappDown = (data.type === 'whatsapp' || data.type === 'whatsapp-message') && data.whatsappStatus === 'down';
  const colors = isAiTool && selectedAiTool
    ? { bg: '', icon: 'text-white', shadow: `shadow-[0_4px_20px_rgba(99,102,241,0.4)]` }
    : isWhatsappDown
    ? { bg: 'bg-[#EF4444]', icon: 'text-white', shadow: 'shadow-[0_4px_20px_rgba(239,68,68,0.4)]' }
    : (iconColorMap[data.type] || { bg: 'bg-muted', icon: 'text-foreground', shadow: '' });
  const hasCustomIcon = Boolean(data.customIcon);
  const isAdvantagePlus = data.type === 'fb-campaign' && data.campaignType === 'advantage_plus';
  const isFbAd = data.type === 'fb-ad';
  const hasAdMedia = isFbAd && Boolean(data.adMedia);
  const { educationalMode } = useFunnelEducationalMode();
  
  // Apply blur to images when educational mode is active
  const shouldBlurMedia = educationalMode && (hasCustomIcon || hasAdMedia);
  
  return (
    <div className="relative">
      <div
        className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 overflow-hidden',
          !hasCustomIcon && !hasAdMedia && !isAiTool && colors.bg,
          colors.shadow,
          'ring-1 ring-white/[0.06]',
          'hover:scale-[1.04]',
          selected && 'ring-2 ring-white ring-offset-2 ring-offset-[#08080a] scale-[1.04]'
        )}
        style={isAiTool && selectedAiTool ? { backgroundColor: selectedAiTool.color } : undefined}
      >
        {hasAdMedia ? (
          data.adMediaType === 'video' ? (
            <video 
              src={data.adMedia} 
              className={cn(
                "w-full h-full object-cover transition-all duration-300",
                shouldBlurMedia && "blur-md"
              )}
              muted
              loop
              playsInline
            />
          ) : (
            <img 
              src={data.adMedia} 
              alt={data.label} 
              className={cn(
                "w-full h-full object-cover transition-all duration-300",
                shouldBlurMedia && "blur-md"
              )} 
            />
          )
        ) : hasCustomIcon ? (
          <img 
            src={data.customIcon} 
            alt={data.label} 
            className={cn(
              "w-full h-full object-cover transition-all duration-300",
              shouldBlurMedia && "blur-md"
            )} 
          />
        ) : isAiTool && aiToolImage ? (
          <img 
            src={aiToolImage} 
            alt={selectedAiTool?.label || 'IA'} 
            className="w-8 h-8 object-contain"
          />
        ) : (
          <Icon className={cn('w-6 h-6', colors.icon)} />
        )}
      </div>
      
      {/* Campaign badges (Budget type, Advantage+ and Budget) */}
      {data.type === 'fb-campaign' && data.showBudgetBadge !== false && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-1">
          {/* ABO/CBO badge */}
          <div className={cn(
            'px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white shadow-lg',
            data.budgetType === 'abo' ? 'bg-blue-500/90' : 'bg-cyan-500/90'
          )}>
            {data.budgetType === 'abo' ? 'ABO' : 'CBO'}
          </div>
          {isAdvantagePlus && (
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-full p-1 shadow-lg">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          )}
          {data.budget && (
            <div className="px-1.5 py-0.5 rounded-full bg-emerald-500/90 text-[9px] font-bold text-white shadow-lg flex items-center gap-0.5">
              <span>R$</span>
              <span>{Number(data.budget).toLocaleString('pt-BR')}</span>
            </div>
          )}
        </div>
      )}
      
      {/* Ad Set badges (Segmentation type and Budget for ABO) */}
      {data.type === 'fb-adset' && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-1">
          {data.segmentationType === 'advantage' && (
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-full p-1 shadow-lg">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          )}
          {data.segmentationType === 'interest' && (
            <div className="px-1.5 py-0.5 rounded-full bg-orange-500/90 text-[9px] font-bold text-white shadow-lg flex items-center gap-0.5">
              <Target className="w-2.5 h-2.5" />
              <span>Interest</span>
            </div>
          )}
          {data.adsetBudget && (
            <div className="px-1.5 py-0.5 rounded-full bg-emerald-500/90 text-[9px] font-bold text-white shadow-lg flex items-center gap-0.5">
              <span>R$</span>
              <span>{Number(data.adsetBudget).toLocaleString('pt-BR')}</span>
            </div>
          )}
        </div>
      )}
      
      {/* WhatsApp phone badge - hidden in educational mode */}
      {(data.type === 'whatsapp' || data.type === 'whatsapp-message') && data.whatsappPhone && !educationalMode && (
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 z-10">
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full shadow-lg whitespace-nowrap",
            isWhatsappDown
              ? "bg-[#2e1a1a] border border-red-500/40"
              : "bg-[#1a2e1f] border border-[#25D366]/40"
          )}>
            <Phone className={cn("w-3 h-3", isWhatsappDown ? "text-red-400" : "text-[#25D366]")} />
            <span className={cn("text-[10px] font-semibold", isWhatsappDown ? "text-red-400" : "text-[#25D366]")}>
              {data.whatsappPhone}
            </span>
          </div>
        </div>
      )}

      {/* Unified metrics pill */}
      {(data.visitors || data.sales || (data.analyticsEnabled && (data.analyticsPageviews || data.analyticsVisitors))) ? (
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#1a1a1f]/95 border border-[#2a2a30] shadow-lg whitespace-nowrap">
            {(data.analyticsIsLive || data.visitors) && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
            {data.analyticsEnabled && data.analyticsVisitors ? (
              <span className="text-[8px] font-medium text-emerald-400">
                {(data.analyticsVisitors || 0).toLocaleString('pt-BR')} live
              </span>
            ) : null}
            {(data.analyticsEnabled && data.analyticsVisitors && (data.analyticsPageviews || data.visitors)) ? (
              <span className="text-[8px] text-muted-foreground">·</span>
            ) : null}
            {data.analyticsEnabled && data.analyticsPageviews ? (
              <span className="text-[8px] font-medium text-blue-400">
                {(data.analyticsPageviews || 0).toLocaleString('pt-BR')} views
              </span>
            ) : data.visitors ? (
              <span className="text-[8px] font-medium text-blue-400">
                {Number(data.visitors).toLocaleString('pt-BR')} views
              </span>
            ) : null}
            {data.sales ? (
              <>
                <span className="text-[8px] text-muted-foreground">·</span>
                <span className="text-[8px] font-medium text-emerald-400">
                  {Number(data.sales).toLocaleString('pt-BR')} vendas
                </span>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Diamond-shaped condition node
function ConditionNode({ data, selected }: { data: FunnelNodeData; selected: boolean }) {
  const Icon = iconMap[data.type] || Globe;
  const colors = iconColorMap[data.type] || { bg: 'bg-muted', icon: 'text-foreground', shadow: '' };
  
  return (
    <div className="relative">
      <div
        className={cn(
          'w-14 h-14 flex items-center justify-center transition-all duration-200 rotate-45',
          colors.bg,
          colors.shadow,
          'rounded-lg ring-1 ring-white/[0.08]',
          'hover:scale-[1.04]',
          selected && 'ring-2 ring-white ring-offset-2 ring-offset-[#08080a] scale-[1.04]'
        )}
      >
        <Icon className={cn('w-6 h-6 -rotate-45', colors.icon)} />
      </div>

      {/* Manual metrics + analytics badge - unified pill format */}
      {data.analyticsEnabled && (data.analyticsPageviews || data.analyticsVisitors || data.visitors || data.sales) ? (
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#1a1a1f]/95 border border-[#2a2a30] shadow-lg whitespace-nowrap">
            {(data.analyticsIsLive || data.visitors) && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
            {data.analyticsVisitors ? (
              <span className="text-[8px] font-medium text-emerald-400">
                {(data.analyticsVisitors || 0).toLocaleString('pt-BR')} live
              </span>
            ) : null}
            {(data.analyticsVisitors && (data.analyticsPageviews || data.visitors)) ? (
              <span className="text-[8px] text-muted-foreground">·</span>
            ) : null}
            {data.analyticsPageviews ? (
              <span className="text-[8px] font-medium text-blue-400">
                {(data.analyticsPageviews || 0).toLocaleString('pt-BR')} views
              </span>
            ) : data.visitors ? (
              <span className="text-[8px] font-medium text-blue-400">
                {Number(data.visitors).toLocaleString('pt-BR')} views
              </span>
            ) : null}
            {data.sales ? (
              <>
                <span className="text-[8px] text-muted-foreground">·</span>
                <span className="text-[8px] font-medium text-emerald-400">
                  {Number(data.sales).toLocaleString('pt-BR')} vendas
                </span>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
      
      {/* Timer display */}
      {data.type === 'condition-timer' && data.waitTime && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-[10px] font-medium text-amber-400 border border-amber-500/30">
            {data.waitTime} {data.waitUnit === 'days' ? 'dias' : 'horas'}
          </span>
        </div>
      )}
      {/* Spacer for timer so label doesn't overlap */}
      {data.type === 'condition-timer' && data.waitTime && (
        <div className="h-4" />
      )}
    </div>
  );
}

// Sticky note node with custom colors and text formatting
function StickyNoteNode({ data, selected }: { data: FunnelNodeData; selected: boolean }) {
  const bgColor = data.backgroundColor || '#FCD34D';
  const noteColorConfig = noteColors.find(c => c.value === bgColor) || noteColors[0];
  const textColor = noteColorConfig.textColor;
  
  const fontSize = data.fontSize === 'lg' ? 'text-sm' : data.fontSize === 'md' ? 'text-xs' : 'text-[11px]';
  const width = (data.width as number) || 160;
  const height = (data.height as number) || 96;
  
  return (
    <div
      className={cn(
        'p-3 rounded-lg transition-all duration-200',
        'shadow-[0_10px_30px_rgba(0,0,0,0.35),0_2px_6px_rgba(0,0,0,0.2)]',
        'border-none overflow-hidden',
        'hover:rotate-0',
        selected && 'ring-2 ring-white ring-offset-2 ring-offset-[#08080a]'
      )}
      style={{
        transform: 'rotate(-1.5deg)',
        backgroundColor: bgColor,
        width,
        height,
      }}
    >
      <div 
        className={cn(
          'font-medium leading-relaxed h-full overflow-hidden',
          fontSize,
          data.textBold && 'font-bold',
          data.textItalic && 'italic',
          data.textUnderline && 'underline'
        )}
        style={{ color: textColor }}
      >
        {data.content || data.label || 'Nota...'}
      </div>
    </div>
  );
}

// Free text nodes rendered inside FunnelNode use the imported FreeTextNodeComponent directly

function FunnelNode({ data, selected, id }: NodeProps) {
  const nodeData = data as FunnelNodeData;
  const category = categoryMap[nodeData.type];
  const isPage = category === 'page';
  const isCondition = category === 'condition';
  const isStickyNote = nodeData.type === 'sticky-note';
  const isFreeText = nodeData.type === 'free-text';
  const isLineAnchor = nodeData.type === 'line-anchor';
  const { deleteElements, setNodes } = useReactFlow();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  // For free text and line anchors, use minimal wrapper without handles visible by default
  const showHandles = !isFreeText && !isLineAnchor;
  
  // Resizable for pages and sticky notes
  const isResizable = isPage || isStickyNote;

  // Line anchor - render as a simple draggable point WITHOUT connection capability
  if (isLineAnchor) {
    return (
      <>
        {/* Hidden handles only for internal edge connection - NOT user-connectable */}
        <Handle
          type="source"
          position={Position.Top}
          id="top-source"
          isConnectable={false}
          className="!w-0 !h-0 !min-w-0 !min-h-0 !opacity-0 !pointer-events-none"
        />
        <Handle
          type="target"
          position={Position.Top}
          id="top-target"
          isConnectable={false}
          className="!w-0 !h-0 !min-w-0 !min-h-0 !opacity-0 !pointer-events-none"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom-source"
          isConnectable={false}
          className="!w-0 !h-0 !min-w-0 !min-h-0 !opacity-0 !pointer-events-none"
        />
        <Handle
          type="target"
          position={Position.Bottom}
          id="bottom-target"
          isConnectable={false}
          className="!w-0 !h-0 !min-w-0 !min-h-0 !opacity-0 !pointer-events-none"
        />
        <Handle
          type="source"
          position={Position.Left}
          id="left-source"
          isConnectable={false}
          className="!w-0 !h-0 !min-w-0 !min-h-0 !opacity-0 !pointer-events-none"
        />
        <Handle
          type="target"
          position={Position.Left}
          id="left-target"
          isConnectable={false}
          className="!w-0 !h-0 !min-w-0 !min-h-0 !opacity-0 !pointer-events-none"
        />
        <Handle
          type="source"
          position={Position.Right}
          id="right-source"
          isConnectable={false}
          className="!w-0 !h-0 !min-w-0 !min-h-0 !opacity-0 !pointer-events-none"
        />
        <Handle
          type="target"
          position={Position.Right}
          id="right-target"
          isConnectable={false}
          className="!w-0 !h-0 !min-w-0 !min-h-0 !opacity-0 !pointer-events-none"
        />
        <div
          className={cn(
            'w-4 h-4 rounded-full bg-muted-foreground/60 hover:bg-primary cursor-move transition-all border-2 border-background',
            selected && 'ring-2 ring-primary ring-offset-1 ring-offset-[#0f0f12] bg-primary'
          )}
        />
      </>
    );
  }

  return (
    <div className="relative group">
      {/* Node Resizer - for pages and sticky notes */}
      {isResizable && (
        <NodeResizer
          minWidth={isPage ? 120 : 100}
          minHeight={isPage ? 100 : 60}
          maxWidth={400}
          maxHeight={400}
          isVisible={selected}
          lineClassName="!border-primary/50"
          handleClassName="!w-2 !h-2 !bg-primary !border-none !rounded-sm"
          onResize={(_, params) => {
            setNodes((nodes) =>
              nodes.map((n) => {
                if (n.id === id) {
                  return {
                    ...n,
                    data: { ...n.data, width: params.width, height: params.height },
                  };
                }
                return n;
              })
            );
          }}
        />
      )}
      
      {/* Action buttons - appear when selected */}
      {selected && !isFreeText && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="absolute -top-2 -left-2 z-10 w-5 h-5 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center shadow-lg transition-colors"
                title="Trocar tipo do bloco"
              >
                <RefreshCcw className="w-3 h-3 text-white" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-[#0f0f12] border-[#2a2a30]" align="start" side="right">
              {Object.entries(funnelElements).map(([categoryKey, items]) => {
                 const catNames: Record<string, string> = {
                    traffic: "Tráfego",
                    facebookSubcategories: "Anúncios Facebook",
                    pages: "Páginas",
                    payment: "Pagamentos",
                    automation: "Automação",
                    actions: "Ações",
                    conditions: "Condições",
                    notes: "Notas",
                    ai: "IA",
                    connectors: "Conectores"
                 };
                 const title = catNames[categoryKey] || categoryKey;
                 return (
                   <DropdownMenuSub key={categoryKey}>
                     <DropdownMenuSubTrigger className="text-xs focus:bg-[#2a2a30] data-[state=open]:bg-[#2a2a30]">{title}</DropdownMenuSubTrigger>
                     <DropdownMenuPortal>
                       <DropdownMenuSubContent className="bg-[#1a1a1f] border-[#2a2a30]">
                         {items.map(item => (
                           <DropdownMenuItem 
                             key={item.type}
                             className="text-xs cursor-pointer focus:bg-[#2a2a30]"
                             onClick={() => {
                               setNodes((nds) => nds.map((n) => {
                                 if (n.id === id) {
                                   return { ...n, data: { ...n.data, type: item.type, label: item.label } };
                                 }
                                 return n;
                               }));
                             }}
                           >
                             <item.icon className="w-4 h-4 mr-2" />
                             {item.label}
                           </DropdownMenuItem>
                         ))}
                       </DropdownMenuSubContent>
                     </DropdownMenuPortal>
                   </DropdownMenuSub>
                 )
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={handleDelete}
            className="absolute -top-2 -right-2 z-10 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-colors"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </>
      )}
      {/* 4 visible handles at edges - both source and target for flexibility */}
      {showHandles && (
        <>
          <Handle
            type="target"
            position={Position.Top}
            id="top-target"
            className="!w-3 !h-3 !bg-primary/80 !border-2 !border-background !opacity-0 group-hover:!opacity-100 transition-opacity !-top-1.5"
          />
          <Handle
            type="source"
            position={Position.Top}
            id="top-source"
            className="!w-3 !h-3 !bg-primary/80 !border-2 !border-background !opacity-0 group-hover:!opacity-100 transition-opacity !-top-1.5"
          />
          <Handle
            type="target"
            position={Position.Left}
            id="left-target"
            className="!w-3 !h-3 !bg-primary/80 !border-2 !border-background !opacity-0 group-hover:!opacity-100 transition-opacity !-left-1.5"
          />
          <Handle
            type="source"
            position={Position.Left}
            id="left-source"
            className="!w-3 !h-3 !bg-primary/80 !border-2 !border-background !opacity-0 group-hover:!opacity-100 transition-opacity !-left-1.5"
          />
          <Handle
            type="target"
            position={Position.Bottom}
            id="bottom-target"
            className="!w-3 !h-3 !bg-primary/80 !border-2 !border-background !opacity-0 group-hover:!opacity-100 transition-opacity !-bottom-1.5"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="bottom-source"
            className="!w-3 !h-3 !bg-primary/80 !border-2 !border-background !opacity-0 group-hover:!opacity-100 transition-opacity !-bottom-1.5"
          />
          <Handle
            type="target"
            position={Position.Right}
            id="right-target"
            className="!w-3 !h-3 !bg-primary/80 !border-2 !border-background !opacity-0 group-hover:!opacity-100 transition-opacity !-right-1.5"
          />
          <Handle
            type="source"
            position={Position.Right}
            id="right-source"
            className="!w-3 !h-3 !bg-primary/80 !border-2 !border-background !opacity-0 group-hover:!opacity-100 transition-opacity !-right-1.5"
          />
        </>
      )}
      
      <div className="flex flex-col items-center gap-2">
        {isFreeText ? (
          <FreeTextNodeComponent data={nodeData} selected={selected} id={id} />
        ) : isStickyNote ? (
          <StickyNoteNode data={nodeData} selected={selected} />
        ) : isCondition ? (
          <ConditionNode data={nodeData} selected={selected} />
        ) : isPage ? (
          <PageNode data={nodeData} selected={selected} />
        ) : (
          <IconNode data={nodeData} selected={selected} />
        )}
        
        {/* Label below (not for sticky notes or free text) */}
        {!isStickyNote && !isFreeText && (
          <span className="text-xs font-medium text-center text-muted-foreground max-w-[120px] truncate">
            {nodeData.label}
          </span>
        )}
      </div>
    </div>
  );
}

// Canvas Image Node Component
function ImageNode({ data, selected, id }: NodeProps) {
  const { deleteElements } = useReactFlow();
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  const nodeData = data as any;
  const imageUrl = nodeData.imageUrl;
  
  return (
    <div className="relative group w-full h-full">
      <NodeResizer
        minWidth={50}
        minHeight={50}
        isVisible={selected}
        lineClassName="border-primary"
        handleClassName="h-2.5 w-2.5 bg-white border-2 border-primary rounded-sm"
      />
      
      {/* Delete button - appears when selected */}
      {selected && (
        <button
          onClick={handleDelete}
          className="absolute -top-3 -right-3 z-10 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-colors"
        >
          <X className="w-3.5 h-3.5 text-white" />
        </button>
      )}

      <div 
        className={cn(
          "relative overflow-hidden rounded-md flex items-center justify-center w-full h-full",
          !imageUrl && "bg-muted p-4 min-w-[150px] min-h-[100px]",
          selected && "ring-2 ring-primary"
        )}
      >
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt="Canvas Element" 
            className="w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
        ) : (
          <ImageIcon className="w-8 h-8 text-muted-foreground opacity-50" />
        )}
      </div>
    </div>
  );
}

export const nodeTypes = {
  funnel: memo(FunnelNode),
  'free-text': memo(FreeTextNodeComponent),
  'funnel-image': memo(ImageNode),
  'message': MessageNode,
};

// Element categories for sidebar
export const funnelElements = {
  traffic: [
    { type: 'facebook-ads', label: 'Facebook Ads', icon: Facebook, hasSubcategories: true },
    { type: 'google-ads', label: 'Google Ads', icon: Globe },
    { type: 'instagram', label: 'Instagram', icon: Instagram },
    { type: 'youtube', label: 'YouTube', icon: Youtube },
    { type: 'tiktok-ads', label: 'TikTok Ads', icon: TikTokIcon },
    { type: 'lead-capture', label: 'Lead (Captura)', icon: Users },
    { type: 'pixel', label: 'Pixel', icon: Crosshair },
    { type: 'organic-traffic', label: 'Tráfego Orgânico', icon: Search },
    { type: 'affiliates', label: 'Afiliados', icon: Handshake },
  ],
  facebookSubcategories: [
    { type: 'fb-campaign', label: 'Campanha', icon: Megaphone },
    { type: 'fb-adset', label: 'Conjunto de Anúncio', icon: Layers },
    { type: 'fb-ad', label: 'Anúncio', icon: ImageIcon },
  ],
  pages: [
    { type: 'optin', label: 'Opt-in', icon: FileText },
    { type: 'sales-page', label: 'Página de Vendas', icon: ShoppingCart },
    { type: 'checkout', label: 'Checkout', icon: CreditCard },
    { type: 'cart', label: 'Carrinho', icon: ShoppingBasket },
    { type: 'upsell', label: 'Upsell', icon: ArrowUp },
    { type: 'downsell', label: 'Downsell', icon: ArrowDown },
    { type: 'orderbump', label: 'Order Bump', icon: Package },
    { type: 'thankyou', label: 'Thank You', icon: CheckCircle },
    { type: 'link-bio', label: 'Link na Bio', icon: Link2 },
    { type: 'app', label: 'App', icon: AppIcon },
    { type: 'members-area', label: 'Área de Membros', icon: GraduationCap },
    { type: 'webinar', label: 'Webinário', icon: Tv },
    { type: 'quiz', label: 'Quiz', icon: QuizFunnelIcon },
    { type: 'vsl', label: 'VSL', icon: VslIcon },
    { type: 'presell', label: 'Presell', icon: ScrollText },
    { type: 'form', label: 'Formulário', icon: ClipboardList },
  ],
  payment: [
    { type: 'credit-card', label: 'Cartão de Crédito', icon: CreditCard },
    { type: 'boleto', label: 'Boleto', icon: Wallet },
    { type: 'pix', label: 'PIX', icon: PixIcon },
    { type: 'recurrence', label: 'Recorrência', icon: RefreshCcw },
  ],
  automation: [
    { type: 'email', label: 'E-mail', icon: Mail },
    { type: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { type: 'whatsapp-message', label: 'Mensagem WhatsApp', icon: Send },
    { type: 'sms', label: 'SMS', icon: Smartphone },
    { type: 'webhook', label: 'Webhook', icon: Webhook },
    { type: 'push-notification', label: 'Push Notification', icon: Bell },
  ],
  actions: [
    { type: 'cta', label: 'CTA', icon: MousePointer },
    { type: 'ab-test', label: 'Teste A/B', icon: GitBranch },
    { type: 'message', label: 'Mensagem', icon: MessageSquare },
  ],
  conditions: [
    { type: 'condition-bought', label: 'Comprou', icon: CheckCheck },
    { type: 'condition-not-bought', label: 'Não Comprou', icon: XCircle },
    { type: 'condition-timer', label: 'Aguardar Tempo', icon: Clock },
    { type: 'condition-accepted', label: 'Aceitou', icon: ThumbsUp },
    { type: 'condition-rejected', label: 'Rejeitou', icon: ThumbsDown },
  ],
  notes: [
    { type: 'sticky-note', label: 'Nota Livre', icon: StickyNote },
    { type: 'free-text', label: 'Texto Livre', icon: FileText },
  ],
  ai: [
    { type: 'ai-tool', label: 'IA', icon: Sparkles },
  ],
  connectors: [
    { type: 'standalone-line', label: 'Linha Avulsa', icon: ArrowDown },
  ],
};

// Tracking events dropdown options
export const trackingEvents = [
  { value: 'viewed', label: 'Visualizou' },
  { value: 'checkout_started', label: 'Entrou no Checkout' },
  { value: 'purchased', label: 'Comprou' },
  { value: 'refused', label: 'Recusou' },
  { value: 'lead', label: 'Lead' },
  { value: 'subscriber', label: 'Assinante' },
  { value: 'canceled', label: 'Cancelou' },
];

// Placement options for ad sets
export const placementOptions = [
  { value: 'feed', label: 'Feed' },
  { value: 'stories', label: 'Stories' },
  { value: 'reels', label: 'Reels' },
  { value: 'in_stream', label: 'Vídeos In-Stream' },
  { value: 'search', label: 'Busca' },
  { value: 'messenger', label: 'Messenger' },
  { value: 'audience_network', label: 'Audience Network' },
];

// Region options (replacing countries)
export const regionOptions = [
  { value: 'native', label: 'Nativo' },
  { value: 'latam', label: 'Latam' },
  { value: 'global', label: 'Global' },
  { value: 'eu', label: 'E.U' },
  { value: 'na', label: 'N.A' },
];

// Language options
export const languageOptions = [
  { value: 'pt', label: 'Português' },
  { value: 'en', label: 'Inglês' },
  { value: 'es', label: 'Espanhol' },
  { value: 'fr', label: 'Francês' },
  { value: 'de', label: 'Alemão' },
  { value: 'it', label: 'Italiano' },
];
