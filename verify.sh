#!/bin/bash

# RAG System Verification Script
# Run this to verify everything is installed correctly

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          RAG IMPLEMENTATION - VERIFICATION SCRIPT              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check Node.js
echo "🔍 Checking Node.js..."
node --version && echo "✅ Node.js OK" || echo "❌ Node.js missing"
echo ""

# Check npm
echo "🔍 Checking npm..."
npm --version && echo "✅ npm OK" || echo "❌ npm missing"
echo ""

# Check required files
echo "🔍 Checking required files..."
files=(
  "vectorStore.js"
  "recipeDatabase.js"
  "mealPlanner.js"
  "index.js"
  "package.json"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ $file MISSING"
  fi
done
echo ""

# Check documentation
echo "🔍 Checking documentation..."
docs=(
  "RAG_QUICKSTART.md"
  "RAG_IMPLEMENTATION.md"
  "ARCHITECTURE.md"
  "EXAMPLES_AND_TESTING.md"
  "STATUS_REPORT.md"
)

for doc in "${docs[@]}"; do
  if [ -f "$doc" ]; then
    echo "✅ $doc"
  else
    echo "⚠️  $doc (documentation)"
  fi
done
echo ""

# Check node_modules
echo "🔍 Checking dependencies..."
if [ -d "node_modules" ]; then
  echo "✅ node_modules installed"
  
  if npm list groq-sdk > /dev/null 2>&1; then
    echo "✅ groq-sdk installed"
  else
    echo "❌ groq-sdk NOT installed"
  fi
  
  if npm list firebase-admin > /dev/null 2>&1; then
    echo "✅ firebase-admin installed"
  else
    echo "❌ firebase-admin NOT installed"
  fi
else
  echo "❌ node_modules NOT installed - run: npm install"
fi
echo ""

# Check .env file
echo "🔍 Checking .env configuration..."
if [ -f ".env" ]; then
  echo "✅ .env file exists"
  if grep -q "GROQ_API_KEY" .env; then
    echo "✅ GROQ_API_KEY configured"
  else
    echo "⚠️  GROQ_API_KEY not in .env"
  fi
else
  echo "⚠️  .env file not found (optional)"
fi
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    VERIFICATION COMPLETE                       ║"
echo "║                                                                ║"
echo "║  If all checks passed:                                         ║"
echo "║  $ npm run dev                                                 ║"
echo "║                                                                ║"
echo "║  To test:                                                      ║"
echo "║  $ curl -X POST http://localhost:3000/generateDiet ...         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
