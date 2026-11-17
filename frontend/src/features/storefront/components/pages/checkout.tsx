"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Check, Mail, Minus, Package, Plus, Trash2, TriangleAlert, Truck } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDate, formatMoney } from "@/lib/format";
import type { CheckoutDeliveryOption, CheckoutPaymentOption, Order, OrderStage, SitePage } from "../../types";
import { num, str } from "../../settings";
import { cartTotals, deliveryPrice, estimatedShipping, useShop } from "../ShopContext";
import { Container, Price, SfButton, SfButtonLink, SfLink, inputClass } from "../ui";
import { Breadcrumbs } from "./catalog";

const DISCOUNT_CODE = "WELCOME10";

/** Clock reads and id generation stay outside components, so no render is impure. */
const nowIso = () => new Date().toISOString();
const newOrderNumber = () => `AUR-${Date.now().toString(36).slice(-6).toUpperCase()}`;
const addDays = (iso: string, days: number) => new Date(Date.parse(iso) + days * 86400000).toISOString();

const shippingSettings = (pages: SitePage[]) => {
  const cart = pages.find((p) => p.key === "cart");
  return {
    freeOver: num(cart?.settings ?? {}, "freeShippingOver", 2000),
    fee: num(cart?.settings ?? {}, "shippingFee", 99),
  };
};

/* ------------------------------ cart ------------------------------ */

