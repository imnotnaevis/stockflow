import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-base-bg text-charcoal-900 flex flex-col">
      <Sidebar />
      <div className="md:pl-[88px] flex flex-col flex-1 min-h-screen transition-all duration-300">
        <main className="flex-1 w-full p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
