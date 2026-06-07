import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Assistant",
  description: "AI Shopping Assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
