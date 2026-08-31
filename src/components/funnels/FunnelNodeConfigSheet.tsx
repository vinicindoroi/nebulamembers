import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Node, useReactFlow } from '@xyflow/react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Trash2, Link, Target, BarChart3, Zap, Clock, StickyNote, Bold, Italic, Underline, 
  Palette, Type, Image, Upload, X, DollarSign, Users, MapPin, Globe2, Layers, 
  Video, ImageIcon, Sparkles, Mail, MessageCircle, FileText, Phone
} from 'lucide-react';
import { 
  FunnelNodeData, trackingEvents, categoryMap, noteColors, textColors, 
  placementOptions, regionOptions, languageOptions, aiToolOptions, aiToolImageMap, aiToolColorMap
} from './FunnelNodeTypes';
import { cn } from '@/lib/utils';
import { useFunnelAnalytics, QuizStepStat } from '@/hooks/useFunnelAnalytics';

interface FunnelNodeConfigSheetProps {
  node: Node | null;
  onClose: () => void;
  funnelId?: string;
  liveMode?: boolean;
  analyticsTimeRange?: number;
}

export function FunnelNodeConfigSheet({ node, onClose, funnelId, liveMode, analyticsTimeRange = 24 }: FunnelNodeConfigSheetProps) {
  const { setNodes, deleteElements } = useReactFlow();
  const [label, setLabel] = useState('');
  const [visitors, setVisitors] = useState('');
  const [leads, setLeads] = useState('');
  const [sales, setSales] = useState('');
  const [url, setUrl] = useState('');
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [conversionGoal, setConversionGoal] = useState('');
  const [trackingEvent, setTrackingEvent] = useState('');
  const [waitTime, setWaitTime] = useState('');
  const [waitUnit, setWaitUnit] = useState<'hours' | 'days'>('hours');
  const [content, setContent] = useState('');
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);
  const [textUnderline, setTextUnderline] = useState(false);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [backgroundColor, setBackgroundColor] = useState('#FCD34D');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('sm');
  const [screenshot, setScreenshot] = useState<string | undefined>(undefined);
  const [screenshotAspectRatio, setScreenshotAspectRatio] = useState<number | undefined>(undefined);
  const [screenshotBlur, setScreenshotBlur] = useState(false);
  const [customIcon, setCustomIcon] = useState<string | undefined>(undefined);
  
  // Campaign settings
  const [budgetType, setBudgetType] = useState<'cbo' | 'abo'>('cbo');
  const [campaignType, setCampaignType] = useState<'normal' | 'advantage_plus'>('normal');
  const [budget, setBudget] = useState('');
  const [showBudgetBadge, setShowBudgetBadge] = useState(true);
  
  // Ad Set settings
  const [segmentationType, setSegmentationType] = useState<'open' | 'interest' | 'advantage'>('open');
  const [adsetBudget, setAdsetBudget] = useState('');
  const [ageMin, setAgeMin] = useState('18');
  const [ageMax, setAgeMax] = useState('65');
  const [gender, setGender] = useState<'all' | 'male' | 'female'>('all');
  const [regions, setRegions] = useState<string[]>(['native']);
  const [languages, setLanguages] = useState<string[]>(['pt']);
  const [placements, setPlacements] = useState<string[]>(['feed', 'stories', 'reels']);
  const [interests, setInterests] = useState('');
  const [pixelId, setPixelId] = useState('');
  // Pixel block settings
  const [pixelName, setPixelName] = useState('');
  const [pixelAccessToken, setPixelAccessToken] = useState('');
  // Ad settings
  const [driveLink, setDriveLink] = useState('');
  const [adMedia, setAdMedia] = useState<string | undefined>(undefined);
  const [adMediaType, setAdMediaType] = useState<'image' | 'video'>('image');
  const [adPrimaryText, setAdPrimaryText] = useState('');
  const [adSecondaryText, setAdSecondaryText] = useState('');
  const [adCaption, setAdCaption] = useState('');
  const [adCopy, setAdCopy] = useState('');
  
  // Email content
  const [emailContent, setEmailContent] = useState('');
  
  // WhatsApp message
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [whatsappStatus, setWhatsappStatus] = useState<'active' | 'down'>('active');
  
  // Page notes
  const [pageNotes, setPageNotes] = useState('');
  // Page type (for sales-page)
  const [pageType, setPageType] = useState<string>('');
  // AI tool (for ai-tool nodes)
  const [aiTool, setAiTool] = useState<string>('');
  
  const [quizStepStats, setQuizStepStats] = useState<QuizStepStat[]>([]);
  const [quizStepsLoading, setQuizStepsLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const adMediaInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Analytics for quiz steps and metrics
  const { getQuizStepStats, getNodeStats } = useFunnelAnalytics({
    funnelId: funnelId || '',
    enabled: !!funnelId && !!liveMode,
    timeRangeHours: analyticsTimeRange,
  });

  const nodeData = node?.data as FunnelNodeData | undefined;
  const nodeType = nodeData?.type || '';
  const category = categoryMap[nodeType];
  const isTimer = nodeType === 'condition-timer';
  const isStickyNote = nodeType === 'sticky-note';
  const isFreeText = nodeType === 'free-text';
  const isSalesPage = nodeType === 'sales-page';
  const isAiTool = nodeType === 'ai-tool';
  const isPage = category === 'page';
  const isTraffic = category === 'traffic';
  const isPayment = category === 'payment';
  const isAutomation = category === 'automation';
  const isAction = category === 'action';
  const isCondition = category === 'condition';
  const isFbCampaign = category === 'fb-campaign';
  const isFbAdset = category === 'fb-adset';
  const isFbAd = category === 'fb-ad';
  const isEmail = nodeType === 'email';
  const isWhatsappMessage = nodeType === 'whatsapp-message';
  const isWhatsappAny = nodeType === 'whatsapp' || nodeType === 'whatsapp-message';
  const isPixelBlock = nodeType === 'pixel';
  const showTextFormatting = isStickyNote || isFreeText;
  
  // Show tracking event for pages and payments
  const showTrackingEvent = isPage || isPayment;
  // Show metrics for all node types except notes and free text
  const showMetrics = !isStickyNote && !isFreeText && nodeType !== 'standalone-line' && nodeType !== 'line-anchor' && nodeType !== 'message';
  // Show URL/UTM only for pages
  const showTracking = isPage;
  // Show custom icon option for traffic, actions, payments, automation, fb elements
  const showCustomIcon = isTraffic || isAction || isPayment || isAutomation || isFbCampaign || isFbAdset || isFbAd;

  useEffect(() => {
    if (node) {
      const data = node.data as FunnelNodeData;
      setLabel(data.label || '');
      setVisitors(data.visitors?.toString() || '');
      setLeads(data.leads?.toString() || '');
      setSales(data.sales?.toString() || '');
      setUrl(data.url || '');
      setUtmSource(data.utmSource || '');
      setUtmMedium(data.utmMedium || '');
      setUtmCampaign(data.utmCampaign || '');
      setConversionGoal(data.conversionGoal?.toString() || '');
      setTrackingEvent(data.trackingEvent || '');
      setWaitTime(data.waitTime?.toString() || '');
      setWaitUnit(data.waitUnit || 'hours');
      setContent(data.content || '');
      setTextBold(data.textBold || false);
      setTextItalic(data.textItalic || false);
      setTextUnderline(data.textUnderline || false);
      setTextColor(data.textColor || '#FFFFFF');
      setBackgroundColor(data.backgroundColor || '#FCD34D');
      setFontSize(data.fontSize || 'sm');
      setScreenshot(data.screenshot as string | undefined);
      setScreenshotAspectRatio(data.screenshotAspectRatio);
      setScreenshotBlur(data.screenshotBlur || false);
      setCustomIcon(data.customIcon as string | undefined);
      // Campaign
      setBudgetType(data.budgetType || 'cbo');
      setCampaignType(data.campaignType || 'normal');
      setBudget(data.budget?.toString() || '');
      setShowBudgetBadge(data.showBudgetBadge !== false);
      // Ad Set
      setSegmentationType(data.segmentationType || 'open');
      setAdsetBudget(data.adsetBudget?.toString() || '');
      setAgeMin(data.ageMin?.toString() || '18');
      setAgeMax(data.ageMax?.toString() || '65');
      setGender(data.gender || 'all');
      setRegions((data.regions as string[]) || ['native']);
      setLanguages((data.languages as string[]) || ['pt']);
      setPlacements((data.placements as string[]) || ['feed', 'stories', 'reels']);
      setInterests(data.interests || '');
      setPixelId(data.pixelId || '');
      setPixelName(data.pixelName || '');
      setPixelAccessToken(data.pixelAccessToken || '');
      // Ad
      setDriveLink(data.driveLink || '');
      setAdMedia(data.adMedia as string | undefined);
      setAdMediaType(data.adMediaType || 'image');
      setAdPrimaryText(data.adPrimaryText || '');
      setAdSecondaryText(data.adSecondaryText || '');
      setAdCaption(data.adCaption || '');
      setAdCopy(data.adCopy || '');
      // Email
      setEmailContent(data.emailContent || '');
      // WhatsApp
      setWhatsappMessage(data.whatsappMessage || '');
      setWhatsappPhone(data.whatsappPhone || '');
      setWhatsappStatus(data.whatsappStatus || 'active');
      // Page notes
      setPageNotes(data.pageNotes || '');
      // Page type
      setPageType(data.pageType || '');
      // AI tool
      setAiTool(data.aiTool || '');
    }
  }, [node]);

  // Auto-save function
  const autoSave = useCallback(() => {
    if (!node) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      setNodes((nodes) =>
        nodes.map((n) => {
          if (n.id === node.id) {
            return {
              ...n,
              data: {
                ...n.data,
                label,
                visitors: visitors ? parseInt(visitors) : undefined,
                leads: leads ? parseInt(leads) : undefined,
                sales: sales ? parseInt(sales) : undefined,
                url: url || undefined,
                utmSource: utmSource || undefined,
                utmMedium: utmMedium || undefined,
                utmCampaign: utmCampaign || undefined,
                conversionGoal: conversionGoal ? parseInt(conversionGoal) : undefined,
                trackingEvent: trackingEvent || undefined,
                waitTime: waitTime ? parseInt(waitTime) : undefined,
                waitUnit: waitUnit,
                content: content || undefined,
                textBold,
                textItalic,
                textUnderline,
                textColor,
                backgroundColor,
                fontSize,
                screenshot,
                screenshotAspectRatio,
                screenshotBlur,
                customIcon,
                // Campaign
                budgetType,
                campaignType,
                budget: budget ? parseFloat(budget) : undefined,
                showBudgetBadge,
                // Ad Set
                segmentationType,
                adsetBudget: adsetBudget ? parseFloat(adsetBudget) : undefined,
                ageMin: ageMin ? parseInt(ageMin) : undefined,
                ageMax: ageMax ? parseInt(ageMax) : undefined,
                gender,
                regions,
                languages,
                placements,
                interests: interests || undefined,
                pixelId: pixelId || undefined,
                pixelName: pixelName || undefined,
                pixelAccessToken: pixelAccessToken || undefined,
                // Ad
                driveLink: driveLink || undefined,
                adMedia,
                adMediaType,
                adPrimaryText: adPrimaryText || undefined,
                adSecondaryText: adSecondaryText || undefined,
                adCaption: adCaption || undefined,
                adCopy: adCopy || undefined,
                // Email
                emailContent: emailContent || undefined,
                // WhatsApp
                whatsappMessage: whatsappMessage || undefined,
                whatsappPhone: whatsappPhone || undefined,
                whatsappStatus,
                // Page notes
                pageNotes: pageNotes || undefined,
                // Page type
                pageType: pageType || undefined,
                // AI tool
                aiTool: aiTool || undefined,
              },
            };
          }
          return n;
        })
      );
    }, 300);
  }, [node, label, visitors, leads, sales, url, utmSource, utmMedium, utmCampaign, conversionGoal, 
      trackingEvent, waitTime, waitUnit, content, textBold, textItalic, textUnderline, textColor, 
      backgroundColor, fontSize, screenshot, screenshotAspectRatio, screenshotBlur, customIcon, budgetType, campaignType, 
      budget, showBudgetBadge, segmentationType, adsetBudget, ageMin, ageMax, gender, regions, languages, placements, 
      interests, pixelId, pixelName, pixelAccessToken, driveLink, adMedia, adMediaType, adPrimaryText, adSecondaryText, adCaption, adCopy,
      emailContent, whatsappMessage, whatsappPhone, whatsappStatus, pageNotes, pageType, aiTool, setNodes]);

  // Trigger auto-save on any change
  useEffect(() => {
    if (node) {
      autoSave();
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [label, visitors, leads, sales, url, utmSource, utmMedium, utmCampaign, conversionGoal, 
      trackingEvent, waitTime, waitUnit, content, textBold, textItalic, textUnderline, textColor, 
      backgroundColor, fontSize, screenshot, screenshotAspectRatio, screenshotBlur, customIcon, budgetType, campaignType, 
      budget, showBudgetBadge, segmentationType, adsetBudget, ageMin, ageMax, gender, regions, languages, placements, 
      interests, pixelId, pixelName, pixelAccessToken, driveLink, adMedia, adMediaType, adPrimaryText, adSecondaryText, adCaption, adCopy,
      emailContent, whatsappMessage, whatsappPhone, whatsappStatus, pageNotes, pageType, aiTool, autoSave, node]);
  // Fetch quiz step stats when node is quiz type
  useEffect(() => {
    if (node && pageType === 'quiz' && funnelId && liveMode) {
      setQuizStepsLoading(true);
      getQuizStepStats(node.id).then((data) => {
        setQuizStepStats(data);
        setQuizStepsLoading(false);
      });
    } else {
      setQuizStepStats([]);
    }
  }, [node?.id, pageType, funnelId, liveMode, analyticsTimeRange, getQuizStepStats]);


  const handleDelete = () => {
    if (!node) return;
    deleteElements({ nodes: [{ id: node.id }] });
    onClose();
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      
      // Get image dimensions for aspect ratio
      const img = new window.Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        setScreenshotAspectRatio(aspectRatio);
        setScreenshot(base64);
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  };

  const removeScreenshot = () => {
    setScreenshot(undefined);
    setScreenshotAspectRatio(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCustomIcon(base64);
    };
    reader.readAsDataURL(file);
  };

  const removeCustomIcon = () => {
    setCustomIcon(undefined);
    if (iconInputRef.current) {
      iconInputRef.current.value = '';
    }
  };

  const handleAdMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    
    if (!isVideo && !isImage) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAdMedia(base64);
      setAdMediaType(isVideo ? 'video' : 'image');
    };
    reader.readAsDataURL(file);
  };

  const removeAdMedia = () => {
    setAdMedia(undefined);
    if (adMediaInputRef.current) {
      adMediaInputRef.current.value = '';
    }
  };

  const toggleRegion = (regionValue: string) => {
    setRegions(prev => 
      prev.includes(regionValue) 
        ? prev.filter(r => r !== regionValue)
        : [...prev, regionValue]
    );
  };

  const toggleLanguage = (langValue: string) => {
    setLanguages(prev => 
      prev.includes(langValue) 
        ? prev.filter(l => l !== langValue)
        : [...prev, langValue]
    );
  };

  const togglePlacement = (placementValue: string) => {
    setPlacements(prev => 
      prev.includes(placementValue) 
        ? prev.filter(p => p !== placementValue)
        : [...prev, placementValue]
    );
  };

  return (
    <Sheet open={!!node} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-96 bg-[#0f0f12] border-[#2a2a30] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-foreground">Configurar Elemento</SheetTitle>
          <SheetDescription className="text-muted-foreground">
            As alterações são salvas automaticamente
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Target className="w-4 h-4" />
              Informações Básicas
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="node-label" className="text-xs">Nome do Elemento</Label>
                <Input
                  id="node-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Nome do elemento"
                  className="bg-[#1a1a1f] border-[#2a2a30]"
                />
          {/* Page Type - for sales-page only */}
          {isSalesPage && (
            <>
              <Separator className="bg-[#2a2a30]" />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Layers className="w-4 h-4" />
                  Tipo de Página
                </div>
                <div className="space-y-3">
                  <Select value={pageType || 'none'} onValueChange={(v) => setPageType(v === 'none' ? '' : v)}>
                    <SelectTrigger className="bg-[#1a1a1f] border-[#2a2a30]">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1f] border-[#2a2a30]">
                      <SelectItem value="none">Padrão (Página de Vendas)</SelectItem>
                      <SelectItem value="landing-page">Landing Page</SelectItem>
                      <SelectItem value="presell">Presell</SelectItem>
                      <SelectItem value="quiz">Quiz</SelectItem>
                      <SelectItem value="vsl">VSL</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    O tipo altera o ícone principal do bloco
                  </p>
                </div>
              </div>
            </>
          )}

          {/* AI Tool Selector - for ai-tool nodes only */}
          {isAiTool && (
            <>
              <Separator className="bg-[#2a2a30]" />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Sparkles className="w-4 h-4" />
                  Ferramenta de IA
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {aiToolOptions.map((tool) => {
                    return (
                      <button
                        key={tool.value}
                        onClick={() => setAiTool(tool.value)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 p-2.5 rounded-lg border transition-all',
                          aiTool === tool.value
                            ? 'border-primary bg-primary/10 ring-1 ring-primary'
                            : 'border-[#2a2a30] hover:border-[#3a3a40] bg-[#1a1a1f]/50'
                        )}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden"
                          style={{ backgroundColor: tool.color }}
                        >
                          <img src={tool.image} alt={tool.label} className="w-5 h-5 object-contain" />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{tool.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {isSalesPage && pageType === 'quiz' && (
            <>
              <Separator className="bg-[#2a2a30]" />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <BarChart3 className="w-4 h-4" />
                  Etapas do Quiz
                  {liveMode && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                      Live
                    </span>
                  )}
                </div>

                {!liveMode ? (
                  <p className="text-xs text-muted-foreground">
                    Ative o <strong>Live Mode</strong> no canvas para visualizar as etapas do quiz em tempo real.
                  </p>
                ) : quizStepsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 bg-[#2a2a30] rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : quizStepStats.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhum dado de quiz recebido ainda. Use o comando <code className="text-[10px] bg-[#2a2a30] px-1 py-0.5 rounded">_ft.push(['quiz_step', ...])</code> nas suas páginas.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {quizStepStats.map((step, idx) => {
                      const maxCount = Math.max(...quizStepStats.map(s => s.count));
                      const percentage = maxCount > 0 ? (step.count / maxCount) * 100 : 0;
                      const dropoff = idx > 0 
                        ? Math.round(((quizStepStats[idx - 1].count - step.count) / quizStepStats[idx - 1].count) * 100)
                        : 0;

                      return (
                        <div key={step.step} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-foreground">
                              Etapa {step.step}
                              {step.question && (
                                <span className="ml-1 text-muted-foreground font-normal">
                                  — {step.question.length > 25 ? step.question.slice(0, 25) + '…' : step.question}
                                </span>
                              )}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{step.unique_visitors} <Users className="w-3 h-3 inline" /></span>
                              {idx > 0 && dropoff > 0 && (
                                <span className="text-red-400 text-[10px]">-{dropoff}%</span>
                              )}
                            </div>
                          </div>
                          <div className="h-1.5 bg-[#2a2a30] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          {Object.keys(step.answers).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Object.entries(step.answers)
                                .sort(([, a], [, b]) => b - a)
                                .slice(0, 4)
                                .map(([answer, count]) => (
                                  <span
                                    key={answer}
                                    className="text-[9px] px-1.5 py-0.5 rounded bg-[#2a2a30] text-muted-foreground"
                                  >
                                    {answer} ({count})
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
          </div>
            </div>
          </div>

          {/* Custom Icon Upload - for traffic, actions, payments, automation */}
          {showCustomIcon && (
            <>
              <Separator className="bg-[#2a2a30]" />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <ImageIcon className="w-4 h-4" />
                  Ícone Personalizado
                </div>
                <div className="space-y-3">
                  {customIcon ? (
                    <div className="relative w-14 h-14 rounded-full overflow-hidden border border-[#2a2a30]">
                      <img 
                        src={customIcon} 
                        alt="Custom icon" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={removeCustomIcon}
                        className="absolute top-0 right-0 w-4 h-4 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
                      >
                        <X className="w-2 h-2 text-white" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => iconInputRef.current?.click()}
                      className="w-14 h-14 rounded-full border-2 border-dashed border-[#2a2a30] hover:border-primary/50 flex items-center justify-center transition-colors"
                    >
                      <Upload className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    Tamanho recomendado: 56x56 pixels
                  </p>
                  <input
                    ref={iconInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleIconUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </>
          )}

          {/* Screenshot Upload - for pages only */}
          {isPage && (
            <>
              <Separator className="bg-[#2a2a30]" />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Image className="w-4 h-4" />
                  Screenshot da Página
                </div>
                <div className="space-y-3">
                  {screenshot ? (
                    <div className="relative rounded-lg overflow-hidden border border-[#2a2a30]">
                      <img 
                        src={screenshot} 
                        alt="Screenshot" 
                        className="w-full h-32 object-cover"
                      />
                      <button
                        onClick={removeScreenshot}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-24 rounded-lg border-2 border-dashed border-[#2a2a30] hover:border-primary/50 flex flex-col items-center justify-center gap-2 transition-colors"
                    >
                      <Upload className="w-5 h-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Clique para adicionar</span>
                    </button>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    O bloco ajustará a proporção automaticamente
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotUpload}
                    className="hidden"
                  />
                  
                  {/* Blur option - only show when screenshot exists */}
                  {screenshot && (
                    <div className="flex items-center gap-2 pt-2">
                      <Checkbox
                        id="screenshot-blur"
                        checked={screenshotBlur}
                        onCheckedChange={(checked) => setScreenshotBlur(checked === true)}
                      />
                      <Label htmlFor="screenshot-blur" className="text-xs cursor-pointer">
                        Ativar borrão (proteger conteúdo)
                      </Label>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Page Notes - for pages only */}
          {isPage && (
            <>
              <Separator className="bg-[#2a2a30]" />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <StickyNote className="w-4 h-4" />
                  Anotações
                </div>
                <div className="space-y-3">
                  <Textarea
                    value={pageNotes}
                    onChange={(e) => setPageNotes(e.target.value)}
                    placeholder="Adicione anotações sobre esta página..."
                    className="bg-[#1a1a1f] border-[#2a2a30] min-h-[80px] text-sm"
                  />
                </div>
              </div>
            </>
          )}

          {/* Pixel Block Settings */}
          {isPixelBlock && (
            <>
              <Separator className="bg-[#2a2a30]" />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Target className="w-4 h-4" />
                  Configurações do Pixel
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="pixel-name" className="text-xs">Nome do Pixel</Label>
                    <Input
                      id="pixel-name"
                      value={pixelName}
                      onChange={(e) => setPixelName(e.target.value)}
                      placeholder="Ex: Pixel Principal"
                      className="bg-[#1a1a1f] border-[#2a2a30]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pixel-block-id" className="text-xs">ID do Pixel</Label>
                    <Input
                      id="pixel-block-id"
                      value={pixelId}
                      onChange={(e) => setPixelId(e.target.value)}
                      placeholder="Ex: 123456789012345"
                      className="bg-[#1a1a1f] border-[#2a2a30]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pixel-token" className="text-xs">Token de Acesso (Conversions API)</Label>
                    <Input
                      id="pixel-token"
                      type="password"
                      value={pixelAccessToken}
                      onChange={(e) => setPixelAccessToken(e.target.value)}
                      placeholder="EAAxxxxxxx..."
                      className="bg-[#1a1a1f] border-[#2a2a30]"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Token para eventos de servidor (opcional)
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {isFbCampaign && (
            <>
              <Separator className="bg-[#2a2a30]" />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <DollarSign className="w-4 h-4" />
                  Configurações da Campanha
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Tipo de Orçamento</Label>
                    <Select value={budgetType} onValueChange={(v) => setBudgetType(v as 'cbo' | 'abo')}>
                      <SelectTrigger className="bg-[#1a1a1f] border-[#2a2a30]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1f] border-[#2a2a30]">
                        <SelectItem value="cbo">CBO (Orçamento da Campanha)</SelectItem>
                        <SelectItem value="abo">ABO (Orçamento do Conjunto)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Tipo de Campanha</Label>
                    <Select value={campaignType} onValueChange={(v) => setCampaignType(v as 'normal' | 'advantage_plus')}>
                      <SelectTrigger className="bg-[#1a1a1f] border-[#2a2a30]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1f] border-[#2a2a30]">
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="advantage_plus">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-3 h-3" />
                            Advantage+
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {campaignType === 'advantage_plus' && (
                      <p className="text-[10px] text-purple-400">
                        O bloco exibirá um badge indicando Advantage+
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="budget" className="text-xs">Orçamento Diário (R$)</Label>
                    <Input
                      id="budget"
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder="Ex: 100"
                      className="bg-[#1a1a1f] border-[#2a2a30]"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Checkbox
                      id="show-budget-badge"
                      checked={showBudgetBadge}
                      onCheckedChange={(checked) => setShowBudgetBadge(checked === true)}
                    />
                    <Label htmlFor="show-budget-badge" className="text-xs cursor-pointer">
                      Exibir badge CBO/ABO no bloco
                    </Label>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Ad Set Settings - for fb-adset */}
          {isFbAdset && (
            <>
              <Separator className="bg-[#2a2a30]" />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Users className="w-4 h-4" />
                  Segmentação
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Tipo de Segmentação</Label>
                    <Select value={segmentationType} onValueChange={(v) => setSegmentationType(v as 'open' | 'interest' | 'advantage')}>
                      <SelectTrigger className="bg-[#1a1a1f] border-[#2a2a30]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1f] border-[#2a2a30]">
                        <SelectItem value="open">
                          <div className="flex items-center gap-2">
                            <span>🌍</span>
                            <span>Aberto (Broad)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="interest">
                          <div className="flex items-center gap-2">
                            <Target className="w-3 h-3 text-orange-500" />
                            <span>Interesse</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="advantage">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-purple-500" />
                            <span>Advantage+</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Interest field - only when interest segmentation */}
                  {segmentationType === 'interest' && (
                    <div className="space-y-2">
                      <Label htmlFor="interests" className="text-xs">Interesses</Label>
                      <Textarea
                        id="interests"
                        value={interests}
                        onChange={(e) => setInterests(e.target.value)}
                        placeholder="Ex: Fitness, Dieta, Emagrecimento..."
                        className="bg-[#1a1a1f] border-[#2a2a30] min-h-[60px] resize-none"
                      />
                    </div>
                  )}

                  {/* Budget field - only when connected campaign is ABO */}
                  {/* For now we show it always, but ideally we'd check parent campaign */}
                  <div className="space-y-2">
                    <Label htmlFor="adset-budget" className="text-xs flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      Orçamento do Conjunto (ABO)
                    </Label>
                    <Input
                      id="adset-budget"
                      type="number"
                      value={adsetBudget}
                      onChange={(e) => setAdsetBudget(e.target.value)}
                      placeholder="0"
                      className="bg-[#1a1a1f] border-[#2a2a30]"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Disponível quando a campanha conectada for ABO
                    </p>
                  </div>

                  {/* Pixel ID */}
                  <div className="space-y-2">
                    <Label htmlFor="pixel-id" className="text-xs flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      ID do Pixel
                    </Label>
                    <Input
                      id="pixel-id"
                      value={pixelId}
                      onChange={(e) => setPixelId(e.target.value)}
                      placeholder="Ex: 123456789"
                      className="bg-[#1a1a1f] border-[#2a2a30]"
                    />
                  </div>
                  
                  {/* Detailed targeting - only when not advantage */}
                  {segmentationType !== 'advantage' && (
                    <>
                      <Separator className="bg-[#2a2a30]" />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="age-min" className="text-xs">Idade Mínima</Label>
                          <Input
                            id="age-min"
                            type="number"
                            value={ageMin}
                            onChange={(e) => setAgeMin(e.target.value)}
                            min="13"
                            max="65"
                            className="bg-[#1a1a1f] border-[#2a2a30]"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="age-max" className="text-xs">Idade Máxima</Label>
                          <Input
                            id="age-max"
                            type="number"
                            value={ageMax}
                            onChange={(e) => setAgeMax(e.target.value)}
                            min="13"
                            max="65"
                            className="bg-[#1a1a1f] border-[#2a2a30]"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs">Gênero</Label>
                        <Select value={gender} onValueChange={(v) => setGender(v as 'all' | 'male' | 'female')}>
                          <SelectTrigger className="bg-[#1a1a1f] border-[#2a2a30]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a1f] border-[#2a2a30]">
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="male">Masculino</SelectItem>
                            <SelectItem value="female">Feminino</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          Região
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                          {regionOptions.map((region) => (
                            <label key={region.value} className="flex items-center gap-2 text-xs cursor-pointer">
                              <Checkbox
                                checked={regions.includes(region.value)}
                                onCheckedChange={() => toggleRegion(region.value)}
                              />
                              {region.label}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs flex items-center gap-1">
                          <Globe2 className="w-3 h-3" />
                          Idiomas
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                          {languageOptions.map((lang) => (
                            <label key={lang.value} className="flex items-center gap-2 text-xs cursor-pointer">
                              <Checkbox
                                checked={languages.includes(lang.value)}
                                onCheckedChange={() => toggleLanguage(lang.value)}
                              />
                              {lang.label}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          Posicionamentos
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                          {placementOptions.map((placement) => (
                            <label key={placement.value} className="flex items-center gap-2 text-xs cursor-pointer">
                              <Checkbox
                                checked={placements.includes(placement.value)}
                                onCheckedChange={() => togglePlacement(placement.value)}
                              />
                              {placement.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Ad Settings - for fb-ad */}
          {isFbAd && (
            <>
              <Separator className="bg-[#2a2a30]" />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Video className="w-4 h-4" />
                  Criativo do Anúncio
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="drive-link" className="text-xs">Link do Drive</Label>
                    <Input
                      id="drive-link"
                      value={driveLink}
                      onChange={(e) => setDriveLink(e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className="bg-[#1a1a1f] border-[#2a2a30]"
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-[#2a2a30]" />
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase">
                      <span className="bg-[#0f0f12] px-2 text-muted-foreground">ou</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Upload do Arquivo</Label>
                    {adMedia ? (
                      <div className="relative rounded-lg overflow-hidden border border-[#2a2a30]">
                        {adMediaType === 'video' ? (
                          <video 
                            src={adMedia} 
                            className="w-full h-32 object-cover"
                            controls
                          />
                        ) : (
                          <img 
                            src={adMedia} 
                            alt="Ad media" 
                            className="w-full h-32 object-cover"
                          />
                        )}
                        <button
                          onClick={removeAdMedia}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => adMediaInputRef.current?.click()}
                        className="w-full h-24 rounded-lg border-2 border-dashed border-[#2a2a30] hover:border-primary/50 flex flex-col items-center justify-center gap-2 transition-colors"
                      >
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Imagem ou Vídeo</span>
                      </button>
                    )}
                    <input
                      ref={adMediaInputRef}
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleAdMediaUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Ad Copy Section */}
              <Separator className="bg-[#2a2a30]" />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Type className="w-4 h-4" />
                  Textos do Anúncio
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="ad-primary-text" className="text-xs">Texto Principal</Label>
                    <Textarea
                      id="ad-primary-text"
                      value={adPrimaryText}
                      onChange={(e) => setAdPrimaryText(e.target.value)}
                      placeholder="Texto principal do anúncio..."
                      className="bg-[#1a1a1f] border-[#2a2a30] min-h-[80px] resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ad-secondary-text" className="text-xs">Texto Secundário</Label>
                    <Input
                      id="ad-secondary-text"
                      value={adSecondaryText}
                      onChange={(e) => setAdSecondaryText(e.target.value)}
                      placeholder="Texto secundário..."
                      className="bg-[#1a1a1f] border-[#2a2a30]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ad-caption" className="text-xs">Legenda</Label>
                    <Input
                      id="ad-caption"
                      value={adCaption}
                      onChange={(e) => setAdCaption(e.target.value)}
                      placeholder="Legenda do anúncio..."
                      className="bg-[#1a1a1f] border-[#2a2a30]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ad-copy" className="text-xs">Copy</Label>
                    <Textarea
                      id="ad-copy"
                      value={adCopy}
                      onChange={(e) => setAdCopy(e.target.value)}
                      placeholder="Copy completa do anúncio..."
                      className="bg-[#1a1a1f] border-[#2a2a30] min-h-[100px] resize-none"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Email Content - for email automation */}
          {isEmail && (
            <>
              <Separator className="bg-[#2a2a30]" />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  Conteúdo do E-mail
                </div>
                <div className="space-y-2">
                  <Textarea
                    value={emailContent}
                    onChange={(e) => setEmailContent(e.target.value)}
                    placeholder="Escreva o conteúdo do e-mail aqui..."
                    className="bg-[#1a1a1f] border-[#2a2a30] min-h-[150px] resize-none"
                  />
                </div>
              </div>
            </>
          )}

          {/* WhatsApp Phone Number & Status */}
          {isWhatsappAny && (
            <>
              <Separator className="bg-[#2a2a30]" />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  Número do WhatsApp
                </div>
                <div className="space-y-2">
                  <Input
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    placeholder="+55 11 99999-9999"
                    className="bg-[#1a1a1f] border-[#2a2a30]"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    O número aparece no bloco e fica oculto no modo educacional.
                  </p>
                </div>
                {/* Status toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setWhatsappStatus('active')}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                        whatsappStatus === 'active' 
                          ? 'bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/40' 
                          : 'bg-[#1a1a1f] text-muted-foreground border border-[#2a2a30]'
                      )}
                    >
                      Ativo
                    </button>
                    <button
                      onClick={() => setWhatsappStatus('down')}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                        whatsappStatus === 'down' 
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40' 
                          : 'bg-[#1a1a1f] text-muted-foreground border border-[#2a2a30]'
                      )}
                    >
                      Caído
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* WhatsApp Message Content */}
          {isWhatsappMessage && (
            <>
              <Separator className="bg-[#2a2a30]" />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <MessageCircle className="w-4 h-4" />
                  Mensagem WhatsApp
                </div>
                <div className="space-y-2">
                  <Textarea
                    value={whatsappMessage}
                    onChange={(e) => setWhatsappMessage(e.target.value)}
                    placeholder="Escreva a mensagem do WhatsApp aqui..."
                    className="bg-[#1a1a1f] border-[#2a2a30] min-h-[150px] resize-none"
                  />
                </div>
              </div>
            </>
          )}

          {/* Sticky Note Content */}
          {isStickyNote && (
            <>
              <Separator className="bg-[#2a2a30]" />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <StickyNote className="w-4 h-4" />
                  Conteúdo da Nota
                </div>
                <div className="space-y-2">
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Escreva sua anotação aqui..."
                    className="bg-[#1a1a1f] border-[#2a2a30] min-h-[100px] resize-none"
                  />
                </div>
              </div>
            </>
          )}

          {/* Free Text Content */}
          {isFreeText && (
            <>
              <Separator className="bg-[#2a2a30]" />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Type className="w-4 h-4" />
                  Conteúdo do Texto
                </div>
                <div className="space-y-2">
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Digite seu texto aqui..."
                    className="bg-[#1a1a1f] border-[#2a2a30] min-h-[80px] resize-none"
                  />
                </div>
              </div>
            </>
          )}

          {/* Text Formatting - for sticky notes and free text */}
          {showTextFormatting && (
            <>
              <Separator className="bg-[#2a2a30]" />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Palette className="w-4 h-4" />
                  Formatação do Texto
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">Estilo do Texto</Label>
                  <div className="flex gap-2">
                    <Toggle
                      pressed={textBold}
                      onPressedChange={setTextBold}
                      size="sm"
                      className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    >
                      <Bold className="w-4 h-4" />
                    </Toggle>
                    <Toggle
                      pressed={textItalic}
                      onPressedChange={setTextItalic}
                      size="sm"
                      className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    >
                      <Italic className="w-4 h-4" />
                    </Toggle>
                    <Toggle
                      pressed={textUnderline}
                      onPressedChange={setTextUnderline}
                      size="sm"
                      className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    >
                      <Underline className="w-4 h-4" />
                    </Toggle>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Tamanho da Fonte</Label>
                  <Select value={fontSize} onValueChange={(v) => setFontSize(v as 'sm' | 'md' | 'lg')}>
                    <SelectTrigger className="bg-[#1a1a1f] border-[#2a2a30]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1f] border-[#2a2a30]">
                      <SelectItem value="sm">Pequeno</SelectItem>
                      <SelectItem value="md">Médio</SelectItem>
                      <SelectItem value="lg">Grande</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isStickyNote && (
                  <div className="space-y-2">
                    <Label className="text-xs">Cor da Nota</Label>
                    <div className="flex flex-wrap gap-2">
                      {noteColors.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setBackgroundColor(color.value)}
                          className={cn(
                            'w-7 h-7 rounded-full transition-all',
                            'ring-offset-background',
                            backgroundColor === color.value && 'ring-2 ring-ring ring-offset-2'
                          )}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {isFreeText && (
                  <div className="space-y-2">
                    <Label className="text-xs">Cor do Texto</Label>
                    <div className="flex flex-wrap gap-2">
                      {textColors.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setTextColor(color.value)}
                          className={cn(
                            'w-7 h-7 rounded-full transition-all border border-[#3a3a40]',
                            'ring-offset-background',
                            textColor === color.value && 'ring-2 ring-ring ring-offset-2'
                          )}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Timer Configuration */}
          {isTimer && (
            <>
              <Separator className="bg-[#2a2a30]" />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  Configuração de Tempo
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="wait-time" className="text-xs">Tempo de Espera</Label>
                    <Input
                      id="wait-time"
                      type="number"
                      value={waitTime}
                      onChange={(e) => setWaitTime(e.target.value)}
                      placeholder="Ex: 24"
                      className="bg-[#1a1a1f] border-[#2a2a30]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wait-unit" className="text-xs">Unidade</Label>
                    <Select value={waitUnit} onValueChange={(v) => setWaitUnit(v as 'hours' | 'days')}>
                      <SelectTrigger className="bg-[#1a1a1f] border-[#2a2a30]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1f] border-[#2a2a30]">
                        <SelectItem value="hours">Horas</SelectItem>
                        <SelectItem value="days">Dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Tracking Event (for pages and payments) */}
          {showTrackingEvent && (
            <>
              <Separator className="bg-[#2a2a30]" />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Zap className="w-4 h-4" />
                  Evento de Rastreio
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tracking-event" className="text-xs">Tipo de Evento</Label>
                  <Select value={trackingEvent} onValueChange={setTrackingEvent}>
                    <SelectTrigger className="bg-[#1a1a1f] border-[#2a2a30]">
                      <SelectValue placeholder="Selecione um evento" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1f] border-[#2a2a30]">
                      {trackingEvents.map((event) => (
                        <SelectItem key={event.value} value={event.value}>
                          {event.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* Metrics - for pages, traffic, payment */}
          {showMetrics && (
            <>
              <Separator className="bg-[#2a2a30]" />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <BarChart3 className="w-4 h-4" />
                  Métricas
                  {liveMode && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                      Auto
                    </span>
                  )}
                </div>
                {(() => {
                  const nodeAnalytics = liveMode && node ? getNodeStats(node.id) : null;
                  return (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="node-visitors" className="text-xs">Visitantes</Label>
                          <Input
                            id="node-visitors"
                            type="number"
                            value={nodeAnalytics ? nodeAnalytics.unique_visitors : visitors}
                            onChange={(e) => !nodeAnalytics && setVisitors(e.target.value)}
                            readOnly={!!nodeAnalytics}
                            placeholder="0"
                            className={cn(
                              "bg-[#1a1a1f] border-[#2a2a30]",
                              nodeAnalytics && "opacity-80 cursor-default"
                            )}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="node-leads" className="text-xs">Leads</Label>
                          <Input
                            id="node-leads"
                            type="number"
                            value={nodeAnalytics ? nodeAnalytics.leads : leads}
                            onChange={(e) => !nodeAnalytics && setLeads(e.target.value)}
                            readOnly={!!nodeAnalytics}
                            placeholder="0"
                            className={cn(
                              "bg-[#1a1a1f] border-[#2a2a30]",
                              nodeAnalytics && "opacity-80 cursor-default"
                            )}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="node-sales" className="text-xs">Vendas</Label>
                          <Input
                            id="node-sales"
                            type="number"
                            value={nodeAnalytics ? nodeAnalytics.sales : sales}
                            onChange={(e) => !nodeAnalytics && setSales(e.target.value)}
                            readOnly={!!nodeAnalytics}
                            placeholder="0"
                            className={cn(
                              "bg-[#1a1a1f] border-[#2a2a30]",
                              nodeAnalytics && "opacity-80 cursor-default"
                            )}
                          />
                        </div>
                      </div>
                      {nodeAnalytics && (
                        <p className="text-[10px] text-muted-foreground">
                          Dados preenchidos automaticamente pelo script de tracking
                        </p>
                      )}
                    </>
                  );
                })()}
                <div className="space-y-2">
                  <Label htmlFor="node-goal" className="text-xs">Meta de Conversão (%)</Label>
                  <Input
                    id="node-goal"
                    type="number"
                    value={conversionGoal}
                    onChange={(e) => setConversionGoal(e.target.value)}
                    placeholder="Ex: 5"
                    className="bg-[#1a1a1f] border-[#2a2a30]"
                  />
                </div>
              </div>
            </>
          )}

          {/* Tracking - for pages only */}
          {showTracking && (
            <>
              <Separator className="bg-[#2a2a30]" />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Link className="w-4 h-4" />
                  Rastreamento
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="node-url" className="text-xs">URL de Destino</Label>
                    <Input
                      id="node-url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://..."
                      className="bg-[#1a1a1f] border-[#2a2a30]"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="node-utm-source" className="text-xs">UTM Source</Label>
                      <Input
                        id="node-utm-source"
                        value={utmSource}
                        onChange={(e) => setUtmSource(e.target.value)}
                        placeholder="facebook"
                        className="bg-[#1a1a1f] border-[#2a2a30]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="node-utm-medium" className="text-xs">UTM Medium</Label>
                      <Input
                        id="node-utm-medium"
                        value={utmMedium}
                        onChange={(e) => setUtmMedium(e.target.value)}
                        placeholder="cpc"
                        className="bg-[#1a1a1f] border-[#2a2a30]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="node-utm-campaign" className="text-xs">UTM Campaign</Label>
                      <Input
                        id="node-utm-campaign"
                        value={utmCampaign}
                        onChange={(e) => setUtmCampaign(e.target.value)}
                        placeholder="launch"
                        className="bg-[#1a1a1f] border-[#2a2a30]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Delete Button */}
          <div className="pt-4">
            <Button variant="destructive" onClick={handleDelete} className="w-full">
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Elemento
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
