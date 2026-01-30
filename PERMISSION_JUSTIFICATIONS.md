# Permission Usage Justifications

## instagram_business_basic
- **Purpose**: Fetch user's Instagram profile information and media (reels/posts)
- **Usage**: Display user's content in dashboard for automation setup
- **Screenshots**: Dashboard showing user's reels grid

## instagram_business_manage_messages  
- **Purpose**: Send automated DM responses to users who comment
- **Usage**: Core feature - deliver instant value to engaged followers
- **Screenshots**: DM being sent after keyword detection

## instagram_business_manage_comments
- **Purpose**: Detect comments containing trigger keywords via webhooks
- **Usage**: Monitor comments in real-time to trigger automations
- **Screenshots**: Webhook receiving comment event

## Human Agent
- **Purpose**: Indicate that messages are sent by an automated system
- **Usage**: Required by Meta for all automated messaging apps
- **Implementation**: All DMs are tagged as "Automated by ReplyKaro" using the `HUMAN_AGENT` tag.
