"use client";

import { useState } from "react";
import { LogOut, Package, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDate, formatMoney, pluralize } from "@/lib/format";
import { str } from "../../settings";
import type { Order, SitePage } from "../../types";
import { useShop } from "../ShopContext";
import { Container, SfButton, SfButtonLink, SfLink, Tag, inputClass } from "../ui";
import { STAGES } from "./checkout";

const nowIso = () => new Date().toISOString();

/* ------------------------------ sign in ------------------------------ */

export function LoginPage({ page }: { page: SitePage }) {
  const { commerce, signIn, signInWithGoogle, go, customer, isEnabled } = useShop();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (customer) return <AlreadySignedIn />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const failed = signIn(email, password);
    setError(failed);
    if (!failed) go("/account");
  };

  return (
    <AuthShell heading={str(page.settings, "heading", "Sign in")} intro={str(page.settings, "intro")}>
      {commerce.signIn.google && (
        <>
          <SfButton
            variant="outline"
            full
            onClick={() => {
              signInWithGoogle(nowIso());
              go("/account");
            }}
          >
            Continue with Google
          </SfButton>
          {commerce.signIn.email && <Divider />}
        </>
      )}

      {commerce.signIn.email ? (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field id="li-email" label="Email" type="email" value={email} onChange={setEmail} required />
          <Field id="li-password" label="Password" type="password" value={password} onChange={setPassword} required />
          {error && <p className="text-sm text-sf-sale" role="alert">{error}</p>}
          <SfButton type="submit" full size="lg">
            {str(page.settings, "submitLabel", "Sign in")}
          </SfButton>
        </form>
      ) : (
        <p className="text-sm text-sf-muted">This store signs customers in with Google.</p>
      )}

      {isEnabled("/account/register") && (
        <p className="mt-6 text-center text-sm text-sf-muted">
          New here?{" "}
          <SfLink to="/account/register" className="font-medium text-sf-ink underline underline-offset-4">
            Create an account
          </SfLink>
        </p>
      )}
    </AuthShell>
  );
}

/* ------------------------------ register ------------------------------ */

export function RegisterPage({ page }: { page: SitePage }) {
  const { commerce, register, signInWithGoogle, go, customer, isEnabled } = useShop();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (customer) return <AlreadySignedIn />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Enter your name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) next.email = "Enter a valid email address.";
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\s/g, ""))) next.phone = "Enter a 10-digit mobile number.";
    if (form.password.length < 8) next.password = "Use at least 8 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const failed = register(form, nowIso());
    if (failed) return setErrors({ email: failed });
    go("/account");
  };

  return (
    <AuthShell heading={str(page.settings, "heading", "Create your account")} intro={str(page.settings, "intro")}>
      {commerce.signIn.google && (
        <>
          <SfButton
            variant="outline"
            full
            onClick={() => {
              signInWithGoogle(nowIso());
              go("/account");
            }}
          >
            Continue with Google
          </SfButton>
          {commerce.signIn.email && <Divider />}
        </>
      )}

      {commerce.signIn.email && (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field id="rg-name" label="Full name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} error={errors.name} />
          <Field id="rg-email" label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} error={errors.email} />
          <Field id="rg-phone" label="Mobile number" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} error={errors.phone} placeholder="98765 43210" />
          <Field id="rg-password" label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} error={errors.password} hint="At least 8 characters." />
          <SfButton type="submit" full size="lg">
            {str(page.settings, "submitLabel", "Create account")}
          </SfButton>
        </form>
      )}

      {isEnabled("/account/login") && (
        <p className="mt-6 text-center text-sm text-sf-muted">
          Already have an account?{" "}
          <SfLink to="/account/login" className="font-medium text-sf-ink underline underline-offset-4">
            Sign in
          </SfLink>
        </p>
      )}
    </AuthShell>
  );
}

/* ------------------------------ account ------------------------------ */

