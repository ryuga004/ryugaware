"use client";

import { useState } from "react";
import { Check, CreditCard, Smartphone, TriangleAlert, Truck } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { str } from "../../settings";
import type { Order, SitePage } from "../../types";
import { useShop } from "../ShopContext";
import { Container, SfButton, SfButtonLink, inputClass } from "../ui";

const nowIso = () => new Date().toISOString();

/** Test values, printed on the page so the flow can be walked through without guessing. */
const TEST_CARD = "4111 1111 1111 1111";
const TEST_VPA = "shopper@okhdfc";

/**
 * The payment step between placing an order and confirming it.
 *
 * The order already exists and is unpaid; paying moves it to confirmed. Nothing here talks to a
 * gateway — a real build would redirect to the provider configured in the Payments section and
 * come back to this route with the result.
 */
export function PaymentPage({ page, orderNumber }: { page: SitePage; orderNumber: string }) {
  const { orderByNumber, updateOrder, go } = useShop();
  const order = orderByNumber(orderNumber);
  const [vpa, setVpa] = useState(TEST_VPA);
  const [card, setCard] = useState({ number: "", expiry: "", cvv: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!order) {
    return (
      <Container className="py-24 text-center">
        <p className="font-sf-display text-2xl text-sf-ink">We couldn’t find that order</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-sf-muted">Orders placed in this demo are kept in this browser.</p>
        <SfButtonLink to="/products" className="mt-7">Browse products</SfButtonLink>
      </Container>
    );
  }

  if (order.paymentStatus === "paid" || order.paymentStatus === "cod") {
    return (
      <Container className="max-w-xl py-24 text-center">
        <p className="font-sf-display text-2xl text-sf-ink">This order is already confirmed</p>
        <p className="mt-2 text-sm text-sf-muted">Order {order.number} · {formatMoney(order.total)}</p>
        <SfButtonLink to={`/orders/${order.number}`} className="mt-7">View your order</SfButtonLink>
      </Container>
    );
  }

  const settle = (note: string) => {
    setBusy(true);
    const at = nowIso();
    window.setTimeout(() => {
      updateOrder(order.number, {
        paymentStatus: order.paymentType === "cod" ? "cod" : "paid",
        stage: "confirmed",
        events: [...order.events, { stage: "confirmed", at, note }],
      });
      go(`/orders/${order.number}`);
    }, 900);
  };

  const decline = (message: string) => {
    updateOrder(order.number, {
      paymentStatus: "failed",
      events: [...order.events, { stage: "placed", at: nowIso(), note: `Payment declined · ${message}` }],
    });
    setError(message);
  };

  const payByCard = () => {
    const digits = card.number.replace(/\s/g, "");
    if (digits.length !== 16) return setError("Enter the 16 digits of your card.");
    if (!/^\d{2}\/\d{2}$/.test(card.expiry)) return setError("Enter the expiry as MM/YY.");
    if (!/^\d{3}$/.test(card.cvv)) return setError("Enter the 3-digit CVV.");
    setError("");
    if (digits.endsWith("0000")) return decline("Your bank declined the card.");
    settle(`Paid by ${order.paymentMethod}`);
  };

  return (
    <div className="py-10 lg:py-14">
      <Container className="grid max-w-4xl gap-10 lg:grid-cols-[1fr_300px]">
        <div>
          <h1 className="font-sf-display text-3xl text-sf-ink sm:text-4xl">{str(page.settings, "heading", "Complete your payment")}</h1>
          <p className="mt-2 text-sm text-sf-muted">
            Order {order.number} · paying by {order.paymentMethod}
          </p>

          {error && (
            <p role="alert" className="mt-6 flex items-start gap-2 rounded-sf border border-sf-line bg-sf-canvas p-4 text-sm text-sf-sale">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}

          <div className="mt-7 rounded-sf border border-sf-line p-6">
            {order.paymentType === "cod" ? (
              <div className="text-center">
                <Truck className="mx-auto size-8 text-sf-muted" aria-hidden />
                <p className="font-sf-display mt-4 text-xl text-sf-ink">Nothing to pay now</p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-sf-muted">
                  Keep {formatMoney(order.total)} ready for the courier when your order arrives.
                </p>
                <SfButton className="mt-6" size="lg" disabled={busy} onClick={() => settle("Cash on delivery confirmed")}>
                  {busy ? "Confirming…" : "Confirm order"}
                </SfButton>
              </div>
            ) : order.paymentType === "upi" ? (
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-sf-ink">
                  <Smartphone className="size-4" aria-hidden />
                  Pay by UPI
                </p>
                <p className="mt-2 text-sm text-sf-muted">We will send a collect request for {formatMoney(order.total)} to your UPI app.</p>
                <label htmlFor="pay-vpa" className="mt-5 block text-xs font-medium tracking-wide text-sf-body uppercase">
                  Your UPI ID
                </label>
                <input id="pay-vpa" className={cn(inputClass, "mt-1.5 max-w-sm")} value={vpa} onChange={(e) => setVpa(e.target.value)} />
                <div className="mt-6 flex flex-wrap gap-3">
                  <SfButton size="lg" disabled={busy || !vpa.includes("@")} onClick={() => settle(`Paid by UPI · ${vpa}`)}>
                    {busy ? "Waiting for your app…" : `Pay ${formatMoney(order.total)}`}
                  </SfButton>
                  <SfButton variant="ghost" disabled={busy} onClick={() => decline("The request timed out in your UPI app.")}>
                    Simulate a failed payment
                  </SfButton>
                </div>
              </div>
            ) : (
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-sf-ink">
                  <CreditCard className="size-4" aria-hidden />
                  Card details
                </p>
                <div className="mt-5 grid max-w-sm gap-4">
                  <div>
                    <label htmlFor="pay-card" className="text-xs font-medium tracking-wide text-sf-body uppercase">Card number</label>
                    <input
                      id="pay-card"
                      inputMode="numeric"
                      placeholder={TEST_CARD}
                      className={cn(inputClass, "mt-1.5 font-mono")}
                      value={card.number}
                      onChange={(e) => setCard({ ...card, number: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="pay-exp" className="text-xs font-medium tracking-wide text-sf-body uppercase">Expiry</label>
                      <input id="pay-exp" placeholder="09/29" className={cn(inputClass, "mt-1.5 font-mono")} value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} />
                    </div>
                    <div>
                      <label htmlFor="pay-cvv" className="text-xs font-medium tracking-wide text-sf-body uppercase">CVV</label>
                      <input id="pay-cvv" inputMode="numeric" maxLength={3} placeholder="123" className={cn(inputClass, "mt-1.5 font-mono")} value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} />
                    </div>
                  </div>
                </div>
                <SfButton size="lg" className="mt-6" disabled={busy} onClick={payByCard}>
                  {busy ? "Authorising…" : `Pay ${formatMoney(order.total)}`}
                </SfButton>
                <p className="mt-4 text-xs text-sf-faint">
                  Demo card {TEST_CARD} is approved. Any card ending 0000 is declined.
                </p>
              </div>
            )}
          </div>

          {str(page.settings, "note") && <p className="mt-4 text-xs text-sf-faint">{str(page.settings, "note")}</p>}
        </div>

        <aside>
          <div className="rounded-sf border border-sf-line bg-sf-canvas p-5">
            <h2 className="font-sf-display text-lg text-sf-ink">What you are paying for</h2>
            <ul className="mt-4 space-y-2 border-b border-sf-line pb-4 text-sm">
              {order.lines.map((line) => (
                <li key={`${line.productId}-${line.variantId}`} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate text-sf-body">
                    {line.name} <span className="text-sf-muted">× {line.qty}</span>
                  </span>
                  <span className="tabular-nums text-sf-ink">{formatMoney(line.price * line.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between pt-4 text-sm">
              <span className="font-medium text-sf-ink">Total</span>
              <span className="font-medium text-sf-ink tabular-nums">{formatMoney(order.total)}</span>
            </div>
            <p className="mt-4 flex items-start gap-2 text-xs text-sf-muted">
              <Check className="mt-0.5 size-3.5 shrink-0 text-sf-ok" aria-hidden />
              Delivering to {order.address.city}, {order.address.state} · {order.shippingMethod}
            </p>
          </div>
        </aside>
      </Container>
    </div>
  );
}

export type { Order };
