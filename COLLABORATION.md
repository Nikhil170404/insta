# 🤝 Cowork Collaboration Guide for ReplyKaro

This guide explains how to use cowork features with Claude Code to collaborate effectively on the ReplyKaro project.

## What is Cowork?

Cowork enables multiple developers (and Claude sessions) to collaborate on code simultaneously with:
- **Coordinated branching**: Automatic branch management
- **Structured workflows**: Defined development processes
- **Safety boundaries**: Permission controls and code ownership
- **Context sharing**: Consistent development patterns

## Quick Start

### 1. Review Cowork Configuration

The project includes `.claude/cowork.json` which defines:
- Development workflows (feature, hotfix, bugfix)
- Code ownership areas
- Commit conventions
- Required checks before commits

### 2. Choose Your Workflow

We support three main workflows:

#### **Feature Development** (Most Common)
```bash
# Claude will automatically:
# 1. Create a feature branch
# 2. Write tests first (TDD approach)
# 3. Implement the feature
# 4. Run full test suite + coverage
# 5. Commit with proper message format
```

Tell Claude: "Let's build [feature name] using the feature workflow"

#### **Bug Fix**
```bash
# Claude will:
# 1. Create a fix branch
# 2. Add regression tests
# 3. Fix the issue
# 4. Verify tests pass
```

Tell Claude: "Fix [bug description] using the development workflow"

#### **Hotfix** (Production Issues)
```bash
# Claude will:
# 1. Create hotfix branch
# 2. Make minimal changes
# 3. Run critical tests only
# 4. Prepare for immediate deployment
```

Tell Claude: "This is a production hotfix for [issue]"

## Code Ownership Areas

The project is divided into ownership areas for better coordination:

### Frontend (`app/(dashboard)/**`, `components/**`)
- Dashboard UI components
- User interactions
- Styling with Tailwind
- **Key files**: Sidebar.tsx, AutomationWizard.tsx, ReelsGrid.tsx

### API (`app/api/**`, `lib/**`)
- Backend endpoints
- Business logic
- Rate limiting
- **Key files**: lib/instagram/service.ts, lib/smart-rate-limiter.ts

### Database (`supabase/**`)
- Schema changes
- Migrations
- **IMPORTANT**: Coordinate database changes carefully

### Testing (`tests/**`)
- E2E tests
- Unit tests
- Test utilities

## Development Best Practices

### 1. Branch Naming

Follow these conventions:
```
feature/123-add-story-automation
fix/456-webhook-signature-validation
hotfix/789-rate-limit-overflow
claude/session-{id}  (auto-created by Claude)
```

### 2. Commit Messages

Use conventional commits:
```
feat(automation): add story reply support
fix(webhook): handle burst events correctly
refactor(rate-limiter): extract queue logic
test(instagram): add DM sending tests
docs(api): update webhook documentation
```

### 3. Required Checks

Before any commit, these must pass:
- ✅ `npm run lint` - ESLint
- ✅ `npm run test:run` - Vitest tests
- ✅ `npm run build` - TypeScript compilation

For features, also run:
- ✅ `npm run test:coverage` - Coverage report

## Collaboration Scenarios

### Scenario 1: Multiple Developers on Same Feature

**Problem**: Two developers working on Instagram automation simultaneously

**Solution**:
1. Define separate areas:
   - Dev A: Frontend (AutomationWizard component)
   - Dev B: Backend (Instagram API service)

2. Use feature flags for incomplete work:
   ```typescript
   const ENABLE_STORY_AUTOMATION = process.env.NEXT_PUBLIC_FEATURE_STORY === 'true'
   ```

3. Communicate through comments:
   ```typescript
   // TODO(@devB): Add webhook handler for story_reply events
   // Interface defined below - implement in lib/instagram/processor.ts
   ```

### Scenario 2: Claude Session + Human Developer

**Problem**: Claude is implementing a feature while you're reviewing/testing

**Solution**:
1. Claude works on `claude/{session-id}` branch
2. You review changes as they're committed
3. Pull changes to test locally:
   ```bash
   git fetch origin claude/{session-id}
   git checkout claude/{session-id}
   npm run test
   ```

4. Provide feedback by:
   - Commenting on commits
   - Creating issues
   - Asking Claude to adjust

### Scenario 3: Emergency Production Fix

**Problem**: Production issue needs immediate fix while feature work is ongoing

**Solution**:
1. Use hotfix workflow (bypasses heavy checks)
2. Create from main/master:
   ```bash
   git checkout main
   git checkout -b hotfix/critical-rate-limit
   ```

3. Make minimal, targeted changes
4. Deploy to staging first
5. Fast-track to production

## Safety Features

### Permission Boundaries

Claude Code is restricted to safe operations:

✅ **Allowed**:
- All npm commands (`npm run test`, `npm run build`, etc.)
- Git operations (status, diff, commit, push)
- File reading/editing
- Running tests

❌ **Denied**:
- `rm -rf` (destructive deletions)
- `git push --force` (force pushes)
- `git reset --hard` (hard resets)
- `npm publish` (accidental package publishing)
- `supabase db reset` (database wiping)

### Code Review Checkpoints

Critical files require extra attention:

⚠️ **Security-Sensitive**:
- `lib/auth/*` - Authentication logic
- `app/api/webhooks/*` - Webhook handlers
- `app/api/payments/*` - Payment processing

