import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Leaf } from "lucide-react";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Tellus - Direct Agricultural Marketplace",
    template: "%s | Tellus"
  },
  description: "Empowering farmers and buyers through a transparent, direct agricultural marketplace. Buy fresh produce directly from local farms.",
  keywords: ["agriculture", "marketplace", "farmers", "fresh produce", "direct-to-consumer", "Tellus"],
  authors: [{ name: "Tellus Team" }],
  creator: "Tellus",
  metadataBase: new URL("https://tellus-marketplace.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://tellus-marketplace.com",
    siteName: "Tellus",
    title: "Tellus - Direct Agricultural Marketplace",
    description: "Empowering farmers and buyers through a transparent, direct agricultural marketplace.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Tellus Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tellus - Direct Agricultural Marketplace",
    description: "Empowering farmers and buyers through a transparent, direct agricultural marketplace.",
    images: ["/og-image.jpg"],
    creator: "@tellus",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-stone-50 text-stone-900`}>
        <nav className="bg-white border-b border-stone-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link href="/" className="flex items-center gap-2 text-emerald-700 font-bold text-xl tracking-tight">
                  <Leaf className="w-6 h-6" />
                  <span>Tellus</span>
                </Link>
              </div>

              <div className="hidden md:flex items-center gap-8">
                <Link href="/marketplace" className="text-stone-600 hover:text-emerald-700 transition-colors font-medium">Marketplace</Link>
                <Link href="/guides" className="text-stone-600 hover:text-emerald-700 transition-colors font-medium">Guides</Link>
                <div className="flex items-center gap-4 border-l border-stone-200 pl-8">
                  <Link 
                    href="/login"
                    className="text-stone-600 hover:text-emerald-700 transition-colors font-medium"
                  >
                    Sign In
                  </Link>
                  <Link 
                    href="/signup"
                    className="bg-emerald-700 text-white px-6 py-2 rounded-full font-semibold hover:bg-emerald-800 transition-all shadow-sm"
                  >
                    Get Started
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        <footer className="bg-white border-t border-stone-200 mt-20 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-xl mb-4">
                  <Leaf className="w-6 h-6" />
                  <span>Tellus</span>
                </div>
                <p className="text-stone-500 max-w-sm">
                  Empowering farmers and buyers through a transparent, direct agricultural marketplace.
                </p>
              </div>
              <div>
                <h4 className="font-bold mb-4">Platform</h4>
                <ul className="space-y-2 text-stone-500 text-sm">
                  <li><Link href="/marketplace" className="hover:text-emerald-700 transition-colors">Marketplace</Link></li>
                  <li><Link href="/guides" className="hover:text-emerald-700 transition-colors">Platform Guides</Link></li>
                  <li><Link href="/how-it-works" className="hover:text-emerald-700 transition-colors">How it Works</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-4">Support</h4>
                <ul className="space-y-2 text-stone-500 text-sm">
                  <li><Link href="/help" className="hover:text-emerald-700 transition-colors">Help Center</Link></li>
                  <li><Link href="/privacy" className="hover:text-emerald-700 transition-colors">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="hover:text-emerald-700 transition-colors">Terms of Service</Link></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-stone-100 mt-12 pt-8 text-center text-stone-400 text-xs">
              © 2026 Tellus Marketplace. All rights reserved.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
