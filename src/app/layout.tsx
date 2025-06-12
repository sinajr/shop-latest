import './globals.css';
import { metadata } from '@/app/metadata';
import ClientRoot from '@/app/ClientRoot';

export { metadata };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased flex flex-col min-h-screen bg-background">
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  );
}
