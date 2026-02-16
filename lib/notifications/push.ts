import { getSupabaseAdmin } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { sendWelcomeEmail } from "./email";

/**
 * Interface for notification payload
 */
interface NotificationPayload {
    title: string;
    body: string;
    tag?: string;
}

/**
 * Notify a user across enabled channels
 */
export async function notifyUser(userId: string, type: 'dm_sent' | 'billing' | 'security', payload: NotificationPayload) {
    try {
        const supabase = getSupabaseAdmin();

        // 1. Fetch user notification preferences
        const { data: user, error } = await (supabase.from("users") as any)
            .select("notification_settings, email, instagram_username")
            .eq("id", userId)
            .single();

        if (error || !user) {
            logger.warn("Could not notify user: User not found", { userId });
            return;
        }

        const settings = (user as any).notification_settings as any;
        if (!settings) return;

        // 2. Check if this type of notification is enabled
        if (settings[type] === false) {
            logger.info("Notification skipped: User disabled this type", { userId, type });
            return;
        }

        // 3. Dispatch Web Push if enabled
        if (settings.web_push_token) {
            try {
                // In a real implementation with web-push library:
                // const subscription = JSON.parse(settings.web_push_token);
                // await webPush.sendNotification(subscription, JSON.stringify(payload));
                logger.info("Web Push would be sent here", { userId, type, payload });
            } catch (pushError) {
                logger.error("Failed to send Web Push", { userId }, pushError as Error);
            }
        }

        // 4. Dispatch Email for critical events if enabled
        if (type === 'security' || (type === 'billing' && (user as any).email)) {
            // Example: sendWelcomeEmail(user.email, user.instagram_username);
            logger.info("Notification Email would be sent here", { userId, type });
        }

    } catch (error) {
        logger.error("Error in notifyUser service", { userId }, error as Error);
    }
}
