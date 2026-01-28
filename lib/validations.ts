import { z } from "zod";

export const subdomainSchema = z
  .string()
  .min(3, "Subdomain must be at least 3 characters")
  .max(50, "Subdomain must be at most 50 characters")
  .regex(
    /^[a-z0-9-]+$/,
    "Only lowercase letters, numbers, and hyphens are allowed"
  )
  .refine(
    (val) => !val.startsWith("-") && !val.endsWith("-"),
    "Subdomain cannot start or end with a hyphen"
  );

export const keywordSchema = z.object({
  keyword: z
    .string()
    .min(1, "Keyword is required")
    .max(100, "Keyword must be at most 100 characters")
    .regex(/^[a-zA-Z0-9\s]+$/, "Only letters, numbers, and spaces are allowed"),
  reply_message: z
    .string()
    .min(10, "Reply must be at least 10 characters")
    .max(1000, "Reply must be at most 1000 characters"),
});

export const paymentVerificationSchema = z.object({
  razorpay_payment_id: z.string().min(1, "Payment ID is required"),
  razorpay_order_id: z.string().min(1, "Order ID is required"),
  razorpay_signature: z.string().min(1, "Signature is required"),
});

export const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  subdomain: subdomainSchema,
});

export type SubdomainInput = z.infer<typeof subdomainSchema>;
export type KeywordInput = z.infer<typeof keywordSchema>;
export type PaymentVerificationInput = z.infer<typeof paymentVerificationSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