export function CartPage({ page }: { page: SitePage }) {
  const { site, commerce, lines, setQty, removeLine, isEnabled } = useShop();
  const opts = shippingSettings(site.pages);
  const { detailed, subtotal } = cartTotals(lines, opts);
  const shipping = estimatedShipping(commerce, subtotal, opts);
  const total = subtotal + shipping;
  const checkoutOn = isEnabled("/checkout");

  return (
    <div className="py-10 lg:py-14">
      <Container>
        <Breadcrumbs trail={[{ label: "Home", to: "/" }, { label: page.title }]} />
        <h1 className="font-sf-display mt-5 mb-8 text-3xl text-sf-ink sm:text-4xl">{str(page.settings, "heading", "Your cart")}</h1>

        {detailed.length === 0 ? (
          <div className="rounded-sf border border-sf-line bg-sf-canvas px-6 py-16 text-center">
            <Package className="mx-auto size-8 text-sf-faint" aria-hidden />
            <p className="font-sf-display mt-4 text-xl text-sf-ink">Your cart is empty</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-sf-muted">{str(page.settings, "emptyMessage", "Nothing here yet.")}</p>
            <SfButtonLink to="/products" className="mt-7">Continue shopping</SfButtonLink>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[1fr_360px] lg:gap-14">
            <ul className="divide-y divide-sf-line border-y border-sf-line">
              {detailed.map((line) => (
                <li key={`${line.productId}-${line.variantId}`} className="flex gap-4 py-5">
                  <div className="relative size-24 shrink-0 overflow-hidden rounded-sf bg-sf-canvas">
                    <Image src={line.image} alt="" fill sizes="96px" className="object-cover" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-sf-ink">{line.name}</p>
                        <p className="mt-0.5 text-xs text-sf-muted">{line.variantLabel}</p>
                      </div>
                      <span className="text-sm font-medium text-sf-ink tabular-nums">{formatMoney(line.price * line.qty)}</span>
                    </div>
                    <div className="mt-auto flex items-center gap-4 pt-4">
                      <div className="flex h-9 items-center rounded-sf border border-sf-line">
                        <button type="button" className="px-2.5 text-sf-body" aria-label={`Decrease quantity of ${line.name}`} onClick={() => setQty(line.productId, line.variantId, line.qty - 1)}>
                          <Minus className="size-3.5" aria-hidden />
                        </button>
                        <span className="w-7 text-center text-sm tabular-nums">{line.qty}</span>
                        <button type="button" className="px-2.5 text-sf-body" aria-label={`Increase quantity of ${line.name}`} onClick={() => setQty(line.productId, line.variantId, line.qty + 1)}>
                          <Plus className="size-3.5" aria-hidden />
                        </button>
                      </div>
                      <button type="button" className="inline-flex items-center gap-1.5 text-xs text-sf-muted hover:text-sf-sale" onClick={() => removeLine(line.productId, line.variantId)}>
                        <Trash2 className="size-3.5" aria-hidden />
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-sf border border-sf-line bg-sf-canvas p-6">
                <h2 className="font-sf-display text-lg text-sf-ink">Order summary</h2>
                <dl className="mt-5 space-y-3 text-sm">
                  <Row label="Subtotal" value={formatMoney(subtotal)} />
                  <Row label="Estimated shipping" value={shipping === 0 ? "Free" : formatMoney(shipping)} />
                  <div className="border-t border-sf-line pt-3">
                    <Row label="Total" value={formatMoney(total)} strong />
                  </div>
                </dl>
                {shipping > 0 && commerce.delivery.length === 0 && (
                  <p className="mt-3 text-xs text-sf-muted">Spend {formatMoney(opts.freeOver - subtotal)} more for free delivery.</p>
                )}
                {commerce.delivery.length > 0 && <p className="mt-3 text-xs text-sf-muted">Delivery options are chosen at checkout.</p>}
                {checkoutOn ? (
                  <SfButtonLink to="/checkout" full size="lg" className="mt-6">
                    {str(page.settings, "checkoutLabel", "Proceed to checkout")}
                  </SfButtonLink>
                ) : (
                  <p className="mt-6 rounded-sf border border-sf-line bg-sf-paper p-3 text-xs text-sf-muted">Checkout is switched off for this website.</p>
                )}
                <SfLink to="/products" className="mt-4 block text-center text-sm text-sf-muted underline-offset-4 hover:underline">
                  Continue shopping
                </SfLink>
              </div>
            </aside>
          </div>
        )}
      </Container>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className={cn("text-sf-muted", strong && "font-medium text-sf-ink")}>{label}</dt>
      <dd className={cn("tabular-nums text-sf-ink", strong && "text-base font-medium")}>{value}</dd>
    </div>
  );
}

/* ------------------------------ checkout ------------------------------ */

interface CheckoutForm {
  name: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
}

const EMPTY_FORM: CheckoutForm = { name: "", email: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" };

const withinLimits = (option: CheckoutPaymentOption, subtotal: number) =>
  (option.minOrder === null || subtotal >= option.minOrder) && (option.maxOrder === null || subtotal <= option.maxOrder);

const limitReason = (option: CheckoutPaymentOption) =>
  option.minOrder !== null && option.maxOrder !== null
    ? `Orders between ${formatMoney(option.minOrder)} and ${formatMoney(option.maxOrder)}`
    : option.minOrder !== null
      ? `Orders over ${formatMoney(option.minOrder)}`
      : option.maxOrder !== null
        ? `Orders under ${formatMoney(option.maxOrder)}`
        : "";

export function CheckoutPage({ page }: { page: SitePage }) {
  const { site, commerce, lines, placeOrder, go, customer, isEnabled } = useShop();
  const opts = shippingSettings(site.pages);
  const [form, setForm] = useState<CheckoutForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutForm, string>>>({});
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const [codeError, setCodeError] = useState("");
  const [deliveryId, setDeliveryId] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  const { detailed, subtotal } = cartTotals(lines, opts);

  // Delivery and payment come from what this website offers (chosen per website in the editor).
  const delivery: CheckoutDeliveryOption | null = commerce.delivery.find((d) => d.id === deliveryId) ?? commerce.delivery[0] ?? null;
  const shipping = delivery ? deliveryPrice(delivery, subtotal) : estimatedShipping(commerce, subtotal, opts);

  const payable = useMemo(() => commerce.payments.filter((option) => withinLimits(option, subtotal)), [commerce.payments, subtotal]);
  const payment: CheckoutPaymentOption | null = payable.find((p) => p.id === paymentId) ?? payable[0] ?? null;
  const paymentFee = payment?.fee ?? 0;

  const discount = applied ? Math.round(subtotal * 0.1) : 0;
  const total = Math.max(0, subtotal + shipping + paymentFee - discount);
  const canOrder = payment !== null;
  const offersSignIn = commerce.signIn.email || commerce.signIn.google;

  if (detailed.length === 0) {
    return (
      <Container className="py-24 text-center">
        <p className="font-sf-display text-2xl text-sf-ink">Your cart is empty</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-sf-muted">Add something to it before checking out.</p>
        <SfButtonLink to="/products" className="mt-7">Browse products</SfButtonLink>
      </Container>
    );
  }

  const useSavedDetails = () => {
    if (!customer) return;
    setForm({ ...form, name: customer.name, email: customer.email, phone: customer.phone });
    setErrors({});
  };

  const validate = () => {
    const next: Partial<Record<keyof CheckoutForm, string>> = {};
    if (!form.name.trim()) next.name = "Enter your name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) next.email = "Enter a valid email address.";
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\s/g, ""))) next.phone = "Enter a 10-digit mobile number.";
    if (!form.line1.trim()) next.line1 = "Enter your address.";
    if (!form.city.trim()) next.city = "Enter your city.";
    if (!form.state.trim()) next.state = "Enter your state.";
    if (!/^\d{6}$/.test(form.pincode)) next.pincode = "Enter a 6-digit PIN code.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payment || !validate()) return;
    setPlacing(true);
    const placedAt = nowIso();
    const days = delivery ? Math.max(delivery.maxDays, 1) : 4;
    const order: Order = {
      number: newOrderNumber(),
      placedAt,
      customer: { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() },
      address: { line1: form.line1, line2: form.line2, city: form.city, state: form.state, pincode: form.pincode },
      lines: detailed,
      subtotal,
      shipping: shipping + paymentFee,
      discount,
      total,
      paymentMethod: payment.label,
      paymentType: payment.kind,
      shippingMethod: delivery ? `${delivery.name} (${delivery.daysLabel})` : "Standard delivery",
      stage: "placed",
      paymentStatus: payment.kind === "cod" ? "cod" : "pending",
      events: [{ stage: "placed", at: placedAt, note: "Order placed" }],
      estimatedDelivery: addDays(placedAt, days),
    };
    // The order exists before it is paid for, exactly as a real checkout would have it.
    window.setTimeout(() => {
      placeOrder(order);
      go(`/pay/${order.number}`);
    }, 500);
  };

  const field = (key: keyof CheckoutForm, label: string, extra?: { type?: string; placeholder?: string; optional?: boolean }) => (
    <div>
      <label htmlFor={`co-${key}`} className="text-xs font-medium tracking-wide text-sf-body uppercase">
        {label}
        {extra?.optional && <span className="ml-1 text-sf-faint normal-case">(optional)</span>}
      </label>
      <input
        id={`co-${key}`}
        type={extra?.type ?? "text"}
        placeholder={extra?.placeholder}
        className={cn(inputClass, "mt-1.5", errors[key] && "border-sf-sale")}
        value={form[key]}
        aria-invalid={errors[key] ? true : undefined}
        aria-describedby={errors[key] ? `co-${key}-err` : undefined}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
      {errors[key] && (
        <p id={`co-${key}-err`} className="mt-1 text-xs text-sf-sale">
          {errors[key]}
        </p>
      )}
    </div>
  );

  return (
    <div className="py-10 lg:py-14">
      <Container>
        <Breadcrumbs trail={[{ label: "Home", to: "/" }, { label: "Cart", to: "/cart" }, { label: page.title }]} />
        <h1 className="font-sf-display mt-5 mb-8 text-3xl text-sf-ink sm:text-4xl">{str(page.settings, "heading", "Checkout")}</h1>

        <form onSubmit={submit} className="grid gap-10 lg:grid-cols-[1fr_360px] lg:gap-14">
          <div className="space-y-10">
            {offersSignIn && (
              <section className="rounded-sf border border-sf-line bg-sf-canvas p-5">
                {customer ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="flex items-center gap-2 text-sm text-sf-body">
                      <Check className="size-4 text-sf-ok" aria-hidden />
                      Signed in as <span className="font-medium text-sf-ink">{customer.name}</span> ({customer.email})
                    </p>
                    <SfButton variant="outline" onClick={useSavedDetails}>
                      Use my saved details
                    </SfButton>
                  </div>
                ) : (
                  <>
                    <h2 className="font-sf-display text-lg text-sf-ink">Have an account?</h2>
                    <p className="mt-1 text-sm text-sf-muted">Sign in to check out faster and follow your orders.</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {isEnabled("/account/login") && (
                        <SfButton variant="outline" onClick={() => go("/account/login")}>
                          <Mail className="size-4" aria-hidden />
                          Sign in
                        </SfButton>
                      )}
                      {isEnabled("/account/register") && (
                        <SfButton variant="ghost" onClick={() => go("/account/register")}>
                          Create an account
                        </SfButton>
                      )}
                    </div>
                  </>
                )}
              </section>
            )}

            <section>
              <h2 className="font-sf-display text-lg text-sf-ink">Contact</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {field("name", "Full name")}
                {field("phone", "Mobile number", { placeholder: "98765 43210" })}
                <div className="sm:col-span-2">{field("email", "Email", { type: "email", placeholder: "you@example.in" })}</div>
              </div>
            </section>

            <section>
              <h2 className="font-sf-display text-lg text-sf-ink">Shipping address</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">{field("line1", "Address")}</div>
                <div className="sm:col-span-2">{field("line2", "Apartment, landmark", { optional: true })}</div>
                {field("city", "City")}
                {field("state", "State")}
                {field("pincode", "PIN code", { placeholder: "560001" })}
              </div>
            </section>

            <section>
              <h2 className="font-sf-display text-lg text-sf-ink">Delivery</h2>
              <div className="mt-4 space-y-3">
                {commerce.delivery.length === 0 ? (
                  <Choice
                    name="delivery"
                    value="standard"
                    checked
                    onChange={() => undefined}
                    label="Standard delivery"
                    hint="3–5 working days"
                    right={shipping === 0 ? "Free" : formatMoney(shipping)}
                  />
                ) : (
                  commerce.delivery.map((option) => {
                    const price = deliveryPrice(option, subtotal);
                    return (
                      <Choice
                        key={option.id}
                        name="delivery"
                        value={option.id}
                        checked={delivery?.id === option.id}
                        onChange={setDeliveryId}
                        label={option.name}
                        hint={`${option.daysLabel} · ${option.carrier}`}
                        mark={option.mark}
                        right={price === 0 ? "Free" : formatMoney(price)}
                      />
                    );
                  })
                )}
              </div>
            </section>

            <section>
              <h2 className="font-sf-display text-lg text-sf-ink">Payment</h2>
              {commerce.payments.length === 0 ? (
                <p className="mt-4 rounded-sf border border-sf-line bg-sf-canvas p-4 text-sm text-sf-body" role="status">
                  This store is not accepting orders just yet. Please check back shortly.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {commerce.payments.map((option) => {
                    const allowed = withinLimits(option, subtotal);
                    return (
                      <Choice
                        key={option.id}
                        name="payment"
                        value={option.id}
                        checked={payment?.id === option.id}
                        onChange={setPaymentId}
                        disabled={!allowed}
                        label={option.label}
                        hint={allowed ? option.hint : limitReason(option)}
                        mark={option.mark}
                        right={option.fee > 0 ? `+ ${formatMoney(option.fee)}` : undefined}
                      />
                    );
                  })}
                </div>
              )}
              <p className="mt-3 text-xs text-sf-faint">
                {payment?.testMode
                  ? "This payment method is in test mode. No money moves."
                  : "This is a demonstration store. No payment is taken and no card details are collected."}
              </p>
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-sf border border-sf-line bg-sf-canvas p-6">
              <h2 className="font-sf-display text-lg text-sf-ink">Order summary</h2>
              <ul className="mt-4 space-y-3 border-b border-sf-line pb-4">
                {detailed.map((line) => (
                  <li key={`${line.productId}-${line.variantId}`} className="flex items-center gap-3">
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-sf bg-sf-paper">
                      <Image src={line.image} alt="" fill sizes="48px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-sf-ink">{line.name}</p>
                      <p className="text-xs text-sf-muted">{line.variantLabel} · {line.qty}</p>
                    </div>
                    <span className="text-xs text-sf-ink tabular-nums">{formatMoney(line.price * line.qty)}</span>
                  </li>
                ))}
              </ul>

              <div className="border-b border-sf-line py-4">
                <label htmlFor="co-code" className="text-xs font-medium tracking-wide text-sf-body uppercase">Discount code</label>
                <div className="mt-1.5 flex gap-2">
                  <input id="co-code" className={inputClass} placeholder={DISCOUNT_CODE} value={code} onChange={(e) => setCode(e.target.value)} />
                  <SfButton
                    variant="outline"
                    className="shrink-0"
                    onClick={() => {
                      if (code.trim().toUpperCase() === DISCOUNT_CODE) {
                        setApplied(DISCOUNT_CODE);
                        setCodeError("");
                      } else {
                        setApplied(null);
                        setCodeError("That code is not valid.");
                      }
                    }}
                  >
                    Apply
                  </SfButton>
                </div>
                {applied && <p className="mt-2 text-xs text-sf-ok">{applied} applied — 10% off.</p>}
                {codeError && <p className="mt-2 text-xs text-sf-sale">{codeError}</p>}
              </div>

              <dl className="space-y-3 py-4 text-sm">
                <Row label="Subtotal" value={formatMoney(subtotal)} />
                <Row label={delivery ? delivery.name : "Shipping"} value={shipping === 0 ? "Free" : formatMoney(shipping)} />
                {paymentFee > 0 && <Row label={`${payment?.label ?? "Payment"} fee`} value={formatMoney(paymentFee)} />}
                {discount > 0 && <Row label="Discount" value={`− ${formatMoney(discount)}`} />}
                <div className="border-t border-sf-line pt-3">
                  <Row label="Total" value={formatMoney(total)} strong />
                </div>
              </dl>

              <SfButton type="submit" full size="lg" disabled={placing || !canOrder}>
                {placing ? "Placing order…" : str(page.settings, "placeOrderLabel", "Place order")}
              </SfButton>
              {!canOrder && commerce.payments.length > 0 && (
                <p className="mt-3 text-center text-xs text-sf-sale">No payment method covers this order value.</p>
              )}
              {str(page.settings, "note") && canOrder && <p className="mt-3 text-center text-xs text-sf-faint">{str(page.settings, "note")}</p>}
            </div>
          </aside>
        </form>
      </Container>
    </div>
  );
}

