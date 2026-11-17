"use client";

/**
 * Shopper accounts for one website.
 *
 * Demo only: accounts and the signed-in session live in this browser, keyed by website, so two
 * storefronts never share a customer. A real build would call the backend using the website's
 * sign-in settings (see the Authentication section) and keep a session cookie instead.
 */
import { useCallback, useMemo } from "react";
import { useLocalJson } from "./localStore";
import type { ShopperAccount } from "./types";

const NO_ACCOUNTS: ShopperAccount[] = [];
const NO_SESSION: { email: string | null } = { email: null };

/** The account Google would hand back, so the one-tap path has something to sign in as. */
const GOOGLE_ACCOUNT = { name: "Priya Sharma", email: "priya.sharma@gmail.com", phone: "9820012345" };

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface ShopperAuth {
  customer: ShopperAccount | null;
  register: (input: RegisterInput, now: string) => string | null;
  signIn: (email: string, password: string) => string | null;
  signInWithGoogle: (now: string) => void;
  signOut: () => void;
}

export function useShopperAuth(websiteId: string): ShopperAuth {
  const [accounts, setAccounts] = useLocalJson<ShopperAccount[]>(`ryugaware.accounts.${websiteId}`, NO_ACCOUNTS);
  const [session, setSession] = useLocalJson<{ email: string | null }>(`ryugaware.session.${websiteId}`, NO_SESSION);

  const customer = useMemo(() => accounts.find((a) => a.email === session.email) ?? null, [accounts, session.email]);

  const register = useCallback<ShopperAuth["register"]>(
    (input, now) => {
      const email = input.email.trim().toLowerCase();
      if (accounts.some((a) => a.email === email)) return "An account with that email already exists. Sign in instead.";
      setAccounts([...accounts, { name: input.name.trim(), email, phone: input.phone.trim(), password: input.password, createdAt: now }]);
      setSession({ email });
      return null;
    },
    [accounts, setAccounts, setSession],
  );

  const signIn = useCallback<ShopperAuth["signIn"]>(
    (email, password) => {
      const found = accounts.find((a) => a.email === email.trim().toLowerCase());
      if (!found) return "We couldn’t find an account with that email.";
      if (found.password !== password) return "That password is not right.";
      setSession({ email: found.email });
      return null;
    },
    [accounts, setSession],
  );

  const signInWithGoogle = useCallback<ShopperAuth["signInWithGoogle"]>(
    (now) => {
      const existing = accounts.find((a) => a.email === GOOGLE_ACCOUNT.email);
      if (!existing) setAccounts([...accounts, { ...GOOGLE_ACCOUNT, password: "", createdAt: now }]);
      setSession({ email: GOOGLE_ACCOUNT.email });
    },
    [accounts, setAccounts, setSession],
  );

  const signOut = useCallback(() => setSession(NO_SESSION), [setSession]);

  return { customer, register, signIn, signInWithGoogle, signOut };
}
