import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import ReelsGrid from "@/components/dashboard/reels-grid";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/signin");

  return (
    <div className="space-y-6 pt-16 lg:pt-0">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Comment → DM Automation
        </h1>
        <p className="text-gray-600">
          Welcome back, @{session.instagram_username}
          <span className="ml-2 text-xs text-gray-400">(ID: {session.instagram_user_id})</span>
        </p>
        <p className="text-sm text-gray-500">Select a reel to set up auto-reply</p>
      </div>

      {/* Plan Status */}
      {session.plan_type === "trial" && (
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-purple-600" />
            <div>
              <p className="font-medium text-purple-800">
                🎉 Trial Plan Active
              </p>
              <p className="text-sm text-purple-600">
                Upgrade for unlimited automations & priority support
              </p>
            </div>
          </div>
          <Link href="/dashboard/billing">
            <Button size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              Upgrade
            </Button>
          </Link>
        </div>
      )}

      {/* Reels Grid with Automation */}
      <ReelsGrid />
    </div>
  );
}
