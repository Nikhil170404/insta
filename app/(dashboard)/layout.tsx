import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/signin");
  }

  return (
    <div className="min-h-screen bg-[#FDFDFF]">
      <DashboardSidebar user={session} />
      <main className="lg:pl-72 pt-16 lg:pt-0">
        <div className="p-4 md:p-8 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
