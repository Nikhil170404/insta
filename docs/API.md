# ReplyKaro API Documentation

This document describes the REST API endpoints available in ReplyKaro.

## Base URL

- **Production**: `https://replykaro.com/api`
- **Development**: `http://localhost:3000/api`

## Authentication

Most endpoints require authentication via session cookies. The session is established through Instagram OAuth.

---

## Authentication Endpoints

### Initiate Instagram OAuth

```
GET /auth/instagram
```

Redirects the user to Instagram's OAuth authorization page.

**Query Parameters:**
- `returnUrl` (optional): URL to redirect after successful auth

**Response:** Redirect to Instagram OAuth

---

### OAuth Callback

```
GET /auth/instagram/callback
```

Handles the OAuth callback from Instagram.

**Query Parameters:**
- `code` (required): Authorization code from Instagram
- `state` (optional): State parameter with return URL

**Response:** 
- Success: Redirect to dashboard
- Error: Redirect to `/signin?error=<error_type>`

---

### Logout

```
POST /auth/logout
```

Clears the session cookie.

**Response:**
```json
{
  "success": true
}
```

---

## Automation Endpoints

### List Automations

```
GET /automations
```

Returns all automations for the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "media_id": "12345678901234567",
      "media_type": "REELS",
      "media_thumbnail_url": "https://...",
      "trigger_keyword": "LINK",
      "trigger_type": "keyword",
      "reply_message": "Here's your link!",
      "comment_reply": "Check your DMs!",
      "button_text": "Get Link",
      "link_url": "https://example.com",
      "require_follow": true,
      "is_active": true,
      "dms_sent": 150,
      "clicks": 45,
      "created_at": "2026-01-15T10:00:00Z"
    }
  ]
}
```

---

### Create Automation

```
POST /automations
```

Creates a new automation.

**Request Body:**
```json
{
  "media_id": "12345678901234567",
  "media_type": "REELS",
  "media_url": "https://instagram.com/...",
  "media_thumbnail_url": "https://...",
  "trigger_keyword": "LINK",
  "trigger_type": "keyword",
  "reply_message": "Thanks for your interest! Here's your exclusive link.",
  "comment_reply": "Check your DMs! 📬",
  "button_text": "Get Link",
  "link_url": "https://example.com/offer",
  "require_follow": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "...automation_fields"
  }
}
```

**Errors:**
- `400`: Validation error
- `403`: Automation limit reached for plan
- `401`: Not authenticated

---

### Get Single Automation

```
GET /automations/:id
```

Returns a single automation by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "...automation_fields"
  }
}
```

---

### Update Automation

```
PATCH /automations/:id
```

Updates an existing automation.

**Request Body:** (all fields optional)
```json
{
  "reply_message": "Updated message",
  "is_active": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "...updated_fields"
  }
}
```

---

### Delete Automation

```
DELETE /automations/:id
```

Deletes an automation.

**Response:**
```json
{
  "success": true
}
```

---

## Webhook Endpoints

### Webhook Verification

```
GET /webhooks/instagram
```

Responds to Instagram's webhook verification challenge.

**Query Parameters:**
- `hub.mode`: Should be "subscribe"
- `hub.verify_token`: Must match `WEBHOOK_VERIFY_TOKEN`
- `hub.challenge`: Challenge string to return

**Response:** The challenge string (plain text)

---

### Webhook Handler

```
POST /webhooks/instagram
```

Receives webhook events from Instagram.

**Headers:**
- `x-hub-signature-256`: HMAC signature for verification

**Request Body:**
```json
{
  "object": "instagram",
  "entry": [
    {
      "id": "instagram_user_id",
      "time": 1234567890,
      "changes": [
        {
          "field": "comments",
          "value": {
            "id": "comment_id",
            "text": "LINK please!",
            "from": {
              "id": "commenter_id",
              "username": "user123"
            },
            "media": {
              "id": "media_id"
            }
          }
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "processed": 5,
  "queued": 0
}
```

---

## Payment Endpoints

### Create Payment Order

```
POST /payments/create-order
```

Creates a Razorpay order for plan upgrade.

