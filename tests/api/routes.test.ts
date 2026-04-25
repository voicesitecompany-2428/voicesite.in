/**
 * API Route Tests — import route handlers directly, mock external dependencies.
 * No server is started; the handler functions are called with NextRequest objects.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mock declarations BEFORE importing the routes ─────────────────────────────

vi.mock('@/lib/verifyFirebaseToken', () => ({
  verifyFirebaseToken: vi.fn(),
}));

vi.mock('@/lib/supabase-server', () => {
  const mockFrom = vi.fn();
  const mockRpc = vi.fn();
  return {
    supabaseServer: {
      from: mockFrom,
      rpc: mockRpc,
    },
  };
});

// `import 'server-only'` blows up in vitest unless mocked away.
vi.mock('server-only', () => ({}));

vi.mock('openai', () => {
  const spy = vi.fn().mockResolvedValue({ data: [{ embedding: Array(1536).fill(0.1) }] });
  class MockOpenAI {
    embeddings = { create: spy };
    constructor(_opts?: unknown) {}
  }
  return { default: MockOpenAI };
});

vi.mock('@/lib/sarvamVision', () => ({
  imageToMenuText: vi.fn().mockResolvedValue(''),
}));

vi.mock('@/lib/menuExtractor', () => ({
  extractMenuItems: vi.fn().mockResolvedValue([]),
}));

// ── Import after mocks ─────────────────────────────────────────────────────────

import { verifyFirebaseToken } from '@/lib/verifyFirebaseToken';
import { supabaseServer } from '@/lib/supabase-server';
import { POST as subscriptionPost } from '@/app/api/subscription/update/route';
import { POST as onboardingPost } from '@/app/api/onboarding/complete/route';
import { POST as imagesMatchPost } from '@/app/api/images/match/route';

// ── Helpers ────────────────────────────────────────────────────────────────────

function jsonRequest(body: unknown, token?: string): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return new NextRequest(new URL('http://localhost/api/test'), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function mockVerify(uid: string | null) {
  vi.mocked(verifyFirebaseToken).mockResolvedValue(uid);
}

// ── 1. /api/subscription/update ──────────────────────────────────────────────

describe('POST /api/subscription/update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when Authorization header is missing', async () => {
    const req = new NextRequest(new URL('http://localhost/api/subscription/update'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planType: 'store', selectedPlan: 'base' }),
    });
    const res = await subscriptionPost(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/no token/i);
  });

  it('returns 401 when Firebase token is invalid', async () => {
    mockVerify(null);
    const req = jsonRequest({ planType: 'store', selectedPlan: 'base' }, 'bad-token');
    const res = await subscriptionPost(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/invalid token/i);
  });

  it('returns 400 when planType is missing', async () => {
    mockVerify('uid-123');
    const req = jsonRequest({ selectedPlan: 'base' }, 'good-token');
    const res = await subscriptionPost(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/planType/i);
  });

  it('returns 400 when selectedPlan is missing', async () => {
    mockVerify('uid-123');
    const req = jsonRequest({ planType: 'store' }, 'good-token');
    const res = await subscriptionPost(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/selectedPlan/i);
  });

  it('returns 400 when planType is not "store" or "menu"', async () => {
    mockVerify('uid-123');
    const req = jsonRequest({ planType: 'premium', selectedPlan: 'base' }, 'good-token');
    const res = await subscriptionPost(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/planType must be/i);
  });

  it('returns 400 when selectedPlan is invalid for store planType', async () => {
    mockVerify('uid-123');
    const req = jsonRequest({ planType: 'store', selectedPlan: 'menu_base' }, 'good-token');
    const res = await subscriptionPost(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid plan/i);
  });

  it('returns 400 when selectedPlan is invalid for menu planType', async () => {
    mockVerify('uid-123');
    const req = jsonRequest({ planType: 'menu', selectedPlan: 'pro' }, 'good-token');
    const res = await subscriptionPost(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid plan/i);
  });

  it('returns 404 when subscription record not found', async () => {
    mockVerify('uid-123');
    vi.mocked(supabaseServer.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
        }),
      }),
    } as any);

    const req = jsonRequest({ planType: 'store', selectedPlan: 'base' }, 'good-token');
    const res = await subscriptionPost(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/subscription not found/i);
  });

  it('returns 400 when current plan is still active', async () => {
    mockVerify('uid-123');
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    vi.mocked(supabaseServer.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'sub-1',
              store_plan: 'base',
              menu_plan: null,
              shop_limit: 1,
              menu_limit: 0,
              store_expires_at: futureDate,
              menu_expires_at: null,
            },
            error: null,
          }),
        }),
      }),
    } as any);

    const req = jsonRequest({ planType: 'store', selectedPlan: 'pro' }, 'good-token');
    const res = await subscriptionPost(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/still active/i);
  });

  it('returns 200 and updates subscription when plan is expired', async () => {
    mockVerify('uid-123');
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const mockInsert = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(supabaseServer.from).mockImplementation((table: string) => {
      if (table === 'user_subscriptions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'sub-1',
                  store_plan: 'base',
                  menu_plan: null,
                  shop_limit: 0,
                  menu_limit: 0,
                  store_expires_at: pastDate,
                  menu_expires_at: null,
                },
                error: null,
              }),
            }),
          }),
          update: mockUpdate,
        } as any;
      }
      if (table === 'billing_history') {
        return { insert: mockInsert } as any;
      }
      return {} as any;
    });

    const req = jsonRequest({ planType: 'store', selectedPlan: 'pro' }, 'good-token');
    const res = await subscriptionPost(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.plan).toBe('pro');
    expect(body.expiresAt).toBeTruthy();
  });
});

// ── 2. /api/onboarding/complete ───────────────────────────────────────────────

describe('POST /api/onboarding/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function formRequest(fields: Record<string, string>, token?: string): NextRequest {
    const formData = new FormData();
    for (const [key, val] of Object.entries(fields)) {
      formData.append(key, val);
    }
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return new NextRequest(new URL('http://localhost/api/onboarding/complete'), {
      method: 'POST',
      headers,
      body: formData,
    });
  }

  it('returns 401 when Authorization header is missing', async () => {
    const req = formRequest({ shopName: 'Test Cafe' });
    const res = await onboardingPost(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when token does not start with "Bearer "', async () => {
    const req = new NextRequest(new URL('http://localhost/api/onboarding/complete'), {
      method: 'POST',
      headers: { Authorization: 'Token abc' },
      body: new FormData(),
    });
    const res = await onboardingPost(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when Firebase token verification fails', async () => {
    mockVerify(null);
    const req = formRequest({ shopName: 'Test Cafe' }, 'bad');
    const res = await onboardingPost(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when shopName is missing', async () => {
    mockVerify('uid-123');
    const req = formRequest({}, 'good-token');
    const res = await onboardingPost(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/shop name/i);
  });

  it('creates site and returns siteSlug on valid request (no photos)', async () => {
    mockVerify('uid-123');

    const mockSiteInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'site-abc', slug: 'test-cafe' },
          error: null,
        }),
      }),
    });

    vi.mocked(supabaseServer.from).mockImplementation((table: string) => {
      if (table === 'sites') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          insert: mockSiteInsert,
        } as any;
      }
      if (table === 'profiles') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        } as any;
      }
      return {} as any;
    });

    const req = formRequest({ shopName: 'Test Cafe' }, 'good-token');
    const res = await onboardingPost(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.siteSlug).toBe('test-cafe');
    expect(body.itemCount).toBe(0);
  });
});

// ── 3. /api/images/match ─────────────────────────────────────────────────────

describe('POST /api/images/match', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null fields when query is empty string', async () => {
    const req = jsonRequest({ query: '' });
    const res = await imagesMatchPost(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.image_url).toBeNull();
    expect(body.similarity).toBeNull();
  });

  it('returns null fields when query is whitespace only', async () => {
    const req = jsonRequest({ query: '   ' });
    const res = await imagesMatchPost(req);
    const body = await res.json();
    expect(body.image_url).toBeNull();
  });

  it('returns null fields when body has no query field', async () => {
    const req = jsonRequest({});
    const res = await imagesMatchPost(req);
    const body = await res.json();
    expect(body.image_url).toBeNull();
  });

  it('returns image_url and similarity on a successful match', async () => {
    // OpenAI is mocked globally to return a fake embedding vector.
    // Wire up Supabase RPC to return a match.
    vi.mocked(supabaseServer as any).rpc = vi.fn().mockResolvedValue({
      data: [{
        image_url: 'https://test.supabase.co/storage/v1/object/public/default-images/pani-puri.jpg',
        description: 'Pani Puri',
        similarity: 0.78,
      }],
      error: null,
    });

    const req = jsonRequest({ query: 'pani puri' });
    const res = await imagesMatchPost(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.image_url).toBe(
      'https://test.supabase.co/storage/v1/object/public/default-images/pani-puri.jpg'
    );
    expect(body.similarity).toBe(0.78);
    expect(body.description).toBe('Pani Puri');
  });

  it('returns null gracefully when Supabase RPC returns an error', async () => {
    vi.mocked(supabaseServer as any).rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'rpc not found' },
    });

    const req = jsonRequest({ query: 'burger' });
    const res = await imagesMatchPost(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.image_url).toBeNull();
  });

  it('returns null gracefully when Supabase RPC returns no matches', async () => {
    vi.mocked(supabaseServer as any).rpc = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    const req = jsonRequest({ query: 'unknown exotic dish' });
    const res = await imagesMatchPost(req);
    const body = await res.json();
    expect(body.image_url).toBeNull();
  });
});
