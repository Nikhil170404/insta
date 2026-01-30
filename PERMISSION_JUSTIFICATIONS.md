# Permission Usage Justifications

## instagram_business_basic
- **Purpose**: Fetch user's Instagram profile information (username, ID, profile pic) and media (reels/posts).
- **Usage**:
  1. Identifies the connected business account in the dashboard/sidebar.
  2. Displays a grid of Reels/Posts in the Automation Wizard so users can select specific content to automate.
  3. Essential for routing automation events to the correct account.
- **Dependency**: This is a mandatory dependent permission for `instagram_business_manage_messages` and `instagram_business_manage_comments`.

## instagram_business_manage_messages  
- **Purpose**: Send automated DM responses to users who comment on media with specific keywords.
- **Usage**: Core automation feature - allows the app to send messages on behalf of the business account using the Content Management API.
- **Constraint**: All messages are tagged with the `HUMAN_AGENT` tag as "Automated by ReplyKaro".

## instagram_business_manage_comments
- **Purpose**: Monitor and manage comments on the Instagram Business Account's media.
- **Usage**: We use this to subscribe to webhooks that notify us of new comments, allowing for real-time trigger detection (keyword matching).

---

### Screencast Requirements
- Show the Facebook Login flow.
- Show the connected account details (username/pic) in the ReplyKaro dashboard.
- Show the "Automation Wizard" fetching and displaying Reels/Posts from the account.
