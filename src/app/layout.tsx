import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Email Sender Pro',
  description: 'Import contacts and send bulk emails easily',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