⚠️ **Business-Critical**:
- `lib/instagram/service.ts` - Instagram API integration
- `lib/smart-rate-limiter.ts` - Rate limiting
- `supabase/schema.sql` - Database schema

## Common Workflows

### Adding a New Feature

1. **Plan**: Tell Claude what you want to build
2. **Design**: Claude creates API contracts and component structure
3. **Test**: Write tests first (TDD)
4. **Implement**: Claude implements with proper error handling
5. **Verify**: Run full test suite + coverage
6. **Document**: Update API.md or relevant docs
7. **Commit**: Claude creates proper commit message
8. **Push**: Push to feature branch

### Fixing a Bug

1. **Reproduce**: Understand the bug
2. **Add Test**: Create failing test that reproduces issue
3. **Fix**: Implement the fix
4. **Verify**: Test passes, no regressions
5. **Commit**: Descriptive commit with "fix:" prefix

### Refactoring

1. **Tests First**: Ensure existing tests pass
2. **Refactor**: Make improvements
3. **Tests Again**: Verify no breakage
4. **Commit**: Use "refactor:" prefix

## Tips for Working with Claude

### 💡 Be Specific About Context

Instead of:
> "Add a new feature"

Try:
> "Add story reply automation using the Instagram Graph API. This should trigger DMs when users reply to stories, similar to how comment automation works. Use the feature workflow."

### 💡 Reference Code Ownership

Instead of:
> "Update the API"

Try:
> "Update the Instagram API integration in lib/instagram/service.ts to support story replies. This is in the API ownership area."

### 💡 Specify Workflow

Instead of:
> "Make this change"

Try:
> "This is a production hotfix for rate limiting. Use the hotfix workflow to make minimal changes quickly."

### 💡 Request Explanations

Ask Claude to:
- "Explain the current Instagram webhook flow"
- "Show me how rate limiting works"
- "What tests exist for DM automation?"

## Integration with CI/CD

Our GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push:

1. **Quality Check**: ESLint + TypeScript
2. **Tests**: Vitest with coverage
3. **Build**: Production build
4. **Deploy**: Vercel (main branch only)

Make sure your local checks match CI/CD:
```bash
npm run lint && npm run test:run && npm run build
```

## Important Files Reference

| File | Purpose | When to Edit |
|------|---------|--------------|
| `.claude/cowork.json` | Collaboration config | Changing workflows/conventions |
| `.claude/settings.local.json` | Permissions | Adding/removing allowed commands |
| `COLLABORATION.md` | This guide | Improving collaboration docs |
| `docs/API.md` | API documentation | Adding/changing endpoints |
| `docs/TEST_PLAN.md` | Testing strategy | Changing test approach |
| `supabase/schema.sql` | Database schema | Database changes |

## Environment Setup

Before collaborating, ensure you have:

1. **Environment Variables** (copy from `.env.example`):
   ```bash
   cp .env.example .env.local
   # Fill in required values
   ```

2. **Dependencies**:
   ```bash
   npm install
   ```

3. **Supabase** (if working on database):
   - Create account at supabase.com
   - Run migrations from `supabase/schema.sql`

4. **Instagram App** (if working on integrations):
   - Get credentials from Meta Developer Console
   - Set up webhook subscriptions

## Getting Help

1. **Ask Claude**: Claude can explain any part of the codebase
2. **Check Docs**: Review `docs/API.md` and `docs/TEST_PLAN.md`
3. **Run Tests**: Tests are documentation too
4. **Review Code**: Read related files for context

## Example Collaboration Sessions

### Session 1: Adding a Feature

```
You: "I want to add analytics tracking for DM delivery rates.
      Track success/failure and display in the dashboard.
      Use the feature workflow."

Claude: [Creates feature branch]
Claude: [Designs API endpoints in app/api/analytics]
Claude: [Writes tests first]
Claude: [Implements backend tracking]
Claude: [Creates dashboard component]
Claude: [Runs tests + coverage]
Claude: [Commits with proper message]
Claude: [Pushes to feature branch]

You: [Review, test locally, provide feedback]
```

### Session 2: Debugging an Issue

```
You: "Webhook processing is failing when we get burst
      traffic. Check lib/instagram/processor.ts."

Claude: [Reads webhook processor code]
Claude: [Identifies batching logic issue]
Claude: [Adds regression test]
Claude: [Fixes the bug]
Claude: [Verifies tests pass]
Claude: [Commits with fix: prefix]

You: [Verify in staging environment]
```

### Session 3: Code Review

```
You: "Review the recent changes to smart-rate-limiter.ts
      and check for potential issues."

Claude: [Reads file and recent commits]
Claude: [Analyzes logic]
Claude: [Points out edge cases]
Claude: [Suggests improvements]
Claude: [Adds additional tests if needed]

You: [Decide whether to apply suggestions]
```

## Summary: Making the Most of Cowork

✅ **Do**:
- Use defined workflows for consistency
- Write tests before/with code
- Commit frequently with good messages
- Run checks before pushing
- Communicate context clearly

❌ **Don't**:
- Force push to shared branches
- Skip tests to save time
- Make unrelated changes in one commit
- Modify critical files without testing
- Ignore permission boundaries

---

**Ready to collaborate?** Tell Claude what you want to build and which workflow to use! 🚀
