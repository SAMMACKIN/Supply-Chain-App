#!/bin/bash

echo "🔍 Searching for PostgreSQL installation..."
echo ""

# Common PostgreSQL locations on macOS
POSSIBLE_PATHS=(
    "/Applications/Postgres.app/Contents/Versions/latest/bin"
    "/Applications/Postgres.app/Contents/Versions/*/bin"
    "/usr/local/pgsql/bin"
    "/usr/local/opt/postgresql/bin"
    "/usr/local/opt/postgresql@*/bin"
    "/opt/homebrew/opt/postgresql/bin"
    "/opt/homebrew/opt/postgresql@*/bin"
    "/Library/PostgreSQL/*/bin"
    "$HOME/Library/Application Support/Postgres/var-*/bin"
)

echo "Checking common locations..."
for path in "${POSSIBLE_PATHS[@]}"; do
    # Use shell expansion to handle wildcards
    for expanded_path in $path; do
        if [ -f "$expanded_path/pg_dump" ]; then
            echo "✅ Found pg_dump at: $expanded_path"
            echo ""
            echo "To use it, either:"
            echo "1. Add to PATH temporarily:"
            echo "   export PATH=\"$expanded_path:\$PATH\""
            echo ""
            echo "2. Or run directly:"
            echo "   $expanded_path/pg_dump --version"
            echo ""
            echo "3. Add to PATH permanently (add to ~/.zshrc):"
            echo "   echo 'export PATH=\"$expanded_path:\$PATH\"' >> ~/.zshrc"
            echo "   source ~/.zshrc"
            exit 0
        fi
    done
done

# Check if Postgres.app is installed
if [ -d "/Applications/Postgres.app" ]; then
    echo "📦 Found Postgres.app but pg_dump not in expected location"
    echo "Try opening Postgres.app and checking its preferences for CLI tools"
fi

# Check brew list
if command -v brew &> /dev/null; then
    echo ""
    echo "🍺 Checking Homebrew..."
    if brew list | grep -q postgresql; then
        echo "PostgreSQL is installed via Homebrew"
        echo "Try: brew link postgresql"
    else
        echo "PostgreSQL not found in Homebrew"
        echo "Install with: brew install postgresql"
    fi
fi

echo ""
echo "❌ pg_dump not found in common locations"
echo ""
echo "To install PostgreSQL client tools:"
echo "  brew install libpq"
echo "  echo 'export PATH=\"/opt/homebrew/opt/libpq/bin:\$PATH\"' >> ~/.zshrc"
echo "  source ~/.zshrc"