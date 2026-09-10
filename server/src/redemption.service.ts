// server/src/redemption.service.ts
import { supabase } from "./services/supabase";
import { canonicalSku, getProductPointValue } from "./points.catalog";
import {
  createRedemptionCheckout,
  revokeDiscountNode,
} from "./shopify.service";

/** A user may hold at most this many un-consumed redemption codes at once. */
const MAX_ACTIVE_REDEMPTIONS = 1;

/** Hard ceiling on codes minted per user per rolling 24h, whatever their balance. */
const MAX_REDEMPTIONS_PER_DAY = 3;

export class RedemptionError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "RedemptionError";
  }
}

/**
 * Expire any of this user's codes whose window has closed, so a stale row does
 * not permanently block them from redeeming again.
 */
async function expireStaleRedemptions(userId: string): Promise<void> {
  const { error } = await supabase
    .from("point_redemptions")
    .update({ status: "expired" })
    .eq("user_id", userId)
    .eq("status", "issued")
    .lt("expires_at", new Date().toISOString());

  if (error) console.warn("[redemption] failed to expire stale rows:", error.message);
}

async function assertWithinLimits(userId: string): Promise<void> {
  await expireStaleRedemptions(userId);

  const { count: activeCount, error: activeErr } = await supabase
    .from("point_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "issued");

  if (activeErr) throw new RedemptionError("Could not check redemption status", 500);

  if ((activeCount ?? 0) >= MAX_ACTIVE_REDEMPTIONS) {
    throw new RedemptionError(
      "You already have an unused redemption. Finish or cancel that checkout first.",
      409
    );
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: dayCount, error: dayErr } = await supabase
    .from("point_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);

  if (dayErr) throw new RedemptionError("Could not check redemption status", 500);

  if ((dayCount ?? 0) >= MAX_REDEMPTIONS_PER_DAY) {
    throw new RedemptionError(
      "Daily redemption limit reached. Please try again tomorrow.",
      429
    );
  }
}

/**
 * Issue a checkout for a point redemption.
 *
 * `userId` MUST come from a verified JWT, never from the request body, and the
 * point cost is resolved from the server catalog rather than trusted from the
 * client.
 */
export async function issueRedemption(params: {
  userId: string;
  productSku: string;
  clientReportedPoints?: number;
}): Promise<{
  checkoutUrl: string;
  pointsUsed: number;
  productTitle: string;
  expiresAt: string;
  redemptionId: string;
}> {
  const sku = canonicalSku(params.productSku);
  const pointsRequired = getProductPointValue(sku);

  if (pointsRequired === 0) {
    throw new RedemptionError(`"${params.productSku}" is not redeemable with points`, 404);
  }

  // The client's balance is advisory until points move server-side, but a
  // client that self-reports too few points is definitely not eligible.
  if (
    typeof params.clientReportedPoints === "number" &&
    params.clientReportedPoints < pointsRequired
  ) {
    throw new RedemptionError(
      `Insufficient points. This item costs ${pointsRequired} points.`,
      402
    );
  }

  await assertWithinLimits(params.userId);

  const checkout = await createRedemptionCheckout({
    userId: params.userId,
    productSku: sku,
  });

  const { data, error } = await supabase
    .from("point_redemptions")
    .insert({
      user_id: params.userId,
      product_sku: sku,
      points_spent: pointsRequired,
      discount_code: checkout.discountCode,
      discount_node_id: checkout.discountNodeId,
      checkout_url: checkout.checkoutUrl,
      expires_at: checkout.expiresAt,
      status: "issued",
    })
    .select("id")
    .single();

  if (error || !data) {
    // Never hand out a code we failed to record.
    await revokeDiscountNode(checkout.discountNodeId);
    console.error("[redemption] failed to record redemption:", error);
    throw new RedemptionError("Could not create redemption. Please try again.", 500);
  }

  return {
    checkoutUrl: checkout.checkoutUrl,
    pointsUsed: checkout.pointsUsed,
    productTitle: checkout.productTitle,
    expiresAt: checkout.expiresAt,
    redemptionId: data.id,
  };
}

/** Mark a redemption consumed once the client observes checkout completion. */
export async function markRedemptionCompleted(
  userId: string,
  redemptionId: string
): Promise<void> {
  const { error } = await supabase
    .from("point_redemptions")
    .update({ status: "redeemed", redeemed_at: new Date().toISOString() })
    .eq("id", redemptionId)
    .eq("user_id", userId)
    .eq("status", "issued");

  if (error) throw new RedemptionError("Could not update redemption", 500);
}

/** Cancel an unused redemption and deactivate its Shopify code. */
export async function cancelRedemption(
  userId: string,
  redemptionId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("point_redemptions")
    .select("discount_node_id, status")
    .eq("id", redemptionId)
    .eq("user_id", userId)
    .single();

  if (error || !data) throw new RedemptionError("Redemption not found", 404);
  if (data.status !== "issued") return;

  if (data.discount_node_id) await revokeDiscountNode(data.discount_node_id);

  await supabase
    .from("point_redemptions")
    .update({ status: "revoked" })
    .eq("id", redemptionId)
    .eq("user_id", userId);
}
