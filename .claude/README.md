# Claude Code Configuration for ReplyKaro

This directory contains configuration files for Claude Code collaboration and cowork features.

## Files in This Directory

### `settings.local.json`
Permission boundaries for Claude Code operations.

**What it controls**:
- Allowed bash commands
- Denied operations for safety
- Tool usage permissions

**Key settings**:
- ✅ Allows: npm commands, git operations, file operations
- ❌ Denies: destructive commands, force pushes, database resets

### `cowork.json`
Collaboration configuration defining workflows and conventions.

**What it defines**:
- Development workflows (feature, hotfix, bugfix)
- Code ownership areas
- Branch naming conventions
- Commit message format
- Required checks before commits
- Important files to reference

### `COWORK_QUICK_REF.md`
Quick reference guide for common cowork tasks and commands.

**Use this for**:
- Quick command lookup
- Commit message format
- Common workflows
- Pre-commit checklist

## How to Use

### For Developers

1. **Read the collaboration guide**:
   ```bash
   cat ../COLLABORATION.md
   ```

2. **Quick reference during development**:
   ```bash
   cat COWORK_QUICK_REF.md
   ```

3. **Work with Claude**:
   - Be specific about what you want
   - Reference workflows when appropriate
   - Ask Claude to explain code
   - Request tests before implementation

### For Claude Sessions

Claude Code automatically reads these configuration files to:
- Understand collaboration boundaries
- Follow project conventions
- Apply appropriate workflows
- Respect permission settings

## Customization

### Modifying Permissions

Edit `settings.local.json` to add/remove allowed commands:

```json
{
  "permissions": {
    "allow": [
      "Bash(your-new-command*)"
    ],
    "deny": [
      "Bash(dangerous-command*)"
    ]
  }
}
```

### Adding New Workflows

Edit `cowork.json` to add custom workflows:

```json
{
  "workflows": {
    "your-workflow": {
      "description": "Description of workflow",
      "steps": ["Step 1", "Step 2"],
      "requiredChecks": ["test", "lint"]
    }
  }
}
```

### Defining Code Ownership

Update `cowork.json` to clarify ownership:

```json
{
  "collaboration": {
    "codeOwners": {
      "path/to/files/*": "Description and guidelines"
    }
  }
}
```

## Safety Features

### Permission System
The permission system in `settings.local.json` prevents accidental:
- Data deletion
- Force pushes
- Hard resets
- Production deployments without review

### Required Checks
Before commits, these must pass:
- ESLint (code quality)
- TypeScript (type safety)
- Tests (functionality)

### Code Ownership
Critical areas are marked with ownership notes to:
- Signal careful review needed
- Coordinate changes
- Maintain security

## Integration with Development Tools

### Git Hooks
Optional pre-commit hooks are available in `../.husky-template/`:

```bash
# Set up git hooks
cd ..
bash .husky-template/setup-hooks.sh
```

### CI/CD
Configuration aligns with GitHub Actions in `.github/workflows/ci.yml`.

Local checks match CI/CD pipeline:
```bash
npm run lint && npm run test:run && npm run build
```

## Best Practices

1. **Don't bypass permissions** unless absolutely necessary
2. **Follow commit conventions** for clean git history
3. **Use workflows** to ensure consistency
4. **Ask Claude for explanations** rather than guessing
5. **Run checks locally** before pushing

## Troubleshooting

### Claude can't run a command

Check `settings.local.json` permissions:
- Is the command in the `allow` list?
- Is it in the `deny` list?

### Workflow not working as expected

Check `cowork.json`:
- Are steps clearly defined?
- Are required checks available (npm scripts)?

### Permission denied errors

Some commands may be intentionally blocked for safety:
- `rm -rf` - Use file deletion tools instead
- `git push --force` - Create new commits instead
- Database resets - Contact maintainer

## Resources

- **Full Guide**: `../COLLABORATION.md`
- **Quick Ref**: `COWORK_QUICK_REF.md`
- **API Docs**: `../docs/API.md`
- **Tests**: `../docs/TEST_PLAN.md`

## Questions?

Ask Claude:
- "Explain the cowork configuration"
- "What workflows are available?"
- "Why is [command] blocked?"
- "How do I [task]?"
