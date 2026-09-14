import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { ThemeFavicon } from "@/components/theme-favicon";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Weather Dashboard",
  description: "Real-time weather conditions, forecasts and alerts.",
  icons: {
    icon: [
      { url: "/logo2.png", media: "(prefers-color-scheme: light)" },
      { url: "/logo.png", media: "(prefers-color-scheme: dark)" },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script
          id="theme-favicon"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');var d=(!t||t==='system')?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;var h=(d==='dark'?'/logo.png':'/logo2.png');if(document.querySelector('link[rel~="icon"]')){document.querySelectorAll('link[rel~="icon"]').forEach(function(l){l.setAttribute('href',h)})}}catch(e){}`,
          }}
        />
        <Providers>
          <ThemeFavicon />
          {children}
        </Providers>
      </body>
    </html>
  );
}
