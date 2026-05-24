import type {Metadata} from 'next';
import { Open_Sans } from 'next/font/google';
import './globals.css'; // Global styles

const sansFont = Open_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'MONEY',
  description: 'Personal finance dashboard integrating with Lunch Money API.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%232563eb"/><path d="M50 25 V75 M68 35 H42 A 10 10 0 0 0 42 55 H58 A 10 10 0 0 1 58 75 H32" stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>'
  }
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={sansFont.variable}>
      <body className="font-sans antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
