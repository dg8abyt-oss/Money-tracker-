import { cookies } from 'next/headers';
import LoginPage from '@/components/LoginPage';
import Dashboard from '@/components/Dashboard';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get('dashboard_auth')?.value === 'true';

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <Dashboard />;
}
