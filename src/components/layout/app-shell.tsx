'use client';

import { SidebarProvider } from './sidebar-context';
import { Sidebar } from './sidebar';
import { MobileSidebar } from './mobile-sidebar';
import { TopBar } from './top-bar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-dvh overflow-hidden">
        <Sidebar />
        <MobileSidebar />
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 min-h-0 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
