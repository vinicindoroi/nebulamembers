export interface FunnelStepRow {
  key: string;
  label: string;
  position: number;
  sessions: number;
  /** % vs etapa anterior (0-100). null na primeira etapa */
  retention: number | null;
  /** quantas sessões abandonaram nessa passagem */
  dropped: number;
  /** % do total que chegou (0-100) */
  ofTotal: number;
  bottleneck: boolean;
}

export interface FunnelBreakdownRow {
  key: string;
  label: string;
  sublabel: string | null;
  /** utm_campaign da sessão (quando aplicável) */
  campaign?: string | null;
  /** utm_content bruto (quando aplicável) */
  content?: string | null;
  /** utm_source (quando aplicável) */
  source?: string | null;
  sessions: number;
  sales: number;
  revenue: number;
  conv: number;
}

export interface FunnelSummary {
  arrived: number;
  paid: number;
  /** tentativas recusadas/canceladas no período */
  refused: number;
  generated: number;
  revenue: number;
  /** chegou → pagou (%) */
  convOverall: number;
  /** gerado → pago (%) */
  payRate: number;
}

export interface FunnelReport {
  currency: string;
  steps: FunnelStepRow[];
  summary: FunnelSummary;
  byCreative: FunnelBreakdownRow[];
  bySource: FunnelBreakdownRow[];
  compare: FunnelSummary | null;
  totalEvents: number;
}
