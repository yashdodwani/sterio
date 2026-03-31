import { AppHeader } from '@/components/layout/AppHeader';
import { TabNav } from '@/components/layout/TabNav';
import { CartSidebar } from '@/components/ui/CartSidebar';
import { CartHydrator } from '@/components/ui/CartHydrator';
import { AuthGuard } from '@/components/layout/AuthGuard';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex flex-col h-screen bg-(--bg)">
        <AppHeader />
        <TabNav />
        <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
        <CartSidebar />
        <CartHydrator />
      </div>
    </AuthGuard>
  );
}
