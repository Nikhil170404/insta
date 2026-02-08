import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendReceiptEmail(email: string, planName: string, amount: string, date: string) {
    if (!process.env.RESEND_API_KEY) {
        console.warn("Resend API Key missing. Skipping receipt email.");
        return;
    }

    try {
        await resend.emails.send({
            from: 'ReplyKaro <billing@replykaro.com>', // Or a verified domain
            to: email,
            subject: `Payment Receipt for ${planName}`,
            html: `
                <h1>Payment Successful!</h1>
                <p>Thank you for subscribing to <strong>${planName}</strong>.</p>
                <p><strong>Amount:</strong> ₹${amount}</p>
                <p><strong>Date:</strong> ${date}</p>
                <p>You can verify your subscription status in your dashboard.</p>
                <br/>
                <p>Best,<br/>The ReplyKaro Team</p>
            `
        });
    } catch (error) {
        console.error("Failed to send receipt email:", error);
    }
}

export async function sendWelcomeEmail(email: string, name: string) {
    if (!process.env.RESEND_API_KEY) return;

    try {
        await resend.emails.send({
            from: 'ReplyKaro <onboarding@replykaro.com>',
            to: email,
            subject: 'Welcome to ReplyKaro!',
            html: `
                <h1>Welcome, ${name}!</h1>
                <p>We are excited to have you on board.</p>
                <p>Get started by connecting your Instagram account in the dashboard.</p>
            `
        });
    } catch (error) {
        console.error("Failed to send welcome email:", error);
    }
}

export async function sendExpiryWarningEmail(email: string, expiryDate: string) {
    if (!process.env.RESEND_API_KEY) return;

    try {
        await resend.emails.send({
            from: 'ReplyKaro <billing@replykaro.com>',
            to: email,
            subject: 'Your ReplyKaro Subscription is Expiring Soon',
            html: `
                <h1>Action Required</h1>
                <p>Your subscription is set to expire on <strong>${expiryDate}</strong>.</p>
                <p>Please renew your plan to avoid interruption of your automation services.</p>
            `
        });
    } catch (error) {
        console.error("Failed to send expiry warning email:", error);
    }
}