export function AccountPage({ page }: { page: SitePage }) {
  const { customer, myOrders, signOut, go, isEnabled } = useShop();

  if (!customer) {
    return (
      <Container className="max-w-md py-24 text-center">
        <UserRound className="mx-auto size-8 text-sf-faint" aria-hidden />
        <h1 className="font-sf-display mt-4 text-2xl text-sf-ink">{str(page.settings, "heading", "Your account")}</h1>
        <p className="mx-auto mt-2 text-sm text-sf-muted">Sign in to see your orders and saved details.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {isEnabled("/account/login") && <SfButtonLink to="/account/login">Sign in</SfButtonLink>}
          {isEnabled("/account/register") && (
            <SfButtonLink to="/account/register" variant="outline">
              Create an account
            </SfButtonLink>
          )}
        </div>
      </Container>
    );
  }

  return (
    <div className="py-10 lg:py-14">
      <Container className="max-w-3xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-sf-display text-3xl text-sf-ink sm:text-4xl">{str(page.settings, "heading", "Your account")}</h1>
            <p className="mt-2 text-sm text-sf-muted">
              {customer.name} · {customer.email}
              {customer.phone ? ` · ${customer.phone}` : ""}
            </p>
            <p className="mt-1 text-xs text-sf-faint">Member since {formatDate(customer.createdAt)}</p>
          </div>
          <SfButton
            variant="outline"
            onClick={() => {
              signOut();
              go("/");
            }}
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </SfButton>
        </div>

        <section className="mt-10">
          <h2 className="font-sf-display text-xl text-sf-ink">{str(page.settings, "ordersHeading", "Your orders")}</h2>
          {myOrders.length === 0 ? (
            <div className="mt-5 rounded-sf border border-sf-line bg-sf-canvas px-6 py-12 text-center">
              <Package className="mx-auto size-7 text-sf-faint" aria-hidden />
              <p className="mt-3 text-sm text-sf-muted">{str(page.settings, "emptyMessage", "You have not placed an order yet.")}</p>
              <SfButtonLink to="/products" className="mt-6">Start shopping</SfButtonLink>
            </div>
          ) : (
            <ul className="mt-5 divide-y divide-sf-line border-y border-sf-line">
              {myOrders.map((order) => (
                <OrderRow key={order.number} order={order} />
              ))}
            </ul>
          )}
        </section>
      </Container>
    </div>
  );
}

function OrderRow({ order }: { order: Order }) {
  const stage = STAGES.find((s) => s.key === order.stage);
  const unpaid = order.paymentStatus === "pending" || order.paymentStatus === "failed";
  return (
    <li className="flex flex-wrap items-center gap-4 py-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <SfLink to={`/orders/${order.number}`} className="text-sm font-medium text-sf-ink hover:underline">
            {order.number}
          </SfLink>
          <Tag tone={unpaid ? "sale" : "neutral"}>{unpaid ? (order.paymentStatus === "failed" ? "Payment failed" : "Payment pending") : stage?.label ?? "Placed"}</Tag>
        </div>
        <p className="mt-1 text-xs text-sf-muted">
          {formatDate(order.placedAt)} · {pluralize(order.lines.length, "item")} · {formatMoney(order.total)}
        </p>
      </div>
      <div className="flex gap-2">
        {unpaid ? (
          <SfButtonLink to={`/pay/${order.number}`} size="sm">
            Pay now
          </SfButtonLink>
        ) : (
          <SfButtonLink to={`/orders/${order.number}`} size="sm" variant="outline">
            View
          </SfButtonLink>
        )}
      </div>
    </li>
  );
}

/* ------------------------------ shared ------------------------------ */

function AuthShell({ heading, intro, children }: { heading: string; intro?: string; children: React.ReactNode }) {
  return (
    <div className="py-14 lg:py-20">
      <Container className="max-w-[420px]">
        <h1 className="font-sf-display text-3xl text-sf-ink">{heading}</h1>
        {intro && <p className="mt-2 text-sm text-sf-muted">{intro}</p>}
        <div className="mt-8">{children}</div>
      </Container>
    </div>
  );
}

function AlreadySignedIn() {
  return (
    <Container className="max-w-md py-24 text-center">
      <p className="font-sf-display text-2xl text-sf-ink">You are already signed in</p>
      <SfButtonLink to="/account" className="mt-6">Go to your account</SfButtonLink>
    </Container>
  );
}

function Divider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-sf-faint">
      <span className="h-px flex-1 bg-sf-line" />
      or
      <span className="h-px flex-1 bg-sf-line" />
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  error,
  hint,
  placeholder,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium tracking-wide text-sf-body uppercase">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputClass, "mt-1.5", error && "border-sf-sale")}
      />
      {(error || hint) && (
        <p id={`${id}-msg`} className={cn("mt-1 text-xs", error ? "text-sf-sale" : "text-sf-muted")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
