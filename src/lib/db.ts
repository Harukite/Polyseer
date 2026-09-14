/**
 * Unified database interface that switches between Supabase (valyu mode)
 * and SQLite (self-hosted mode) based on NEXT_PUBLIC_APP_MODE
 */

import { createClient as createSupabaseClient } from "@/utils/supabase/server";
import { getLocalDb, DEV_USER_ID } from "./local-db/client";
import { getDevUser, isSelfHostedMode } from "./local-db/local-auth";
import { eq, desc } from "drizzle-orm";
import * as schema from "./local-db/schema";

// ============================================================================
// AUTH FUNCTIONS
// ============================================================================

export async function getUser() {
  if (isSelfHostedMode()) {
    return { data: { user: getDevUser() }, error: null };
  }

  const supabase = await createSupabaseClient();
  return await supabase.auth.getUser();
}

export async function getSession() {
  if (isSelfHostedMode()) {
    return {
      data: {
        session: {
          user: getDevUser(),
          access_token: "dev-access-token",
        },
      },
      error: null,
    };
  }

  const supabase = await createSupabaseClient();
  return await supabase.auth.getSession();
}

// ============================================================================
// USER FUNCTIONS
// ============================================================================

export async function getUserById(userId: string) {
  if (isSelfHostedMode()) {
    const db = getLocalDb();
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });
    return { data: user || null, error: null };
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  return { data, error };
}

export async function upsertUser(userData: {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  valyu_sub?: string;
  valyu_user_type?: string;
  valyu_organisation_id?: string;
  valyu_organisation_name?: string;
}) {
  if (isSelfHostedMode()) {
    const db = getLocalDb();
    const existing = await db.query.users.findFirst({
      where: eq(schema.users.id, userData.id),
    });

    if (existing) {
      await db
        .update(schema.users)
        .set({
          email: userData.email,
          fullName: userData.full_name,
          avatarUrl: userData.avatar_url,
          valyuSub: userData.valyu_sub,
          valyuUserType: userData.valyu_user_type,
          valyuOrganisationId: userData.valyu_organisation_id,
          valyuOrganisationName: userData.valyu_organisation_name,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userData.id));
    } else {
      await db.insert(schema.users).values({
        id: userData.id,
        email: userData.email,
        fullName: userData.full_name,
        avatarUrl: userData.avatar_url,
        valyuSub: userData.valyu_sub,
        valyuUserType: userData.valyu_user_type,
        valyuOrganisationId: userData.valyu_organisation_id,
        valyuOrganisationName: userData.valyu_organisation_name,
      });
    }

    return { error: null };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("users").upsert(userData);
  return { error };
}

// ============================================================================
// FEATURED MARKETS FUNCTIONS
// ============================================================================

export async function getFeaturedMarkets() {
  if (isSelfHostedMode()) {
    const db = getLocalDb();
    const markets = await db.query.featuredMarkets.findMany({
      where: eq(schema.featuredMarkets.isActive, true),
      orderBy: [desc(schema.featuredMarkets.volume)],
      limit: 4,
    });

    // Transform to match Supabase format
    return {
      data: markets.map((m) => ({
        id: m.id,
        slug: m.slug,
        question: m.question,
        category: m.category,
        polymarket_url: m.polymarketUrl,
        market_url: m.marketUrl,
        platform: m.platform,
        volume: m.volume,
        end_date: m.endDate?.toISOString(),
        current_odds: m.currentOdds ? JSON.parse(m.currentOdds) : null,
        sort_order: m.sortOrder,
        is_active: m.isActive,
      })),
      error: null,
    };
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("featured_markets")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("volume", { ascending: false })
    .limit(4);

  return { data, error };
}

export async function updateFeaturedMarkets(
  markets: Array<{
    slug: string;
    question: string;
    polymarket_url: string;
    market_url: string;
    volume: number;
    end_date: string;
    current_odds: any;
    sort_order: number;
    platform: string;
    is_active: boolean;
  }>
) {
  if (isSelfHostedMode()) {
    const db = getLocalDb();

    // Delete all existing featured markets
    await db.delete(schema.featuredMarkets);

    // Insert new markets
    if (markets.length > 0) {
      await db.insert(schema.featuredMarkets).values(
        markets.map((m) => ({
          slug: m.slug,
          question: m.question,
          polymarketUrl: m.polymarket_url,
          marketUrl: m.market_url,
          volume: m.volume,
          endDate: new Date(m.end_date),
          currentOdds: JSON.stringify(m.current_odds),
          sortOrder: m.sort_order,
          platform: m.platform,
          isActive: m.is_active,
        }))
      );
    }

    return { error: null };
  }

  const supabase = await createSupabaseClient();

  // Delete all existing
  await supabase.from("featured_markets").delete().neq("id", 0);

  // Insert new
  if (markets.length > 0) {
    const { error } = await supabase.from("featured_markets").insert(markets);
    return { error };
  }

  return { error: null };
}

// ============================================================================
// DEV MODE HELPERS
// ============================================================================

export { isSelfHostedMode, DEV_USER_ID };
