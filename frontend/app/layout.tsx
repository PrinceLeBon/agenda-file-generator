import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Générateur d\'Agenda EJP – Cotonou',
  description:
    'Importez un fichier ICS et générez un agenda mensuel professionnel pour Mai 2026. Téléchargez en PDF ou PNG.',
  keywords: ['agenda', 'calendrier', 'EJP', 'Cotonou', 'ICS', 'PDF', 'Mai 2026'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="scroll-smooth">
      <body className="min-h-screen bg-surface antialiased">{children}</body>
    </html>
  );
}
