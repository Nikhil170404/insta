# Graph API Rate Limits - ReplyKaro Reference

This document maps Facebook's Graph API rate limits to ReplyKaro's usage patterns and identifies gaps in our current implementation.

## Rate Limit Types That Apply to ReplyKaro

ReplyKaro uses the **Instagram Platform** Business Use Case (BUC) rate limits. Since we use **user access tokens** (long-lived Instagram tokens), our requests fall under the Instagram Platform BUC category.

### Instagram Platform Rate Limits

**Formula:**
```
Calls within 24 hours = 4800 * Number of Impressions
```

- **Number of Impressions** = times any content from the user's Instagram professional account entered a person's screen in the last 24 hours.
- Rate limit is per **app + app-user pair** (each connected Instagram account gets its own quota).
- **Excludes messaging endpoints** (those have separate limits below).

**Impact on ReplyKaro:** Non-messaging calls (e.g., `checkIsFollowing`, `replyToComment`, profile fetches) count against this limit. A user with 1,000 impressions/day gets 4,800,000 calls/day - generally not a concern. But low-impression accounts (< 100 impressions) could hit limits if we make excessive API calls per comment event.

### Instagram Messaging Rate Limits (Send API)

These are the critical limits for ReplyKaro's core DM automation:

| Content Type | Limit | Per |
|---|---|---|
| Text, links, reactions, stickers | **100 calls/second** | Instagram professional account |
| Audio or video content | **10 calls/second** | Instagram professional account |

**Impact on ReplyKaro:** Our 200 DMs/hour plan limit (3.3 DMs/minute) is far below Instagram's 100/second ceiling. Our self-imposed limits are the bottleneck, not Meta's.

### Instagram Conversations API

| Limit | Per |
|---|---|
| **2 calls/second** | Instagram professional account |

**Impact on ReplyKaro:** We don't currently use the Conversations API for reading threads, so this doesn't apply. If we add inbox features, this limit matters.

### Instagram Private Replies API

| Type | Limit | Per |
|---|---|---|
| Live comment replies | **100 calls/second** | Instagram professional account |
| Post/reel comment replies | **750 calls/hour** | Instagram professional account |

**Impact on ReplyKaro:** Our `replyToComment()` function for public comment replies likely falls under the 750/hour limit. This is relevant - a viral post could generate hundreds of comments needing public replies.

## Current ReplyKaro Rate Limiting vs. Meta's Actual Limits

| Layer | ReplyKaro Limit | Meta's Actual Limit | Gap |
|---|---|---|---|
| DMs per hour | 200 (all plans) | 360,000 (100/sec) | Our limit is 1,800x more conservative |
| DMs per month | 1K / 50K / 1M (by plan) | No monthly cap from Meta | Business decision, not API constraint |
| API rate limit (global) | 10 req/60s via Upstash | 4800 * impressions / day | Our global limiter is too aggressive |
| Public comment replies | No specific limit | 750/hour per account | **Missing** - no enforcement |
| Follow checks | No specific limit | Part of Instagram Platform BUC | No enforcement needed at current scale |

## Issues and Recommendations

### 1. Missing: X-Business-Use-Case-Usage Header Monitoring

Meta returns an `X-Business-Use-Case-Usage` header on rate-limited endpoints with real-time usage data:

```json
{
  "{business-object-id}": [{
    "type": "instagram",
    "call_count": 85,
    "total_cputime": 20,
    "total_time": 25,
    "estimated_time_to_regain_access": 0
  }]
}
```

**Current state:** We don't read or log this header from any Instagram API response.

**Recommendation:** Parse `X-Business-Use-Case-Usage` from responses in `sendInstagramDM()` and `checkIsFollowing()`. Log it for monitoring and use it to preemptively back off before hitting hard limits.

### 2. Missing: Error Code Handling for Rate Limits

Meta returns specific error codes when rate limited:

| Error Code | Meaning |
|---|---|
| `80002` | Instagram Platform BUC rate limit hit |
| `4` | App-level platform rate limit |
| `17` | User-level platform rate limit |
| `32` | Page request limit (if using page tokens) |
| `613` | Custom rate limit |

**Current state:** `sendInstagramDM()` checks `response.ok` but doesn't differentiate rate limit errors from other failures. A rate-limited request is treated the same as a permanent failure.

**Recommendation:** Check for error codes `80002`, `4`, `17` in API error responses. When detected:
- Queue the DM for retry instead of marking as failed
- Use `estimated_time_to_regain_access` from the BUC header to schedule retry
- Log a rate limit event for analytics

### 3. Per-DM API Call Count

Each DM in `sendInstagramDM()` makes **4 API calls**:
1. `mark_seen`
2. `typing_on`
3. `HUMAN_AGENT` tag
4. Actual message send

Each call to `sendFollowGateCard()` makes **3 API calls**:
1. `typing_on`
2. `HUMAN_AGENT` tag
3. Follow-gate card

For the non-messaging BUC quota (4800 * impressions/day), these sender actions and tags count as individual calls. At 200 DMs/hour, that's 800 API calls/hour just for DMs. For an account with very low impressions, this could matter.

### 4. Public Reply Rate Limit Gap

`replyToComment()` has no rate tracking. Meta limits comment replies to **750/hour per account**. If a reel goes viral and triggers hundreds of automation matches, we could exceed this.

**Recommendation:** Track public reply counts per user in the same hourly window used for DMs, with a 750/hour cap.

### 5. Concurrent Processing Risk

`processQueuedDMs()` fires all DMs for a user in parallel via `Promise.allSettled()`. If a user has 200 queued DMs, all 200 fire simultaneously (800 total API calls). While Meta's per-second limit is 100 for messaging, the burst of `mark_seen` / `typing_on` / tag calls could trigger throttling.

**Recommendation:** Add concurrency control (e.g., process 10-20 DMs at a time with a small stagger) rather than firing all in parallel.

## Error Response Format

When rate limited, Meta returns:
```json
{
  "error": {
    "message": "...",
    "type": "OAuthException",
    "code": 80002,
    "fbtrace_id": "..."
  }
}
```

## Quick Reference: What Counts as an API Call

Per Meta's FAQ, each ID in a multi-ID request counts as a separate call. For ReplyKaro this is straightforward since we make individual calls per user/comment.

## Best Practices from Meta (Applied to ReplyKaro)

1. **Stop making calls when limited** - Don't retry immediately; use `estimated_time_to_regain_access`
2. **Spread queries evenly** - Our `spreadDelay` in `smartRateLimit()` does this correctly
3. **Check usage headers** - Not implemented yet; should parse `X-Business-Use-Case-Usage`
4. **Use filters to limit response size** - Our `fields=` parameters in Graph API calls follow this

## References

- [Graph API Rate Limiting](https://developers.facebook.com/docs/graph-api/overview/rate-limiting)
- [Instagram Platform API](https://developers.facebook.com/docs/instagram-platform)
- Graph API version in use: **v21.0** (see `lib/instagram/service.ts`)
