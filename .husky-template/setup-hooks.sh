#!/bin/bash

# ReplyKaro - Git Hooks Setup Script
# Sets up pre-commit hooks for code quality enforcement

echo "🚀 Setting up git hooks for ReplyKaro..."

# Check if husky is installed
if ! npm list husky > /dev/null 2>&1; then
  echo "📦 Installing husky..."
  npm install --save-dev husky
fi

# Initialize husky
echo "🔧 Initializing husky..."
npx husky init

# Copy pre-commit hook
echo "📋 Installing pre-commit hook..."
cp .husky-template/pre-commit .husky/pre-commit
chmod +x .husky/pre-commit

echo "✅ Git hooks setup complete!"
echo ""
echo "Pre-commit hook will now run:"
echo "  - ESLint"
echo "  - TypeScript check"
echo "  - Tests"
echo ""
echo "To skip hooks (use sparingly): git commit --no-verify"
