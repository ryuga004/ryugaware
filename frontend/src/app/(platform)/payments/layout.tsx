import { PaymentsLayout } from "@/features/payments/components/PaymentsLayout";

export default function Layout({ children }: LayoutProps<"/payments">) {
  return <PaymentsLayout>{children}</PaymentsLayout>;
}
