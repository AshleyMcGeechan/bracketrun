import './globals.css'
import { inter } from '@/app/ui/fonts';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased min-h-screen bg-gradient-to-r from-zinc-800 via-zinc-600 to-zinc-800`}>{children}</body>
    </html>
  );
}
