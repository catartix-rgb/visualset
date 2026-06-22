import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VISUALSET — Generative Audio-Visual Lab",
  description:
    "A real-time generative visual instrument inspired by TouchDesigner, Notch and interactive installations. Audio-reactive, camera-reactive, infinitely randomizable.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#05070a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
