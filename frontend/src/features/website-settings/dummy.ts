/**
 * Dummy backend routes for a website's store settings.
 *   GET   /websites/:id/store-settings
 *   PATCH /websites/:id/store-settings
 *
 * These handlers do not own any data. They read and write the records the Payments, Delivery,
 * Authentication and Storage sections own, from one website's point of view:
 *
 *   payments  `appliesTo` + `websiteIds`   ("all", or an explicit list)
 *   delivery  `websiteIds`                  (empty means every website)
 *   auth      `overrides[websiteId]`        (absent means the organisation default)
 *   storage   the website's own preference  (the bucket itself is organisation-wide)
 *
 * A method that ends up offered on no website is switched off, which is what that means, and keeps
 * the record valid for the section that owns it.
 */
import { db } from "@/lib/api/dummy/db";
import { notFound } from "@/lib/api/dummy/errors";
import { registerRoutes } from "@/lib/api/dummy/router";
import { nowIso } from "@/lib/api/dummy/utils";
import type { CustomerAuthDocument } from "@/features/customer-auth/types";
import type { DeliveryMethod } from "@/features/delivery/types";
import type { PaymentMethod } from "@/features/payments/types";
import type { StorageConfig } from "@/features/storage/types";
import type { Website } from "@/features/websites/types";
import type { StoreSettingsPatch, WebsiteStoreSettings } from "./types";

/** The dummy payment record keeps raw keys; the API shape masks them. */
type StoredPayment = PaymentMethod & { keyId?: string; keySecret?: string };

const websites = () => db.collection<Website>("websites");
const payments = () => db.collection<StoredPayment>("payment-methods");
const deliveries = () => db.collection<DeliveryMethod>("delivery-methods");
const authDoc = () => db.document<CustomerAuthDocument>("customer-auth");
const storageDoc = () => db.document<StorageConfig>("storage");

const paymentApplies = (m: StoredPayment, websiteId: string) => m.appliesTo === "all" || m.websiteIds.includes(websiteId);
const deliveryApplies = (m: DeliveryMethod, websiteId: string) => m.websiteIds.length === 0 || m.websiteIds.includes(websiteId);

/** Recomputes the set of websites a method is offered on after one website is toggled. */
function nextScope(current: string[], allIds: string[], websiteId: string, selected: boolean, enabled: boolean) {
  // Re-enabling a switched-off method from a website scopes it to that website alone.
  const base = enabled ? current : [];
  const set = new Set(base);
  if (selected) set.add(websiteId);
  else set.delete(websiteId);
  const ids = allIds.filter((id) => set.has(id));
  return { ids, everywhere: ids.length === allIds.length, none: ids.length === 0 };
}

async function readSettings(websiteId: string): Promise<WebsiteStoreSettings> {
  const site = (await websites()).find((w) => w.id === websiteId);
  if (!site) throw notFound("Website");

  const auth = await authDoc();
  const override = auth.overrides[websiteId] ?? null;
  const effective = override ?? auth.default;
  const storage = await storageDoc();

  return {
    websiteId,
    payments: (await payments()).map((m) => ({
      id: m.id,
      type: m.type,
      provider: m.provider,
      displayName: m.displayName,
      enabledGlobally: m.enabled,
      testMode: m.testMode,
      feePercent: m.feePercent,
      feeFixed: m.feeFixed,
      minOrder: m.minOrder,
      maxOrder: m.maxOrder,
      selected: m.enabled && paymentApplies(m, websiteId),
    })),
    delivery: (await deliveries()).map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
      carrier: m.carrier,
      minDays: m.minDays,
      maxDays: m.maxDays,
      rateType: m.rateType,
      price: m.price,
      freeAbove: m.freeAbove,
      coverage: m.coverage,
      enabledGlobally: m.enabled,
      selected: m.enabled && deliveryApplies(m, websiteId),
    })),
    auth: {
      overridden: override !== null,
      email: Boolean(effective?.email.enabled),
      google: Boolean(effective?.google.enabled),
      defaultEmail: Boolean(auth.default?.email.enabled),
      defaultGoogle: Boolean(auth.default?.google.enabled),
      googleConfigured: Boolean((effective ?? auth.default)?.google.clientId),
    },
    storage: {
      status: storage.status,
      provider: storage.provider,
      bucket: storage.bucket,
      useConnected: storage.status === "connected" && (site.storage ?? "connected") === "connected",
    },
  };
}

