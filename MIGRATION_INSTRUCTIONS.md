# 🔄 Migration Instructions - Instagram to Facebook Auth

## Technical Shift
We have shifted from a direct Instagram OAuth flow to a **Facebook-mediated flow**. This is more reliable for business automation and resolves the "Invalid platform app" errors.

## Files Updated
1. `lib/instagram/config.ts`: Updated endpoints and logic.
2. `app/api/auth/instagram/callback/route.ts`: Updated token exchange flow.

## Verification Checklist

### 1. Facebook App Config
- [ ] **Facebook Login** product added in Meta Dashboard.
- [ ] Redirect URI `https://replykaro.com/api/auth/instagram/callback` saved.
- [ ] All 5 required permissions (`instagram_basic`, etc.) are available in Development mode.

### 2. Local Testing
- [ ] Run `npm run dev`.
- [ ] Attempt a full login cycle.
- [ ] Confirm your user record in Supabase has the new `instagram_user_id` (this will be the Instagram Account ID).

### 3. Production Deployment
- [ ] Push changes to GitHub.
- [ ] Verify Vercel deployment completes.
- [ ] Re-add the Vercel production URL to Meta Dashboard's redirect URIs.

## Important Note
After migration, users who previously connected via the old method may need to **Log Out and Log In again** to refresh their tokens with the correct scopes and account IDs required for the new Graph API calls.