**Request Body:**
```json
{
  "planType": "starter"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order_xxx",
    "amount": 9900,
    "currency": "INR",
    "keyId": "rzp_test_xxx"
  }
}
```

---

### Verify Payment

```
POST /payments/verify
```

Verifies Razorpay payment and activates plan.

**Request Body:**
```json
{
  "razorpay_payment_id": "pay_xxx",
  "razorpay_order_id": "order_xxx",
  "razorpay_signature": "signature_hash",
  "planType": "starter"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "planType": "starter",
    "activatedAt": "2026-01-15T10:00:00Z"
  }
}
```

---

## Analytics Endpoints

### Get Analytics

```
GET /analytics
```

Returns aggregated analytics for the user.

**Query Parameters:**
- `period`: "day" | "week" | "month" | "all" (default: "month")
- `automationId` (optional): Filter by specific automation

**Response:**
```json
{
  "success": true,
  "data": {
    "totalDmsSent": 1250,
    "totalClicks": 380,
    "clickRate": 0.304,
    "topAutomations": [
      {
        "id": "uuid",
        "media_thumbnail_url": "https://...",
        "dms_sent": 500,
        "clicks": 150
      }
    ],
    "dailyStats": [
      {
        "date": "2026-01-15",
        "dms_sent": 45,
        "clicks": 12
      }
    ]
  }
}
```

---

## Instagram Media Endpoints

### Get User Reels

```
GET /reels
```

Fetches the user's Instagram reels for automation setup.

**Query Parameters:**
- `limit`: Number of reels (default: 25, max: 50)
- `after`: Cursor for pagination

**Response:**
```json
{
  "success": true,
  "data": {
    "reels": [
      {
        "id": "media_id",
        "media_type": "REELS",
        "thumbnail_url": "https://...",
        "caption": "Check this out!",
        "permalink": "https://instagram.com/reel/...",
        "timestamp": "2026-01-15T10:00:00Z"
      }
    ],
    "paging": {
      "after": "cursor_string",
      "hasMore": true
    }
  }
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "field": ["Error message"]
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `AUTHENTICATION_ERROR` | 401 | Not authenticated |
| `AUTHORIZATION_ERROR` | 403 | Permission denied |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_ERROR` | 429 | Rate limit exceeded |
| `PAYMENT_ERROR` | 402 | Payment required/failed |
| `INSTAGRAM_API_ERROR` | 502 | Instagram API failure |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Rate Limits

| Endpoint Category | Limit |
|-------------------|-------|
| Auth endpoints | 10 req/min |
| Automation CRUD | 60 req/min |
| Analytics | 30 req/min |
| Webhook processing | Instagram limits apply |

---

## Webhook Event Types

### Comment Events

Triggered when someone comments on the user's media.

```json
{
  "field": "comments",
  "value": {
    "id": "comment_id",
    "text": "LINK",
    "from": { "id": "user_id", "username": "user" },
    "media": { "id": "media_id" },
    "parent_id": null
  }
}
```

### Message Events

Triggered when someone sends a DM.

```json
{
  "field": "messages",
  "value": {
    "sender": { "id": "user_id" },
    "recipient": { "id": "page_id" },
    "timestamp": 1234567890,
    "message": { "mid": "msg_id", "text": "Hello" }
  }
}
```

### Story Mention Events

Triggered when someone mentions the user in their story.

```json
{
  "field": "story_insights",
  "value": {
    "media_id": "story_id",
    "mentions": [{ "id": "user_id", "username": "user" }]
  }
}
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
// Create automation
const response = await fetch('/api/automations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    media_id: '12345678901234567',
    trigger_type: 'keyword',
    trigger_keyword: 'LINK',
    reply_message: 'Here is your link!',
  }),
});

const { success, data, error } = await response.json();
```

### cURL

```bash
# Create automation
curl -X POST https://replykaro.com/api/automations \
  -H "Content-Type: application/json" \
  -H "Cookie: replykaro_session=..." \
  -d '{
    "media_id": "12345678901234567",
    "trigger_type": "keyword",
    "trigger_keyword": "LINK",
    "reply_message": "Here is your link!"
  }'
```

---

*Last updated: February 2026*
