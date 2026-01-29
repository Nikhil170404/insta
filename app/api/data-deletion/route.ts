import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import crypto from "crypto";

/**
 * Meta Data Deletion Callback
 * Required for GDPR compliance and App Review approval
 * 
 * When a user deletes your app from their Instagram settings,
 * Meta sends a request to this endpoint with their user_id.
 * You must delete ALL their data and return a confirmation.
 */

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Meta sends: { signed_request: "encrypted_data" }
        const signedRequest = body.signed_request;

        if (!signedRequest) {
            return NextResponse.json(
                { error: "Missing signed_request" },
                { status: 400 }
            );
        }

        // Decode the signed request
        const parts = signedRequest.split(".");
        if (parts.length !== 2) {
            return NextResponse.json(
                { error: "Invalid signed_request format" },
                { status: 400 }
            );
        }

        const [encodedSig, payload] = parts;
        const data = JSON.parse(
            Buffer.from(payload, "base64").toString("utf-8")
        );

        const userId = data.user_id; // Instagram user ID
        // const algorithm = data.algorithm; // Should be "HMAC-SHA256"

        // Verify signature (important for security)
        const expectedSig = crypto
            .createHmac("sha256", process.env.INSTAGRAM_APP_SECRET!)
            .update(payload)
            .digest("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=/g, "");

        if (encodedSig !== expectedSig) {
            console.error("Invalid signature");
            return NextResponse.json(
                { error: "Invalid signature" },
                { status: 403 }
            );
        }

        // Delete user data from database
        const supabase = getSupabaseAdmin();

        console.log(`Data deletion request for Instagram user: ${userId}`);

        // Delete from users table (cascade will delete related data)
        const { error } = await (supabase as any)
            .from("users")
            .delete()
            .eq("instagram_user_id", userId);

        if (error) {
            console.error("Error deleting user data:", error);
            // Don't return error to Meta, just log it
        }

        // Generate confirmation code
        const confirmationCode = crypto.randomUUID();

        // Log deletion for audit trail
        await (supabase as any)
            .from("deletion_logs")
            .insert({
                instagram_user_id: userId,
                confirmation_code: confirmationCode,
                deleted_at: new Date().toISOString(),
            })
            .catch(() => {
                // Ignore error if table doesn't exist
                // You can create this table later for audit purposes
            });

        // Return response to Meta
        return NextResponse.json({
            url: `${process.env.NEXT_PUBLIC_APP_URL}/deletion-status?id=${confirmationCode}`,
            confirmation_code: confirmationCode,
        });

    } catch (error) {
        console.error("Data deletion callback error:", error);

        // Still return 200 to Meta (don't expose errors)
        return NextResponse.json({
            url: `${process.env.NEXT_PUBLIC_APP_URL}/deletion-status?id=error`,
            confirmation_code: "error",
        });
    }
}

// Also handle GET for testing
export async function GET() {
    return NextResponse.json({
        status: "Data Deletion Callback is active",
        endpoint: `${process.env.NEXT_PUBLIC_APP_URL}/api/data-deletion`,
    });
}
