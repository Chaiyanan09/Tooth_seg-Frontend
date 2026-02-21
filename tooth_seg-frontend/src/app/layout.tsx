import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tooth Segmentation",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}