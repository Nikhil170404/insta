# Cowork Quick Reference

## 🎯 Quick Commands

### Tell Claude to Use a Workflow
```
"Build [feature] using the feature workflow"
"Fix [bug] using the development workflow"
"This is a production hotfix for [issue]"
```

### Ask for Code Exploration
```
"Explain how Instagram webhook processing works"
"Show me the rate limiting implementation"
"Where is DM sending handled?"
```

### Request Changes
```
"Add [feature] to [component/file]"
"Refactor [code area] to improve [aspect]"
"Fix [bug] in [location]"
```

## 📋 Commit Message Format

```
type(scope): short description

Examples:
feat(automation): add story reply support
fix(webhook): handle burst events correctly
refactor(rate-limiter): extract queue logic
test(instagram): add DM sending tests
docs(api): update webhook documentation
perf(cache): optimize user data caching
style(dashboard): improve mobile responsive
```

**Types**: feat, fix, refactor, test, docs, chore, perf, style

## 🔍 Code Areas

| Area | Path | Purpose |
|------|------|---------|
| Frontend | `app/(dashboard)/**`, `components/**` | UI components |
| API | `app/api/**`, `lib/**` | Backend logic |
| Database | `supabase/**` | Schema & migrations |
| Tests | `tests/**` | Test suites |

## ✅ Pre-Commit Checklist

```bash
npm run lint        # ESLint checks
npm run test:run    # Run all tests
npm run build       # TypeScript compilation
```

For features also run:
```bash
npm run test:coverage  # Check coverage
```

## 🚀 Common Tasks

### Start New Feature
```
1. Tell Claude: "Create a feature for [description]"
2. Claude creates branch: feature/###-{name}
3. Claude writes tests first (TDD)
4. Claude implements feature
5. Claude runs checks and commits
```

### Fix a Bug
```
1. Tell Claude: "Fix [bug description]"
2. Claude creates fix branch
3. Claude adds regression test
4. Claude fixes issue
5. Claude verifies and commits
```

### Refactor Code
```
1. Tell Claude: "Refactor [area] to [improvement]"
2. Claude ensures tests pass first
3. Claude makes improvements
4. Claude verifies no breakage
5. Claude commits with refactor: prefix
```

## 🔐 Safety Boundaries

✅ **Allowed**:
- npm commands
- git operations (except force)
- File editing
- Running tests

❌ **Blocked**:
- rm -rf
- git push --force
- git reset --hard
- npm publish
- supabase db reset

## 🎨 Examples

### Example 1: Add Analytics
```
You: "Add DM delivery analytics with success/failure tracking.
      Display it in the dashboard. Use the feature workflow."

Claude will:
✓ Create feature branch
✓ Design API endpoints
✓ Write tests
✓ Implement tracking
✓ Create UI component
✓ Run tests + coverage
✓ Commit and push
```

### Example 2: Fix Webhook Bug
```
You: "Webhook processing fails on burst traffic.
      Check lib/instagram/processor.ts"

Claude will:
✓ Read and analyze code
✓ Identify batching issue
✓ Add regression test
✓ Fix the bug
✓ Verify tests pass
✓ Commit with fix: prefix
```

### Example 3: Understand Code
```
You: "Explain how rate limiting works in this project"

Claude will:
✓ Read smart-rate-limiter.ts
✓ Explain the ManyChat-style approach
✓ Show hourly/monthly limits
✓ Explain priority queue for Pro users
✓ Reference relevant tests
```

## 📚 Important Files

- `.claude/cowork.json` - Collaboration config
- `.claude/settings.local.json` - Permission boundaries
- `COLLABORATION.md` - Full collaboration guide
- `docs/API.md` - API documentation
- `docs/TEST_PLAN.md` - Testing strategy

## 💡 Pro Tips

1. **Be specific**: Include context and target files
2. **Reference workflows**: Tell Claude which workflow to use
3. **Ask for explanations**: Claude can explain any code
4. **Request tests first**: Use TDD approach for new features
5. **Review commits**: Check what Claude did before merging

## 🆘 Need Help?

Ask Claude:
- "Explain [concept/file/function]"
- "Show me examples of [pattern]"
- "What tests exist for [feature]?"
- "How does [integration] work?"
