import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.PUBLIC_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL ||
  'https://eitdawijfcvvcekcsrxm.supabase.co';

const supabaseKey =
  import.meta.env.PUBLIC_SUPABASE_API_KEY ||
  import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.PUBLIC_SUPABASE_KEY ||
  import.meta.env.SUPABASE_API_KEY ||
  import.meta.env.SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  '';

export const isConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  supabaseKey !== 'your_anon_public_key_here' &&
  supabaseKey !== 'placeholder-anon-key'
);

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export interface Profile {
  id: string;
  discord_id: string | null;
  username: string;
  avatar_url: string | null;
  role: 'player' | 'arbitrator' | 'admin';
  starting_region_id: string | null;
  created_at: string;
}

export interface RegionState {
  id: string;
  name: string;
  lore: string;
  claim_threshold: number;
  claimed_by_user_id: string | null;
  claimed_by_username?: string | null;
  claimed_by_avatar?: string | null;
  claimed_at: string | null;
  banner_color?: string | null;
  achievements_count?: number;
}

export interface Achievement {
  id: string;
  region_id: string;
  title: string;
  description: string;
  flavor_text?: string;
  points: number;
}

export interface Claim {
  id: string;
  user_id: string;
  achievement_id: string;
  region_id: string;
  status: 'pending' | 'approved' | 'rejected';
  match_notes?: string;
  reviewed_by?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  username?: string;
  avatar_url?: string;
  achievement_title?: string;
  region_name?: string;
}

export interface ActivityItem {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  region_id?: string;
  region_name?: string;
  achievement_title?: string;
  event_type: 'claim_approved' | 'region_conquered' | 'joined_campaign';
  message: string;
  created_at: string;
}

// Auth helpers
export async function signInWithDiscord(redirectTo?: string) {
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '/hobbit';
  const targetRedirect = redirectTo || currentUrl;
  
  return await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: targetRedirect,
      scopes: 'identify',
    },
  });
}

export async function signOut() {
  return await supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    // If profile row doesn't exist yet, construct from auth metadata
    const meta = user.user_metadata || {};
    const newProfile: Profile = {
      id: user.id,
      discord_id: meta.provider_id || meta.sub || null,
      username: meta.custom_claims?.global_name || meta.full_name || meta.name || user.email?.split('@')[0] || 'Commander',
      avatar_url: meta.avatar_url || null,
      role: 'player',
      starting_region_id: null,
      created_at: new Date().toISOString(),
    };

    if (isConfigured) {
      await supabase.from('profiles').upsert(newProfile);
    }
    return newProfile;
  }

  return data as Profile;
}

// Claim helpers
export async function submitClaim(params: {
  userId: string;
  achievementId: string;
  regionId: string;
  matchNotes: string;
}) {
  return await supabase.from('claims').insert({
    user_id: params.userId,
    achievement_id: params.achievementId,
    region_id: params.regionId,
    status: 'pending',
    match_notes: params.matchNotes,
  });
}

export async function approveClaim(claim: Claim) {
  const user = await getCurrentUser();
  const now = new Date().toISOString();

  // 1. Update claim status to approved
  const { error: claimErr } = await supabase
    .from('claims')
    .update({
      status: 'approved',
      reviewed_by: user?.id,
      reviewed_at: now,
    })
    .eq('id', claim.id);

  if (claimErr) throw claimErr;

  // 2. Count approved claims for this user in this region
  const { count } = await supabase
    .from('claims')
    .select('*', { count: 'exact', head: true })
    .eq('region_id', claim.region_id)
    .eq('user_id', claim.user_id)
    .eq('status', 'approved');

  // 3. Fetch region claim threshold
  const { data: region } = await supabase
    .from('regions')
    .select('*')
    .eq('id', claim.region_id)
    .single();

  const threshold = region?.claim_threshold || 2;
  const isConquered = (count || 0) >= threshold;

  // 4. If threshold reached and not yet claimed by this user, update territory controller!
  if (isConquered && region && region.claimed_by_user_id !== claim.user_id) {
    await supabase
      .from('regions')
      .update({
        claimed_by_user_id: claim.user_id,
        claimed_at: now,
      })
      .eq('id', claim.region_id);

    // Log conquest event
    await supabase.from('activity_feed').insert({
      user_id: claim.user_id,
      region_id: claim.region_id,
      event_type: 'region_conquered',
      message: `claimed ${region.name} after fulfilling ${count} MTG trials!`,
    });
  } else {
    // Log achievement event
    await supabase.from('activity_feed').insert({
      user_id: claim.user_id,
      region_id: claim.region_id,
      achievement_id: claim.achievement_id,
      event_type: 'claim_approved',
      message: `completed a trial in ${region?.name || 'Middle-Earth'}!`,
    });
  }

  return { isConquered };
}

export async function rejectClaim(claimId: string) {
  const user = await getCurrentUser();
  return await supabase
    .from('claims')
    .update({
      status: 'rejected',
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', claimId);
}
