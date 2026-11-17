/**
 * blue-ocean-api — C3.3
 * Public REST API served as a Supabase Edge Function.
 *
 * Routes:
 *   GET /blue-ocean-api/services/{serviceId}                 → full ServiceGraph
 *   GET /blue-ocean-api/services/{serviceId}/journeys        → journeys list
 *   GET /blue-ocean-api/services/{serviceId}/journeys/{id}   → single journey + stages
 *   GET /blue-ocean-api/services/{serviceId}/research        → observations + sources
 *   GET /blue-ocean-api/services/{serviceId}/portfolio       → improvement initiatives
 *
 * Auth: Bearer token (API key) validated against `api_keys` table.
 * Rate-limit: 60 requests / minute per key (tracked in `api_rate_limits`).
 *
 * Deployment:
 *   supabase functions deploy blue-ocean-api --no-verify-jwt
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function error(message: string, status = 400) {
  return json({ error: message }, status);
}

async function validateApiKey(
  supabase: ReturnType<typeof createClient>,
  authorization: string | null,
): Promise<{ valid: boolean; workspaceId?: string; keyId?: string }> {
  if (!authorization?.startsWith('Bearer ')) return { valid: false };
  const token = authorization.slice(7).trim();
  if (!token) return { valid: false };

  const { data, error: dbError } = await supabase
    .from('api_keys')
    .select('id, workspace_id, revoked_at')
    .eq('key_hash', await hashApiKey(token))
    .single();

  if (dbError || !data || data.revoked_at) return { valid: false };
  return { valid: true, workspaceId: data.workspace_id as string, keyId: data.id as string };
}

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  keyId: string,
): Promise<boolean> {
  const windowStart = new Date(Date.now() - 60_000).toISOString();
  const { count } = await supabase
    .from('api_rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('key_id', keyId)
    .gte('requested_at', windowStart);

  if ((count ?? 0) >= 60) return false;

  await supabase.from('api_rate_limits').insert({ key_id: keyId });
  return true;
}

async function getServiceGraph(supabase: ReturnType<typeof createClient>, serviceId: string, workspaceId: string) {
  const { data, error: dbError } = await supabase
    .from('workspaces')
    .select('graph')
    .eq('id', serviceId)
    .eq('owner_workspace_id', workspaceId)
    .single();

  if (dbError || !data) return null;
  return data.graph as Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.replace(/^\/blue-ocean-api/, '').split('/').filter(Boolean);

  // Only GET is supported
  if (req.method !== 'GET') return error('Method not allowed', 405);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Authenticate
  const authResult = await validateApiKey(supabase, req.headers.get('Authorization'));
  if (!authResult.valid) return error('Invalid or missing API key', 401);

  // Rate limit
  const withinLimit = await checkRateLimit(supabase, authResult.keyId!);
  if (!withinLimit) return error('Rate limit exceeded (60 req/min)', 429);

  // Route: /services/{serviceId}[/resource]
  if (pathParts[0] !== 'services' || !pathParts[1]) {
    return error('Not found', 404);
  }

  const serviceId = pathParts[1];
  const resource = pathParts[2];
  const resourceId = pathParts[3];

  const graph = await getServiceGraph(supabase, serviceId, authResult.workspaceId!);
  if (!graph) return error('Service not found', 404);

  const service = graph.service as Record<string, unknown> | undefined;
  if (!service) return error('Invalid service data', 500);

  // GET /services/{id}
  if (!resource) {
    return json({
      id: service.id,
      name: service.name,
      description: service.description,
      journeyCount: Array.isArray(service.journeyIds) ? service.journeyIds.length : 0,
      updatedAt: service.updatedAt,
    });
  }

  // GET /services/{id}/journeys
  if (resource === 'journeys' && !resourceId) {
    const journeys = graph.journeys as Record<string, Record<string, unknown>> | undefined ?? {};
    const result = Object.values(journeys).map((j) => ({
      id: j.id,
      title: j.title ?? j.name,
      status: j.status,
      stageCount: Array.isArray(j.stageIds) ? j.stageIds.length : 0,
      updatedAt: j.updatedAt,
    }));
    return json({ journeys: result, total: result.length });
  }

  // GET /services/{id}/journeys/{journeyId}
  if (resource === 'journeys' && resourceId) {
    const journeys = graph.journeys as Record<string, Record<string, unknown>> | undefined ?? {};
    const journey = journeys[resourceId];
    if (!journey) return error('Journey not found', 404);

    const stages = graph.stages as Record<string, Record<string, unknown>> | undefined ?? {};
    const journeyStageIds = Array.isArray(journey.stageIds) ? journey.stageIds as string[] : [];
    const journeyStages = journeyStageIds.map((stageId) => {
      const stage = stages[stageId];
      if (!stage) return null;
      return {
        id: stage.id,
        title: stage.title,
        emotion: stage.emotion,
        touchpointCount: Array.isArray(stage.touchpointIds) ? stage.touchpointIds.length : 0,
        problemCount: Array.isArray(stage.problemIds) ? stage.problemIds.length : 0,
        opportunityCount: Array.isArray(stage.opportunityIds) ? stage.opportunityIds.length : 0,
      };
    }).filter(Boolean);

    return json({
      id: journey.id,
      title: journey.title ?? journey.name,
      status: journey.status,
      stages: journeyStages,
    });
  }

  // GET /services/{id}/research
  if (resource === 'research') {
    const research = graph.research as Record<string, unknown> | undefined ?? {};
    const sources = Object.values((research.sources as Record<string, unknown>) ?? {});
    const observations = Object.values((research.observations as Record<string, unknown>) ?? {});
    return json({
      sourceCount: sources.length,
      observationCount: observations.length,
      sources: sources.map((s: unknown) => {
        const src = s as Record<string, unknown>;
        return { id: src.id, title: src.title, type: src.type, date: src.date };
      }),
      observations: observations.map((o: unknown) => {
        const obs = o as Record<string, unknown>;
        return { id: obs.id, kind: obs.kind, text: obs.text, participant: obs.participant, observedAt: obs.observedAt };
      }),
    });
  }

  // GET /services/{id}/portfolio
  if (resource === 'portfolio') {
    const portfolio = (graph.service as Record<string, unknown>)?.improvementPortfolio as Record<string, unknown> | undefined;
    if (!portfolio) return json({ initiatives: [], total: 0 });

    const initiatives = Object.values((portfolio.initiatives as Record<string, unknown>) ?? {});
    return json({
      total: initiatives.length,
      initiatives: initiatives.map((i: unknown) => {
        const init = i as Record<string, unknown>;
        return {
          id: init.id,
          title: init.title,
          status: init.status,
          effort: init.effort,
          expectedImpact: init.expectedImpact,
          deliveryRisk: init.deliveryRisk,
          progress: init.progress,
          owner: init.owner,
          targetDate: init.targetDate,
        };
      }),
    });
  }

  return error('Not found', 404);
});
