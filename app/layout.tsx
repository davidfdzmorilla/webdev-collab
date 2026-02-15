import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Collab - Real-Time Collaboration Platform',
  description: 'Real-time document editing, video calls, and file sharing',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
