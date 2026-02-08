import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { EmailCollectionModal } from "@/components/dashboard/EmailCollectionModal";

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
    <div className="min-h-screen bg-white">
      <DashboardSidebar user={session} />
      <EmailCollectionModal initialEmail={session.email} />
      <main className="lg:pl-72 pt-20 lg:pt-0">
        <div className="p-4 md:p-10 max-w-[1400px] mx-auto min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
