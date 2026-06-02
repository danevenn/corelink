import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

// Plus Jakarta Sans: geométrica-humanista limpia, con carácter propio sin
// penalizar rendimiento (variable, subset latino, self-hosted por next/font).
// Es la voz de marca de CoreLink; Geist queda como fallback técnico.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_NAME = "CoreLink";
const APP_DESCRIPTION =
  "La red social interna de tu equipo: feed, canales, mensajería en tiempo real y perfiles, en un solo lugar.";

// metadataBase resuelve las URLs relativas de Open Graph/canónicas. En local
// usa http://localhost:3000; en deploy se sobreescribe con la URL pública
// (Fase 12). Better Auth ya expone esa URL en BETTER_AUTH_URL.
const metadataBase = new URL(
  process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
);

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: APP_NAME,
    // Las rutas que definan su propio título lo verán como "Página · CoreLink".
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  // Red interna privada: NO debe indexarse por buscadores públicos.
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_DESCRIPTION,
    locale: "es_ES",
  },
  twitter: {
    card: "summary",
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${jakarta.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
