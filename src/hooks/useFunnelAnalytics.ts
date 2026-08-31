import { useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface FunnelEventStats {
  node_id: string;
  pageviews: number;
  unique_visitors: number;
  recent_visitors: number;
  clicks: number;
  leads: number;
  sales: number;
  last_event_at: string | null;
}

export interface QuizStepStat {
  step: number;
  question: string | null;
  count: number;
  unique_visitors: number;
  answers: Record<string, number>;
}

export interface FunnelEvent {
  id: string;
  funnel_id: string;
  node_id: string;
  event_type: string;
  session_id: string | null;
  visitor_id: string | null;
  page_url: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  device_type: string | null;
  browser: string | null;
  created_at: string;
}

interface UseFunnelAnalyticsOptions {
  funnelId: string;
  enabled?: boolean;
  timeRangeHours?: number; // supports 1, 6, -1 (today), -2 (yesterday), 168 (7 days)
}

export interface ConversionRate {
  sourceNodeId: string;
  targetNodeId: string;
  rate: number; // 0-100
  sourceVisitors: number;
  targetVisitors: number;
}

export function useFunnelAnalytics({ funnelId, enabled = true, timeRangeHours = 24 }: UseFunnelAnalyticsOptions) {
  const queryClient = useQueryClient();
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);
  const [liveVisitors, setLiveVisitors] = useState<Map<string, Map<string, number>>>(new Map()); // nodeId -> (visitorId -> lastSeenTimestamp)

  // Fetch aggregated stats per node
  const { data: queryResult, isLoading, refetch } = useQuery({
    queryKey: ['funnel-analytics', funnelId, timeRangeHours],
    queryFn: async () => {
      const startTime = new Date();
      let endTime: Date | null = null;
      if (timeRangeHours === -1) {
        startTime.setHours(0, 0, 0, 0);
      } else if (timeRangeHours === -2) {
        // Yesterday: full day
        endTime = new Date();
        endTime.setHours(0, 0, 0, 0); // start of today = end of yesterday
        startTime.setDate(startTime.getDate() - 1);
        startTime.setHours(0, 0, 0, 0);
      } else {
        startTime.setHours(startTime.getHours() - timeRangeHours);
      }

      // Fetch all events with pagination to avoid the 1000 row limit
      const pageSize = 1000;
      let allData: any[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        let queryBuilder = supabase
          .from('funnel_events')
          .select('node_id, event_type, visitor_id, created_at, metadata, utm_source, utm_medium, fbclid, gclid, ttclid')
          .eq('funnel_id', funnelId)
          .gte('created_at', startTime.toISOString());
        
        if (endTime) {
          queryBuilder = queryBuilder.lt('created_at', endTime.toISOString());
        }

        const { data: pageData, error } = await queryBuilder
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        allData = allData.concat(pageData || []);
        hasMore = (pageData?.length || 0) === pageSize;
        page++;
      }

      const data = allData;

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const nodeStats = new Map<string, {
        pageviews: number;
        visitors: Set<string>;
        clicks: number;
        leads: number;
        sales: number;
        last_event_at: string | null;
        recentVisitorLastSeen: Map<string, string>;
      }>();

      const globalVisitors = new Set<string>();
      const globalRecentLastSeen = new Map<string, string>();

      // Source attribution: track stats by traffic source
      type SourceKey = 'facebook' | 'instagram' | 'google' | 'tiktok' | 'youtube' | 'unknown';
      const sourceStats = new Map<SourceKey, { pageviews: number; visitors: Set<string>; recentLastSeen: Map<string, string> }>();
      const getSourceKey = (event: any): SourceKey => {
        const src = (event.utm_source || '').toLowerCase();
        // Check utm_source first for instagram/ig before fbclid, since Instagram Ads also have fbclid
        if (src === 'instagram' || src === 'ig') return 'instagram';
        if (event.fbclid || src === 'facebook' || src === 'fb' || src === 'meta') return 'facebook';
        if (event.gclid || src === 'google' || src === 'adwords') return 'google';
        if (event.ttclid || src === 'tiktok' || src === 'tt') return 'tiktok';
        if (src === 'youtube' || src === 'yt') return 'youtube';
        return 'unknown';
      };

      for (const event of data || []) {
        if (!nodeStats.has(event.node_id)) {
          nodeStats.set(event.node_id, {
            pageviews: 0,
            visitors: new Set(),
            clicks: 0,
            leads: 0,
            sales: 0,
            last_event_at: null,
            recentVisitorLastSeen: new Map(),
          });
        }

        const stat = nodeStats.get(event.node_id)!;

        if (event.event_type === 'pageview') stat.pageviews++;
        if (event.event_type === 'click') stat.clicks++;
        if (event.event_type === 'lead') stat.leads++;
        if (event.event_type === 'purchased') stat.sales++;
        if (event.visitor_id) {
          stat.visitors.add(event.visitor_id);
          globalVisitors.add(event.visitor_id);
          const prev = stat.recentVisitorLastSeen.get(event.visitor_id);
          if (!prev || event.created_at > prev) {
            stat.recentVisitorLastSeen.set(event.visitor_id, event.created_at);
          }
          const globalPrev = globalRecentLastSeen.get(event.visitor_id);
          if (!globalPrev || event.created_at > globalPrev) {
            globalRecentLastSeen.set(event.visitor_id, event.created_at);
          }
        }
        if (!stat.last_event_at || event.created_at > stat.last_event_at) {
          stat.last_event_at = event.created_at;
        }

        // Attribute to traffic source
        if (event.event_type === 'pageview') {
          const sourceKey = getSourceKey(event);
          if (sourceKey !== 'unknown') {
            if (!sourceStats.has(sourceKey)) {
              sourceStats.set(sourceKey, { pageviews: 0, visitors: new Set(), recentLastSeen: new Map() });
            }
            const ss = sourceStats.get(sourceKey)!;
            ss.pageviews++;
            if (event.visitor_id) {
              ss.visitors.add(event.visitor_id);
              const prev = ss.recentLastSeen.get(event.visitor_id);
              if (!prev || event.created_at > prev) {
                ss.recentLastSeen.set(event.visitor_id, event.created_at);
              }
            }
          }
        }
      }

      const nodeStatsArray = Array.from(nodeStats.entries()).map(([node_id, stat]) => {
        let recentCount = 0;
        stat.recentVisitorLastSeen.forEach((lastSeen) => {
          if (lastSeen > fiveMinutesAgo) recentCount++;
        });
        return {
          node_id,
          pageviews: stat.pageviews,
          unique_visitors: stat.visitors.size,
          recent_visitors: recentCount,
          clicks: stat.clicks,
          leads: stat.leads,
          sales: stat.sales,
          last_event_at: stat.last_event_at,
        };
      }) as FunnelEventStats[];

      // Build source stats result
      const sourceStatsResult: Record<string, { pageviews: number; unique_visitors: number; recent_visitors: number }> = {};
      sourceStats.forEach((ss, key) => {
        let recentCount = 0;
        ss.recentLastSeen.forEach((lastSeen) => {
          if (lastSeen > fiveMinutesAgo) recentCount++;
        });
        sourceStatsResult[key] = { pageviews: ss.pageviews, unique_visitors: ss.visitors.size, recent_visitors: recentCount };
      });

      let globalRecentCount = 0;
      globalRecentLastSeen.forEach((lastSeen) => {
        if (lastSeen > fiveMinutesAgo) globalRecentCount++;
      });

      return { stats: nodeStatsArray, globalUniqueVisitors: globalVisitors.size, globalRecentVisitors: globalRecentCount, sourceStats: sourceStatsResult };
    },
    enabled: enabled && !!funnelId,
    refetchInterval: 30000,
  });

  const stats = queryResult?.stats ?? [];
  const sourceStatsData = queryResult?.sourceStats ?? {};
  const globalUniqueVisitors = queryResult?.globalUniqueVisitors ?? 0;
  const globalRecentVisitors = queryResult?.globalRecentVisitors ?? 0;

  // Map node types to source keys for attribution
  const getSourceStatsForNodeType = useCallback(
    (nodeType: string): { pageviews: number; unique_visitors: number; recent_visitors: number } | null => {
      const typeToSource: Record<string, string[]> = {
        'facebook-ads': ['facebook'],
        'fb-campaign': ['facebook'],
        'fb-adset': ['facebook'],
        'fb-ad': ['facebook'],
        'instagram': ['instagram'],
        'google-ads': ['google'],
        'tiktok-ads': ['tiktok'],
        'youtube': ['youtube'],
      };
      const sources = typeToSource[nodeType];
      if (!sources) return null;
      let total = { pageviews: 0, unique_visitors: 0, recent_visitors: 0 };
      for (const src of sources) {
        const s = sourceStatsData[src];
        if (s) {
          total.pageviews += s.pageviews;
          total.unique_visitors += s.unique_visitors;
          total.recent_visitors += s.recent_visitors;
        }
      }
      return total.pageviews > 0 ? total : null;
    },
    [sourceStatsData]
  );

  // Setup realtime subscription
  useEffect(() => {
    if (!enabled || !funnelId) return;

    // Use unique channel name to avoid conflicts with existing subscriptions
    const channelName = `funnel-events-${funnelId}-${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'funnel_events',
          filter: `funnel_id=eq.${funnelId}`,
        },
        (payload) => {
          const newEvent = payload.new as FunnelEvent;

          // Update live visitors map
          setLiveVisitors((prev) => {
            const updated = new Map(prev);
            const nodeVisitors = updated.get(newEvent.node_id) || new Map<string, number>();
            if (newEvent.visitor_id) {
              nodeVisitors.set(newEvent.visitor_id, Date.now());
            }
            updated.set(newEvent.node_id, nodeVisitors);
            return updated;
          });

          // Invalidate query to refresh stats
          queryClient.invalidateQueries({ queryKey: ['funnel-analytics', funnelId] });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[FunnelAnalytics] Realtime connected');
        }
      });

    setRealtimeChannel(channel);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [funnelId, enabled, queryClient]);

  // Periodically clean up expired visitors (every 60s)
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      setLiveVisitors((prev) => {
        const updated = new Map<string, Map<string, number>>();
        prev.forEach((visitors, nodeId) => {
          const filtered = new Map<string, number>();
          visitors.forEach((lastSeen, visitorId) => {
            if (lastSeen > fiveMinutesAgo) filtered.set(visitorId, lastSeen);
          });
          if (filtered.size > 0) updated.set(nodeId, filtered);
        });
        return updated;
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [enabled]);

  const getNodeStats = useCallback(
    (nodeId: string): FunnelEventStats | null => {
      return stats.find((s) => s.node_id === nodeId) || null;
    },
    [stats]
  );

  // Get quiz step breakdown for a specific node
  const getQuizStepStats = useCallback(
    async (nodeId: string): Promise<QuizStepStat[]> => {
      const startTime = new Date();
      let endTime: Date | null = null;
      if (timeRangeHours === -1) {
        startTime.setHours(0, 0, 0, 0);
      } else if (timeRangeHours === -2) {
        endTime = new Date();
        endTime.setHours(0, 0, 0, 0);
        startTime.setDate(startTime.getDate() - 1);
        startTime.setHours(0, 0, 0, 0);
      } else {
        startTime.setHours(startTime.getHours() - timeRangeHours);
      }

      let queryBuilder = supabase
        .from('funnel_events')
        .select('visitor_id, metadata')
        .eq('funnel_id', funnelId)
        .eq('node_id', nodeId)
        .eq('event_type', 'quiz_step')
        .gte('created_at', startTime.toISOString());

      if (endTime) {
        queryBuilder = queryBuilder.lt('created_at', endTime.toISOString());
      }

      const { data, error } = await queryBuilder;

      if (error || !data) return [];

      const stepMap = new Map<number, {
        count: number;
        visitors: Set<string>;
        question: string | null;
        answers: Record<string, number>;
      }>();

      for (const event of data) {
        const meta = event.metadata as Record<string, unknown> | null;
        const step = Number(meta?.step) || 0;
        
        if (!stepMap.has(step)) {
          stepMap.set(step, {
            count: 0,
            visitors: new Set(),
            question: (meta?.question as string) || null,
            answers: {},
          });
        }

        const s = stepMap.get(step)!;
        s.count++;
        if (event.visitor_id) s.visitors.add(event.visitor_id);
        
        const answer = meta?.answer as string;
        if (answer) {
          s.answers[answer] = (s.answers[answer] || 0) + 1;
        }
      }

      return Array.from(stepMap.entries())
        .map(([step, s]) => ({
          step,
          question: s.question,
          count: s.count,
          unique_visitors: s.visitors.size,
          answers: s.answers,
        }))
        .sort((a, b) => a.step - b.step);
    },
    [funnelId, timeRangeHours]
  );

  // Check if node has recent activity (within last 5 minutes)
  const isNodeLive = useCallback(
    (nodeId: string): boolean => {
      const stat = stats.find((s) => s.node_id === nodeId);
      if (!stat?.last_event_at) return false;

      const lastEventTime = new Date(stat.last_event_at).getTime();
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      return lastEventTime > fiveMinutesAgo;
    },
    [stats]
  );

  // Get total LIVE visitors across all nodes (only last 5 min)
  const getTotalVisitors = useCallback((): number => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const allVisitors = new Set<string>();
    liveVisitors.forEach((visitors) => {
      visitors.forEach((lastSeen, visitorId) => {
        if (lastSeen > fiveMinutesAgo) {
          allVisitors.add(visitorId);
        }
      });
    });
    return allVisitors.size || globalRecentVisitors;
  }, [globalRecentVisitors, liveVisitors]);

  // Get total pageviews across all nodes
  const getTotalPageviews = useCallback((): number => {
    return stats.reduce((acc, s) => acc + s.pageviews, 0);
  }, [stats]);

  // Calculate conversion rates between connected nodes (edges)
  const getConversionRates = useCallback(
    (edges: { source: string; target: string }[]): ConversionRate[] => {
      return edges
        .map((edge) => {
          const sourceStat = stats.find((s) => s.node_id === edge.source);
          const targetStat = stats.find((s) => s.node_id === edge.target);
          const sourceVisitors = sourceStat?.pageviews || 0;
          const targetVisitors = targetStat?.pageviews || 0;

          if (sourceVisitors === 0) return null;

          return {
            sourceNodeId: edge.source,
            targetNodeId: edge.target,
            rate: Math.round((targetVisitors / sourceVisitors) * 100),
            sourceVisitors,
            targetVisitors,
          } as ConversionRate;
        })
        .filter(Boolean) as ConversionRate[];
    },
    [stats]
  );

  // Get live visitor count for a specific node (active in last 5 min)
  const getNodeLiveVisitors = useCallback(
    (nodeId: string): number => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const nodeMap = liveVisitors.get(nodeId);
      if (!nodeMap) return 0;
      let count = 0;
      nodeMap.forEach((lastSeen) => {
        if (lastSeen > fiveMinutesAgo) count++;
      });
      return count;
    },
    [liveVisitors]
  );

  return {
    stats,
    isLoading,
    refetch,
    getNodeStats,
    getQuizStepStats,
    isNodeLive,
    getTotalVisitors,
    getTotalPageviews,
    getConversionRates,
    getNodeLiveVisitors,
    getSourceStatsForNodeType,
    realtimeChannel,
  };
}
