import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PAPERROUTE · The Summer Edition",
  description: "A sun-soaked ride through Oceanview Heights. Steer your bike, deliver the morning paper, and take the scenic route to the bay.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
