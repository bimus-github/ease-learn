import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { TenantProvider } from "@/hooks/useTenant";
import { resolveTenantFromHost } from "@/lib/tenant";
import { QueryProvider } from "@/components/providers/query-client-provider";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Next.js and Supabase Starter Kit",
  description: "The fastest way to build apps with Next.js and Supabase",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerList = await headers();
  const host = headerList.get("host") ?? "";
  const tenant = resolveTenantFromHost(host);

  return (
    <html
      lang="uz"
      suppressHydrationWarning
      data-tenant={tenant.tenantSlug ?? "public"}
    >
      <body className={`${geistSans.className} antialiased`}>
        <TenantProvider tenantSlug={tenant.tenantSlug}>
          <QueryProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
          </QueryProvider>
        </TenantProvider>
      </body>
    </html>
  );
}