function Choice({
  name,
  value,
  checked,
  onChange,
  label,
  hint,
  right,
  mark,
  disabled,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  label: string;
  hint: string;
  right?: string;
  mark?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-3 rounded-sf border p-4 transition-colors",
        disabled ? "cursor-not-allowed border-sf-line opacity-55" : "cursor-pointer",
        checked && !disabled ? "border-sf-ink bg-sf-canvas" : !disabled && "border-sf-line hover:border-sf-ink",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="size-4 accent-[var(--color-sf-primary)]"
      />
      {mark && (
        <span className="relative h-8 w-12 shrink-0 overflow-hidden rounded-sf border border-sf-line bg-sf-paper">
          <Image src={mark} alt="" fill sizes="48px" className="object-contain p-0.5" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-sf-ink">{label}</span>
        <span className="block text-xs text-sf-muted">{hint}</span>
      </span>
      {right && <span className="text-sm text-sf-ink tabular-nums">{right}</span>}
    </label>
  );
}

/* ------------------------------ order confirmation ------------------------------ */

export const STAGES: { key: OrderStage; label: string; hint: string }[] = [
  { key: "placed", label: "Order placed", hint: "We have your order" },
  { key: "confirmed", label: "Confirmed", hint: "Payment method accepted" },
  { key: "processing", label: "Processing", hint: "Being packed at the workshop" },
  { key: "shipped", label: "Shipped", hint: "Handed to the courier" },
  { key: "delivered", label: "Delivered", hint: "Left with you" },
];

export function OrderPage({ page, orderNumber }: { page: SitePage; orderNumber: string }) {
  const { orderByNumber, isEnabled } = useShop();
  const order = orderByNumber(orderNumber);
  const unpaid = order ? order.paymentStatus === "pending" || order.paymentStatus === "failed" : false;

  if (!order) {
    return (
      <Container className="py-24 text-center">
        <p className="font-sf-display text-2xl text-sf-ink">We couldn’t find order {orderNumber}</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-sf-muted">Orders placed in this demo are kept in this browser. Place an order to see the confirmation.</p>
        <SfButtonLink to="/products" className="mt-7">Browse products</SfButtonLink>
      </Container>
    );
  }

  return (
    <div className="py-10 lg:py-14">
      <Container className="max-w-3xl">
        <div className="rounded-sf border border-sf-line bg-sf-canvas p-8 text-center">
          {unpaid ? (
            <>
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-sf-sale text-white">
                <TriangleAlert className="size-6" aria-hidden />
              </span>
              <h1 className="font-sf-display mt-5 text-2xl text-sf-ink sm:text-3xl">
                {order.paymentStatus === "failed" ? "Your payment didn’t go through" : "Your order is waiting for payment"}
              </h1>
              <p className="mx-auto mt-3 max-w-md text-sm text-sf-muted">
                We are holding these items for you. Finish the payment and we will start packing.
              </p>
            </>
          ) : (
            <>
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-sf-ok text-white">
                <Check className="size-6" aria-hidden />
              </span>
              <h1 className="font-sf-display mt-5 text-2xl text-sf-ink sm:text-3xl">{str(page.settings, "heading", "Thank you, your order is confirmed")}</h1>
              <p className="mx-auto mt-3 max-w-md text-sm text-sf-muted">{str(page.settings, "message")}</p>
            </>
          )}
          <p className="mt-5 inline-flex items-center gap-2 rounded-sf border border-sf-line bg-sf-paper px-4 py-2 text-sm">
            <span className="text-sf-muted">Order number</span>
            <span className="font-medium text-sf-ink">{order.number}</span>
          </p>
          {unpaid && (
            <div className="mt-5">
              <SfButtonLink to={`/pay/${order.number}`} size="lg">
                Complete payment
              </SfButtonLink>
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <section>
            <h2 className="text-xs font-medium tracking-wide text-sf-body uppercase">Delivering to</h2>
            <address className="mt-3 text-sm leading-relaxed text-sf-body not-italic">
              {order.customer.name}
              <br />
              {order.address.line1}
              {order.address.line2 ? <><br />{order.address.line2}</> : null}
              <br />
              {order.address.city}, {order.address.state} {order.address.pincode}
              <br />
              {order.customer.phone}
            </address>
          </section>
          <section>
            <h2 className="text-xs font-medium tracking-wide text-sf-body uppercase">Delivery</h2>
            <p className="mt-3 text-sm text-sf-body">
              {order.shippingMethod}
              <br />
              Estimated {formatDate(order.estimatedDelivery)}
              <br />
              {order.paymentStatus === "cod" ? `${order.paymentMethod} · ${formatMoney(order.total)} due on delivery` : `Paid by ${order.paymentMethod}`}
            </p>
          </section>
        </div>

        <section className="mt-8 border-t border-sf-line pt-6">
          <h2 className="text-xs font-medium tracking-wide text-sf-body uppercase">Items</h2>
          <ul className="mt-4 divide-y divide-sf-line">
            {order.lines.map((line) => (
              <li key={`${line.productId}-${line.variantId}`} className="flex items-center gap-4 py-4">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-sf bg-sf-canvas">
                  <Image src={line.image} alt="" fill sizes="64px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-sf-ink">{line.name}</p>
                  <p className="text-xs text-sf-muted">{line.variantLabel} · Qty {line.qty}</p>
                </div>
                <Price price={line.price * line.qty} />
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-3 border-t border-sf-line pt-4 text-sm">
            <Row label="Subtotal" value={formatMoney(order.subtotal)} />
            <Row label="Shipping" value={order.shipping === 0 ? "Free" : formatMoney(order.shipping)} />
            {order.discount > 0 && <Row label="Discount" value={`− ${formatMoney(order.discount)}`} />}
            <div className="border-t border-sf-line pt-3">
              <Row label="Total" value={formatMoney(order.total)} strong />
            </div>
          </dl>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          {isEnabled("/track-order") && <SfButtonLink to="/track-order">Track order</SfButtonLink>}
          <SfButtonLink to="/products" variant="outline">Continue shopping</SfButtonLink>
        </div>
      </Container>
    </div>
  );
}

/* ------------------------------ track order ------------------------------ */

const SAMPLE_NUMBER = "AUR-DEMO01";

/** A canned order so the tracking page has something to show before anyone has bought anything. */
const SAMPLE_ORDER: Order = {
  number: SAMPLE_NUMBER,
  placedAt: "2026-11-08T09:20:00Z",
  customer: { name: "Demo shopper", email: "demo@example.in", phone: "9800000000" },
  address: { line1: "221B Residency Road", line2: "", city: "Bengaluru", state: "Karnataka", pincode: "560025" },
  lines: [],
  subtotal: 4290,
  shipping: 0,
  discount: 0,
  total: 4290,
  paymentMethod: "UPI",
  paymentType: "upi",
  shippingMethod: "Standard delivery (3–5 working days)",
  stage: "shipped",
  paymentStatus: "paid",
  events: [
    { stage: "placed", at: "2026-11-08T09:20:00Z", note: "Order placed" },
    { stage: "confirmed", at: "2026-11-08T09:21:00Z", note: "Paid by UPI" },
    { stage: "processing", at: "2026-11-09T05:40:00Z", note: "Packed at the workshop" },
    { stage: "shipped", at: "2026-11-10T11:05:00Z", note: "Handed to Delhivery · AWB 7731904412" },
  ],
  estimatedDelivery: "2026-11-13T09:20:00Z",
};

export function TrackOrderPage({ page }: { page: SitePage }) {
  const { orders, orderByNumber, updateOrder, customer, isEnabled } = useShop();
  const [number, setNumber] = useState("");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [tracking, setTracking] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Read the order back from state each render, so advancing it updates the timeline immediately.
  const order = tracking ? (tracking === SAMPLE_NUMBER ? SAMPLE_ORDER : (orderByNumber(tracking) ?? null)) : null;
  const stageIndex = order ? STAGES.findIndex((s) => s.key === order.stage) : -1;
  const nextStage = stageIndex >= 0 && stageIndex < STAGES.length - 1 ? STAGES[stageIndex + 1] : null;
  const unpaid = order ? order.paymentStatus === "pending" || order.paymentStatus === "failed" : false;

  const track = (e: React.FormEvent) => {
    e.preventDefault();
    const wanted = number.trim().toUpperCase();
    const found = wanted === SAMPLE_NUMBER ? SAMPLE_ORDER : orderByNumber(wanted);
    if (!found) {
      setTracking(null);
      setError(`We couldn’t find order ${wanted}. Orders placed in this demo are kept in this browser — try ${SAMPLE_NUMBER}.`);
      return;
    }
    setError("");
    setTracking(found.number);
  };

  const advance = () => {
    if (!order || !nextStage || order.number === SAMPLE_NUMBER) return;
    updateOrder(order.number, {
      stage: nextStage.key,
      events: [...order.events, { stage: nextStage.key, at: new Date().toISOString(), note: nextStage.hint }],
    });
  };

  return (
    <div className="py-10 lg:py-14">
      <Container className="max-w-2xl">
        <Breadcrumbs trail={[{ label: "Home", to: "/" }, { label: page.title }]} />
        <h1 className="font-sf-display mt-5 text-3xl text-sf-ink sm:text-4xl">{str(page.settings, "heading", "Track your order")}</h1>
        {str(page.settings, "intro") && <p className="mt-2 text-sm text-sf-muted">{str(page.settings, "intro")}</p>}

        <form onSubmit={track} className="mt-8 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="tr-number" className="text-xs font-medium tracking-wide text-sf-body uppercase">Order number</label>
            <input id="tr-number" required className={cn(inputClass, "mt-1.5")} placeholder={SAMPLE_NUMBER} value={number} onChange={(e) => setNumber(e.target.value)} />
          </div>
          <div>
            <label htmlFor="tr-email" className="text-xs font-medium tracking-wide text-sf-body uppercase">Email</label>
            <input id="tr-email" type="email" required className={cn(inputClass, "mt-1.5")} placeholder="you@example.in" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
            <SfButton type="submit">Track order</SfButton>
            {orders[0] && (
              <button
                type="button"
                className="text-sm text-sf-muted underline underline-offset-4"
                onClick={() => {
                  setNumber(orders[0].number);
                  setEmail(orders[0].customer.email);
                }}
              >
                Use my last order
              </button>
            )}
            <button type="button" className="text-sm text-sf-muted underline underline-offset-4" onClick={() => setNumber(SAMPLE_NUMBER)}>
              Use the sample order
            </button>
          </div>
        </form>

        {error && <p className="mt-6 rounded-sf border border-sf-line bg-sf-canvas p-4 text-sm text-sf-sale">{error}</p>}

        {order && (
          <section className="mt-10 rounded-sf border border-sf-line p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sf-line pb-4">
              <div>
                <p className="text-sm font-medium text-sf-ink">{order.number}</p>
                <p className="text-xs text-sf-muted">
                  Placed {formatDate(order.placedAt)} · {formatMoney(order.total)} · {order.paymentStatus === "cod" ? "Cash on delivery" : order.paymentMethod}
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-sf bg-sf-canvas px-3 py-1.5 text-xs text-sf-ink">
                <Truck className="size-4" aria-hidden />
                {order.stage === "delivered" ? `Delivered ${formatDate(order.events[order.events.length - 1]?.at ?? order.estimatedDelivery)}` : `Estimated ${formatDate(order.estimatedDelivery)}`}
              </span>
            </div>

            {unpaid && (
              <p className="mt-4 flex flex-wrap items-center gap-3 rounded-sf border border-sf-line bg-sf-canvas p-3 text-sm text-sf-sale">
                This order has not been paid for yet.
                <SfButtonLink to={`/pay/${order.number}`} size="sm">Complete payment</SfButtonLink>
              </p>
            )}

            <ol className="mt-6 space-y-6">
              {STAGES.map((stage, i) => {
                const done = i <= stageIndex;
                const event = [...order.events].reverse().find((e) => e.stage === stage.key);
                return (
                  <li key={stage.key} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border", done ? "border-sf-ok bg-sf-ok text-white" : "border-sf-line text-sf-faint")}>
                        {done ? <Check className="size-4" aria-hidden /> : <span className="size-1.5 rounded-full bg-current" />}
                      </span>
                      {i < STAGES.length - 1 && <span className={cn("mt-1 w-px flex-1", done ? "bg-sf-ok" : "bg-sf-line")} />}
                    </div>
                    <div className="pb-1">
                      <p className={cn("text-sm font-medium", done ? "text-sf-ink" : "text-sf-faint")}>{stage.label}</p>
                      <p className="text-xs text-sf-muted">{event?.note ?? stage.hint}</p>
                      {event && <p className="mt-0.5 text-xs text-sf-faint">{formatDate(event.at)}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>

            {nextStage && order.number !== SAMPLE_NUMBER && !unpaid && (
              <div className="mt-6 border-t border-sf-line pt-4">
                <p className="text-xs text-sf-faint">
                  Demonstration control: in a real store the courier’s updates arrive on their own.
                </p>
                <SfButton variant="ghost" size="sm" className="mt-2" onClick={advance}>
                  Move to “{nextStage.label}”
                </SfButton>
              </div>
            )}

            {isEnabled("/account") && customer && (
              <SfLink to="/account" className="mt-6 inline-block text-sm text-sf-muted underline underline-offset-4">
                See all your orders
              </SfLink>
            )}
          </section>
        )}
      </Container>
    </div>
  );
}
