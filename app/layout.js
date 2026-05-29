import './globals.css';

export const metadata = {
  title: 'Painel de Produção OléVM — Meta de Faturamento 2026.1',
  description: 'Mapa por casa · PAS-4 · 09/05 → 06/07',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
