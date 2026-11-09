import type { Metadata } from "next";
import { connection } from "next/server";
import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });
const plexSans = IBM_Plex_Sans({ variable: "--font-plex-sans", subsets: ["latin"], weight: ["400", "500", "600"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Portal G2I Digital",
  description: "Portal interno de clientes de G2I Digital",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // El nonce de la CSP es distinto en cada petición, así que ninguna página puede ser estática.
  await connection();
  return (
    <html lang="es-PE" className={`${spaceGrotesk.variable} ${plexSans.variable} ${plexMono.variable} h-full`}>
      <head>
        {/* Satoshi (texto del contenido del portal) no está en Google Fonts: se carga desde Fontshare */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap" />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
