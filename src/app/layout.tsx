// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import { Raleway, Bebas_Neue } from "next/font/google";
import Navbar from "@/components/Navbar";
import WhatsappFloat from "@/components/WhatsappFloat";
import Footer from "@/components/Footer";
import MetaPixel from "@/components/MetaPixel";

const raleway = Raleway({
  subsets: ["latin"],
  weight: ["400", "600", "800"], // regular/semibold/extrabold
  variable: "--font-raleway",
});

const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-bebas",
});

export const metadata: Metadata = {
  title: "Grabados Conquer",
  description: "Productos personalizados",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${raleway.variable} ${bebas.variable}`}>
        <MetaPixel />
        <Providers>
          <Navbar />
          {children}
        </Providers>
        <WhatsappFloat />
        <Footer
          developerName="Nicolás Ledesma"
          developerUrl="https://www.linkedin.com/" // poné tu URL real
        />
      </body>
    </html>
  );
}
