import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mnemos ERP Intelligence",
  description: "Relationship entropy monitoring and promise tracking dashboard",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png", sizes: "64x64" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

