import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VeoGen - AI Video Generator',
  description: 'Generate stunning videos with Google Veo AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-yt-dark text-yt-text min-h-screen">
        {children}
      </body>
    </html>
  );
}
