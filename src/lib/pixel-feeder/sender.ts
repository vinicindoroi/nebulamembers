import { MetaCAPIRequest, MetaEventPayload } from "./types";

export interface SendResult {
  ok: boolean;
  httpStatus: number;
  eventsReceived?: number;
  fbtraceId?: string;
  errorMessage?: string;
  rawResponse?: any;
}

export async function sendMetaEvent(
  pixelId: string,
  accessToken: string,
  event: MetaEventPayload,
  testEventCode?: string,
): Promise<SendResult> {
  const cleanPixel = pixelId.trim();
  const cleanToken = accessToken.trim();
  const cleanTestCode = testEventCode?.trim();

  const url = `https://graph.facebook.com/v21.0/${cleanPixel}/events?access_token=${encodeURIComponent(
    cleanToken,
  )}`;

  const body: MetaCAPIRequest = {
    data: [event],
  };

  if (cleanTestCode) {
    body.test_event_code = cleanTestCode;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const msg =
        data?.error?.message ||
        data?.error?.error_user_msg ||
        `Erro HTTP ${res.status}: ${res.statusText}`;
      return {
        ok: false,
        httpStatus: res.status,
        fbtraceId: data?.error?.fbtrace_id,
        errorMessage: msg,
        rawResponse: data,
      };
    }

    return {
      ok: true,
      httpStatus: res.status,
      eventsReceived: data?.events_received ?? 1,
      fbtraceId: data?.fbtrace_id,
      rawResponse: data,
    };
  } catch (err: any) {
    return {
      ok: false,
      httpStatus: 0,
      errorMessage: err.message || "Erro de rede / CORS ao conectar com a Meta Graph API.",
    };
  }
}
