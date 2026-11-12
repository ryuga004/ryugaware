import { DeliveryLayout } from "@/features/delivery/components/DeliveryLayout";

export default function Layout({ children }: LayoutProps<"/delivery">) {
  return <DeliveryLayout>{children}</DeliveryLayout>;
}
