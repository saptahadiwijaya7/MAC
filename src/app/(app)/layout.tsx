import { AppShell } from "@/components/layout/AppShell";
import { Providers } from "@/components/Providers";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <AppShell>{children}</AppShell>
    </Providers>
  );
}
