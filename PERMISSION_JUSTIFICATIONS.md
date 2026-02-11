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
- **Purpose**: Full comment moderation on the Instagram Business Account's media.
- **Usage**:
  1. **Read**: Subscribe to webhooks for real-time comment notifications + fetch all comments on any post via the Comment Manager dashboard.
  2. **Reply**: Post public replies to comments from the Comment Manager.
  3. **Edit**: Update comment text for corrections or moderation from the Comment Manager.
  4. **Delete**: Permanently remove spam or inappropriate comments from the Comment Manager.
  5. **Hide/Unhide**: Toggle comment visibility for moderation without permanent deletion.

---

### Screencast Requirements
- Show the Facebook Login flow with user granting all permissions.
- Show the connected account details (username/pic) in the ReplyKaro dashboard.
- Show the "Automation Wizard" fetching and displaying Reels/Posts from the account.
- **Comment Moderation Loop**:
  1. Open **Comment Manager** → Select a post → View comments.
  2. **Reply** to a comment from the app.
  3. **Edit** the reply to change its text.
  4. **Delete** the reply to remove it.
  5. **Open Instagram** (native app or web) to verify the final state.
