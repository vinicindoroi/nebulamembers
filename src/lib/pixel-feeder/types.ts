export type SupportedCountry =
  | "BR"
  | "US"
  | "PT"
  | "ES"
  | "GB"
  | "FR"
  | "MX"
  | "IT"
  | "DE"
  | "CA"
  | "AU"
  | "AR"
  | "CL"
  | "CO";

export type SupportedCurrency = "BRL" | "USD" | "EUR" | "GBP" | "MXN" | "CAD" | "AUD" | "ARS" | "CLP" | "COP";

export type GenderFilter = "all" | "female" | "male";

export type PixelEventName =
  | "PageView"
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase"
  | "Lead"
  | "AddPaymentInfo"
  | "CompleteRegistration";

export interface PixelFeederConfig {
  pixelId: string;
  accessToken: string;
  testEventCode?: string;
  countries: SupportedCountry[];
  currency: SupportedCurrency;
  valueMode: "fixed" | "range";
  valueFixed: number;
  valueMin: number;
  valueMax: number;
  gender: GenderFilter;
  events: PixelEventName[];
  simulateFunnel: boolean;
  totalEvents: number;
  delayMs: number;
}

export interface GeneratedCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: "f" | "m";
  city: string;
  state: string;
  zip: string;
  country: string; // ISO 2 chars lower-case
  ip: string;
  userAgent: string;
  fbp: string;
  fbc: string;
}

export interface HashedUserData {
  em: string[];
  ph: string[];
  fn: string[];
  ln: string[];
  ge: string[];
  ct: string[];
  st: string[];
  zp: string[];
  country: string[];
  client_ip_address: string;
  client_user_agent: string;
  fbp: string;
  fbc: string;
}

export interface MetaCustomData {
  currency?: string;
  value?: number;
  content_name?: string;
  content_type?: string;
  contents?: Array<{
    id: string;
    quantity: number;
    item_price?: number;
  }>;
  num_items?: number;
  status?: boolean;
}

export interface MetaEventPayload {
  event_name: string;
  event_time: number;
  event_id: string;
  event_source_url: string;
  action_source: "website";
  user_data: HashedUserData;
  custom_data?: MetaCustomData;
}

export interface MetaCAPIRequest {
  data: MetaEventPayload[];
  test_event_code?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  eventName: string;
  status: "success" | "error" | "sending";
  httpCode?: number;
  country: string;
  currency: string;
  value?: number;
  customerName: string;
  eventId: string;
  matchScoreEstimate: number;
  responseMessage?: string;
  fbtraceId?: string;
}

export interface FeederStats {
  totalSent: number;
  successCount: number;
  errorCount: number;
  lastFbTraceId?: string;
  estimatedQualityScore: number;
}
