import type { Metadata } from "next";
import { Outfit, Poppins, Manrope } from "next/font/google";
import "./globals.css";
import ToastProvider from "@/components/ToastProvider";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

const BASE_URL = "https://vsite.in";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "vsite — AI Digital Menu for Restaurants | Live in 3 Min",
    template: "%s | vsite",
  },
  description:
    "Create your restaurant's digital menu in 3 minutes with AI. Upload your paper menu, get professional food photos. Start free — no credit card. Built for Tamil Nadu restaurants.",
  keywords: [
    "digital menu for restaurant India",
    "QR menu for restaurant",
    "restaurant digital menu software",
    "AI menu builder restaurant",
    "QR code menu Tamil Nadu",
    "online menu creator restaurant",
  ],
  authors: [{ name: "vsite", url: BASE_URL }],
  creator: "vsite",
  publisher: "vsite",
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: BASE_URL,
    siteName: "vsite",
    title: "vsite — AI Digital Menu for Restaurants | Live in 3 Min",
    description:
      "Create your restaurant's digital menu in 3 minutes with AI. Upload your paper menu, get professional food photos. 14-day free trial — no credit card.",
    images: [
      {
        url: `${BASE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "vsite — AI Digital Menu for Tamil Nadu Restaurants",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "vsite — AI Digital Menu for Restaurants | Live in 3 Min",
    description:
      "Create your restaurant's digital menu in 3 minutes with AI. 14-day free trial.",
    images: [`${BASE_URL}/og-image.png`],
    creator: "@vsitein",
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

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "vsite",
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    description:
      "AI-powered digital menu and ordering platform for restaurants in South India.",
    areaServed: {
      "@type": "State",
      name: "Tamil Nadu",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "hello@vsite.in",
      availableLanguage: ["English", "Tamil"],
    },
    sameAs: [
      "https://www.linkedin.com/company/vsitein",
      "https://www.instagram.com/vsitein",
    ],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "vsite",
    url: BASE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/shop/{search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className={`${outfit.variable} ${poppins.variable} ${manrope.variable} antialiased font-sans`}>
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
