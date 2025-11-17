#!/bin/bash

# Script pour configurer le fichier .env rapidement
# Usage: ./scripts/set-env.sh API_KEY API_TOKEN BOARD_ID [OPENAI_KEY]

ENV_FILE=".env"

if [ $# -lt 3 ]; then
  echo "Usage: $0 TRELLO_API_KEY TRELLO_API_TOKEN TRELLO_DEFAULT_BOARD_ID [OPENAI_API_KEY]"
  echo ""
  echo "Exemple:"
  echo "  $0 abc123 def456 5f8a1b2c3d4e5f6a7b8c9d0e"
  exit 1
fi

API_KEY=$1
API_TOKEN=$2
BOARD_ID=$3
OPENAI_KEY=${4:-your_openai_api_key}
PORT=${PORT:-3000}

cat > "$ENV_FILE" << EOF
# Trello API Configuration
TRELLO_API_KEY=${API_KEY}
TRELLO_API_TOKEN=${API_TOKEN}
TRELLO_DEFAULT_BOARD_ID=${BOARD_ID}

# OpenAI API Configuration (optionnel si parsing fait côté client)
OPENAI_API_KEY=${OPENAI_KEY}

# Server Configuration
PORT=${PORT}
EOF

echo "✅ Fichier .env mis à jour !"
echo ""
echo "🧪 Test des credentials..."

npx ts-node scripts/test-credentials.ts

