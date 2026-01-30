# 🔧 Meta App Setup Guide (2025 Pageless Method)

Meta recently released **Instagram Login** for professional accounts, which allows you to connect Instagram for automation **Without a Facebook Page**. This is the standard modern method.

## 📋 Step-by-Step Setup

### Step 1: Add "Instagram" Product (New)
1. Go to your app at [developers.facebook.com](https://developers.facebook.com/)
2. Dashboard → **"Add Product"** → Find **"Instagram"** (This is for Instagram Login).
3. Click **"Set Up"**.
4. In the Instagram sidebar, go to **"Settings"**.
5. Find **"Valid OAuth Redirect URIs"** and add:
   - `https://replykaro.com/api/auth/instagram/callback`
   - `http://localhost:3000/api/auth/instagram/callback`
6. Click **"Save Changes"**.

### Step 2: Set Scopes
When you log in, the app will request these permissions. Make sure they are available in your App Dashboard under **App Review → Permissions and Features**:
- `instagram_business_basic`
- `instagram_business_manage_messages`
- `instagram_business_manage_comments`
- `instagram_business_content_publish`

### Step 3: Configure Webhooks
1. Dashboard → **Webhooks**.
2. Select **"Instagram"** from the dropdown.
3. Verify your webhook endpoint `https://replykaro.com/api/webhooks/instagram` is set up.
4. Subscribe to `comments`, `messages`, and `mentions`.

---

## 🧪 Testing the Pageless Flow
1. **Logout** of ReplyKaro.
2. Click **"Connect Instagram"**.
3. You will be redirected to **Instagram.com** (not Facebook).
4. Log in with your Instagram Business/Creator account.
5. Grant permissions.
6. **DONE!** No Facebook Page required.
