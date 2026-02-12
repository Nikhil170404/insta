# Meta App Review Submission - ReplyKaro

## App Purpose
ReplyKaro automates Instagram DM responses when users comment specific keywords on Business/Creator accounts' posts. This saves time for creators and businesses managing high engagement.

## Use Case
When a user comments "LINK" on a creator's reel, they automatically receive a DM with the requested resource within seconds.

## Demo Account Credentials
- Instagram Business Account: [Your test account]
- Username: testaccount_replykaro
- Password: [Secure password for reviewers]

## Official Business Information (India MSME)
- **Business Name**: ReplyKaro
- **Udyam Registration Number**: UDYAM-MH-18-0517632
- **Enterprise Type**: Micro Enterprise (MSME)
- **Registration Authority**: Ministry of MSME, Government of India
- **Business Description**: ReplyKaro is a registered Micro Enterprise under India's MSME scheme. We provide Instagram automation software that helps creators and small businesses respond to customer inquiries instantly through automated direct messaging.

## Step-by-Step Testing Instructions

### Prerequisites
1. Have 2 Instagram accounts ready:
   - Account A: Business/Creator (connected to ReplyKaro)
   - Account B: Regular user (to test commenting)

### Test Flow
1. Log into ReplyKaro with Account A
2. Navigate to Dashboard → Select a reel
3. Create automation: Keyword "DEMO" → DM "Thanks for your interest!"
4. Switch to Account B
5. Comment "DEMO" on Account A's reel
6. Check Account B's DMs → Should receive automated message within 10 seconds

### Comment Moderation Test Flow
1. Log into ReplyKaro with Account A
2. Navigate to Dashboard → **Comment Manager**
3. Select any post with existing comments
4. **Reply** to a comment with "Thank you for your feedback!"
5. **Delete** your reply — confirm deletion
6. Open Instagram (native app/web) → Go to the same post → Confirm reply is gone
7. **Hide** another comment → Verify it shows as hidden in the dashboard
8. **Unhide** the comment → Verify it reappears

*Note: The Instagram Graph API does not support editing comments. We use Hide/Delete for moderation.*

### Rejection Response (If Applicable)
**Reviewer Note:** "We need to see a complete comment moderation loop... edit the comment..."
**Developer Response:**
"We have implemented a comprehensive moderation loop including `POST` (Reply), `DELETE` (Delete), and `POST /hide` (Hide). However, regarding the request to 'edit the comment': **The Instagram Graph API does not provide an endpoint to edit existing comments.** (See: https://developers.facebook.com/docs/instagram-api/reference/ig-comment). Therefore, we have implemented 'Hide' and 'Delete' as the standard moderation actions available via the API. The screencast demonstrates these capabilities in lieu of editing."

## Screencast Video
[Upload to YouTube/Vimeo - 5-7 minute walkthrough]
- Show complete Meta login flow (Facebook Login → Permissions grant)
- Show connected account in dashboard
- Create automation + trigger from second account
- Show DM delivery
- **Comment Manager demo**: Reply → hide/unhide → Delete → Verify in native Instagram

## Privacy Policy URL
https://replykaro.com/privacy

## Terms of Service URL
https://replykaro.com/terms

## Data Deletion Instructions URL
https://replykaro.com/api/data-deletion