registerRoutes([
  {
    method: "GET",
    path: "/websites/:id/store-settings",
    handler: async ({ params }) => ({ data: await readSettings(params.id) }),
  },
  {
    method: "PATCH",
    path: "/websites/:id/store-settings",
    handler: async ({ params, body }) => {
      const all = await websites();
      const site = all.find((w) => w.id === params.id);
      if (!site) throw notFound("Website");
      const allIds = all.map((w) => w.id);
      const patch = (body ?? {}) as StoreSettingsPatch;

      if (patch.payment) {
        const method = (await payments()).find((m) => m.id === patch.payment!.id);
        if (!method) throw notFound("Payment method");
        const current = method.appliesTo === "all" ? allIds : method.websiteIds;
        const { ids, everywhere, none } = nextScope(current, allIds, site.id, patch.payment.selected, method.enabled);
        method.enabled = !none;
        method.appliesTo = everywhere || none ? "all" : "selected";
        method.websiteIds = everywhere || none ? [] : ids;
        method.updatedAt = nowIso();
      }

      if (patch.delivery) {
        const method = (await deliveries()).find((m) => m.id === patch.delivery!.id);
        if (!method) throw notFound("Delivery method");
        const current = method.websiteIds.length === 0 ? allIds : method.websiteIds;
        const { ids, everywhere, none } = nextScope(current, allIds, site.id, patch.delivery.selected, method.enabled);
        method.enabled = !none;
        method.websiteIds = everywhere || none ? [] : ids;
        method.updatedAt = nowIso();
      }

      if (patch.auth) {
        const doc = await authDoc();
        if (!patch.auth.overridden) {
          delete doc.overrides[site.id];
        } else {
          const base = doc.overrides[site.id] ?? doc.default;
          if (!base) throw notFound("Default customer sign-in settings");
          doc.overrides[site.id] = {
            ...base,
            email: { ...base.email, enabled: patch.auth.email ?? base.email.enabled },
            google: { ...base.google, enabled: patch.auth.google ?? base.google.enabled },
            updatedAt: nowIso(),
          };
        }
      }

      if (patch.storage) {
        site.storage = patch.storage.useConnected ? "connected" : "platform";
        site.updatedAt = nowIso();
      }

      return { data: await readSettings(site.id) };
    },
  },
]);

/**
 * What the template's own preview offers: everything switched on for the organisation, with no
 * website scoping, so the demo storefront shows a realistic checkout before any website exists.
 */
export async function previewStoreSettings(): Promise<WebsiteStoreSettings> {
  const auth = await authDoc();
  const storage = await storageDoc();
  return {
    websiteId: "preview",
    payments: (await payments())
      .filter((m) => m.enabled)
      .map((m) => ({
        id: m.id,
        type: m.type,
        provider: m.provider,
        displayName: m.displayName,
        enabledGlobally: true,
        testMode: m.testMode,
        feePercent: m.feePercent,
        feeFixed: m.feeFixed,
        minOrder: m.minOrder,
        maxOrder: m.maxOrder,
        selected: true,
      })),
    delivery: (await deliveries())
      .filter((m) => m.enabled)
      .map((m) => ({
        id: m.id,
        name: m.name,
        type: m.type,
        carrier: m.carrier,
        minDays: m.minDays,
        maxDays: m.maxDays,
        rateType: m.rateType,
        price: m.price,
        freeAbove: m.freeAbove,
        coverage: m.coverage,
        enabledGlobally: true,
        selected: true,
      })),
    auth: {
      overridden: false,
      email: Boolean(auth.default?.email.enabled),
      google: Boolean(auth.default?.google.enabled),
      defaultEmail: Boolean(auth.default?.email.enabled),
      defaultGoogle: Boolean(auth.default?.google.enabled),
      googleConfigured: Boolean(auth.default?.google.clientId),
    },
    storage: { status: storage.status, provider: storage.provider, bucket: storage.bucket, useConnected: storage.status === "connected" },
  };
}

export { readSettings };
