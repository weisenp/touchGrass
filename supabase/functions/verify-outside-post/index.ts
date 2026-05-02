import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

type VerificationStatus = 'approved' | 'rejected' | 'needs_retry';

type VerifyBody = {
  selfiePath?: string;
  outsidePath?: string;
  caption?: string | null;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openRouterKey = Deno.env.get('OPENROUTER_API_KEY')!;
const openRouterModel = Deno.env.get('OPENROUTER_MODEL') ?? 'openai/gpt-4o-mini';
const appOrigin = Deno.env.get('APP_ORIGIN') ?? '*';

const corsHeaders = {
  'Access-Control-Allow-Origin': appOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (request.method !== 'POST') {
      return json({ status: 'needs_retry', reason: 'Use POST.' }, 405);
    }

    const authorization = request.headers.get('Authorization');
    if (!authorization) {
      return json({ status: 'needs_retry', reason: 'Missing authorization.' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: userData, error: userError } = await userClient.auth.getUser();

    if (userError || !userData.user) {
      return json({ status: 'needs_retry', reason: 'Invalid session.' }, 401);
    }

    const body = (await request.json()) as VerifyBody;
    if (!body.selfiePath || !body.outsidePath) {
      return json({ status: 'needs_retry', reason: 'Selfie and outside photos are required.' }, 400);
    }

    const userId = userData.user.id;
    const { data: profile } = await admin.from('profiles').select('id').eq('id', userId).maybeSingle();
    if (!profile) {
      return json({ status: 'needs_retry', reason: 'Create a username first.' }, 403);
    }

    const { data: cooldown } = await admin
      .from('post_cooldowns')
      .select('next_allowed_post_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (cooldown?.next_allowed_post_at && new Date(cooldown.next_allowed_post_at).getTime() > Date.now()) {
      return json({ status: 'needs_retry', reason: 'Post cooldown is still active.' }, 429);
    }

    const outsideUrl = publicUrl(admin, body.outsidePath);
    const selfieUrl = publicUrl(admin, body.selfiePath);
    const verification = await verifyOutside(outsideUrl);

    const { data: post, error: postError } = await admin
      .from('posts')
      .insert({
        author_id: userId,
        selfie_url: selfieUrl,
        outside_url: outsideUrl,
        caption: body.caption?.slice(0, 280) ?? null,
        verification_status: verification.status,
        verification_reason: verification.reason,
      })
      .select('id')
      .single();

    if (postError) {
      throw postError;
    }

    if (verification.status === 'approved') {
      const nextAllowed = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      const { error: rewardError } = await admin.rpc('grant_post_reward', {
        target_user_id: userId,
        target_next_allowed_at: nextAllowed,
      });
      if (rewardError) throw rewardError;
    }

    return json({ postId: post.id, status: verification.status, reason: verification.reason });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Verification failed.';
    return json({ status: 'needs_retry', reason: message }, 500);
  }
});

function publicUrl(admin: ReturnType<typeof createClient>, path: string) {
  return admin.storage.from('post-photos').getPublicUrl(path).data.publicUrl;
}

async function verifyOutside(imageUrl: string): Promise<{ status: VerificationStatus; reason: string }> {
  if (!openRouterKey) {
    return { status: 'needs_retry', reason: 'OpenRouter is not configured.' };
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openRouterKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': appOrigin === '*' ? 'http://localhost:5173' : appOrigin,
      'X-Title': 'TouchGrass',
    },
    body: JSON.stringify({
      model: openRouterModel,
      messages: [
        {
          role: 'system',
          content:
            'You verify whether a user photo is plausibly outdoors. Return only JSON with status approved, rejected, or needs_retry, and a short reason.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                'Approve only if the image clearly shows an outdoor environment such as sky, street, park, yard, nature, or exterior public space. Reject indoor rooms, screens, drawings, and unclear photos.',
            },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    return { status: 'needs_retry', reason: `OpenRouter error ${response.status}.` };
  }

  const payload = await response.json();
  const raw = payload.choices?.[0]?.message?.content ?? '{}';
  const parsed = safeJson(raw);
  const status = normalizeStatus(parsed.status);
  return {
    status,
    reason: typeof parsed.reason === 'string' ? parsed.reason.slice(0, 180) : defaultReason(status),
  };
}

function safeJson(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function normalizeStatus(value: unknown): VerificationStatus {
  if (value === 'approved' || value === 'rejected' || value === 'needs_retry') return value;
  return 'needs_retry';
}

function defaultReason(status: VerificationStatus) {
  if (status === 'approved') return 'Outdoor scene verified.';
  if (status === 'rejected') return 'The outside scene was not clear enough.';
  return 'Try again with a clearer outside photo.';
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
