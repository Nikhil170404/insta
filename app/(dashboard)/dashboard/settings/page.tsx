"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Settings as SettingsIcon,
    User,
    LogOut,
    ExternalLink,
    RefreshCw,
    Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface SettingsPageProps {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function SettingsPage(props: SettingsPageProps) {
    const [disconnecting, setDisconnecting] = useState(false);
    const router = useRouter();

    async function handleDisconnect() {
        if (!confirm("Are you sure you want to disconnect your Instagram account? This will log you out.")) {
            return;
        }

        setDisconnecting(true);
        try {
            window.location.href = "/api/auth/logout";
        } catch (error) {
            console.error("Error disconnecting:", error);
            setDisconnecting(false);
        }
    }

    async function handleReconnect() {
        window.location.href = "/api/auth/instagram";
    }

    return (
        <div className="space-y-6 pt-16 lg:pt-0">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-600">Manage your account and preferences</p>
            </div>

            {/* Account Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Account
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                                U
                            </div>
                            <div>
                                <p className="font-medium">Instagram Connected</p>
                                <p className="text-sm text-gray-500">
                                    Your Instagram account is connected and ready
                                </p>
                            </div>
                        </div>
                        <Badge variant="success">Connected</Badge>
                    </div>

                    <div className="flex gap-3">
                        <Button variant="outline" onClick={handleReconnect}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Reconnect Account
                        </Button>
                        <Button
                            variant="outline"
                            className="text-red-500 hover:text-red-600"
                            onClick={handleDisconnect}
                            disabled={disconnecting}
                        >
                            {disconnecting ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <LogOut className="h-4 w-4 mr-2" />
                            )}
                            Disconnect
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* App Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <SettingsIcon className="h-5 w-5" />
                        App Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-500">App Version</p>
                            <p className="font-medium">1.0.0</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-500">Account Type</p>
                            <p className="font-medium">Instagram Business</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <a
                            href="https://instagram.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Open Instagram
                        </a>
                        <a
                            href="/terms"
                            className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                            Terms of Service
                        </a>
                        <a
                            href="/privacy"
                            className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                            Privacy Policy
                        </a>
                    </div>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200">
                <CardHeader>
                    <CardTitle className="text-red-600">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                        Once you delete your account, there is no going back. Please be
                        certain.
                    </p>
                    <Button variant="destructive" disabled>
                        Delete Account (Coming Soon)
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
