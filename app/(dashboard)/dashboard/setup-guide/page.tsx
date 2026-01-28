"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertTriangle } from "lucide-react";

export default function SetupGuidePage() {
    return (
        <div className="space-y-6 pt-16 lg:pt-0 p-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Setup Guide</h1>
                <p className="text-gray-600">Complete these steps for automations to work</p>
            </div>

            {/* Step 1: Facebook Page */}
            <Card className="border-yellow-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-yellow-500 text-white flex items-center justify-center font-bold">1</span>
                        Connect Instagram to Facebook Page
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                            <div>
                                <p className="font-medium text-yellow-900">CRITICAL: This is required!</p>
                                <p className="text-sm text-yellow-700">Instagram webhooks ONLY work if your Instagram Business account is connected to a Facebook Page.</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="font-medium">Steps to connect:</p>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                            <li>Create a Facebook Page (if you don't have one): <a href="https://facebook.com/pages/create" target="_blank" className="text-primary hover:underline">Create Page</a></li>
                            <li>Go to <a href="https://business.facebook.com" target="_blank" className="text-primary hover:underline">Meta Business Suite</a></li>
                            <li>Click <strong>Inbox</strong> → <strong>Instagram Comments</strong></li>
                            <li>Click <strong>Connect Account</strong></li>
                            <li>Select your Instagram Business account</li>
                            <li>Complete the connection flow</li>
                        </ol>
                    </div>

                    <div className="bg-green-50 p-3 rounded">
                        <p className="text-sm text-green-700">✅ Once connected, your webhooks will start working!</p>
                    </div>
                </CardContent>
            </Card>

            {/* Step 2: Connected Tools */}
            <Card className="border-red-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center font-bold">2</span>
                        Enable "Connected Tools" in Instagram App
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-red-50 border-l-4 border-red-500 p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                            <div>
                                <p className="font-medium text-red-900">CRITICAL: Without this, webhooks NEVER trigger!</p>
                                <p className="text-sm text-red-700">This setting allows third-party apps to access your Instagram messages.</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="font-medium">Steps to enable (on your phone):</p>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                            <li>Open <strong>Instagram app</strong> on your phone</li>
                            <li>Go to <strong>Settings and activity</strong></li>
                            <li>Click <strong>Messages and story replies</strong></li>
                            <li>Click <strong>Message controls</strong></li>
                            <li>Click <strong>Connected tools</strong></li>
                            <li>Toggle <strong>"Allow access to messages"</strong> to <strong>ON</strong></li>
                        </ol>
                    </div>

                    <div className="bg-green-50 p-3 rounded">
                        <p className="text-sm text-green-700">✅ This allows our app to receive and send DMs on your behalf!</p>
                    </div>
                </CardContent>
            </Card>

            {/* Step 3: Handover Protocol */}
            <Card className="border-purple-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">3</span>
                        Set Handover Protocol (Advanced)
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600">
                        This ensures Instagram routes messages to our app instead of the default inbox.
                    </p>

                    <div className="space-y-3">
                        <p className="font-medium">Via Meta Business Suite:</p>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                            <li>Go to <a href="https://business.facebook.com" target="_blank" className="text-primary hover:underline">Meta Business Suite</a></li>
                            <li>Click <strong>Settings</strong> → <strong>Integrations</strong></li>
                            <li>Click <strong>Conversation Routing</strong></li>
                            <li>Select your Instagram account</li>
                            <li>Set default routing app to your app</li>
                        </ol>
                    </div>

                    <div className="bg-blue-50 p-3 rounded">
                        <p className="text-sm text-blue-700">ℹ️ This step is recommended if webhooks are unreliable.</p>
                    </div>
                </CardContent>
            </Card>

            {/* Final Check */}
            <Card className="border-green-200 bg-green-50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-800">
                        <CheckCircle className="h-6 w-6" />
                        You're All Set!
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-green-700 mb-4">
                        Once you complete these steps, test your automation:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-green-700">
                        <li>Create an automation in Dashboard</li>
                        <li>Comment on your Instagram post from a <strong>REAL account</strong> (not a test user!)</li>
                        <li>Wait 10 seconds</li>
                        <li>Check your Instagram DMs - you should receive the automated message!</li>
                    </ol>
                </CardContent>
            </Card>
        </div>
    );
}
