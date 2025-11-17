#!/bin/bash

# Script de déploiement automatique
# Ce script prépare tout pour le déploiement sur GitHub et Render

set -e

echo "🚀 Déploiement automatique - Trello Assistant Backend"
echo "======================================================"
echo ""

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Vérifier que Git est initialisé
if [ ! -d .git ]; then
  echo -e "${RED}❌ Git n'est pas initialisé${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Git initialisé${NC}"

# Vérifier qu'il y a un commit
if ! git log -1 > /dev/null 2>&1; then
  echo -e "${RED}❌ Aucun commit trouvé${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Commit trouvé${NC}"

# Vérifier le build
echo ""
echo "🔨 Test du build..."
if npm run build > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Build réussi${NC}"
else
  echo -e "${RED}❌ Erreur de build${NC}"
  exit 1
fi

echo ""
echo "📋 Instructions pour GitHub :"
echo "=============================="
echo ""
echo "1. Créez un nouveau repository sur GitHub :"
echo "   👉 https://github.com/new"
echo ""
echo "2. Configuration du repository :"
echo "   - Name: trello-assistant-backend"
echo "   - Description: Backend pour assistant Trello via OpenAI function calling"
echo "   - ⚠️  Ne cochez PAS 'Add a README file'"
echo "   - Cliquez sur 'Create repository'"
echo ""
echo "3. Une fois le repo créé, exécutez ces commandes :"
echo ""
echo -e "${YELLOW}   git remote add origin https://github.com/VOTRE_USERNAME/trello-assistant-backend.git${NC}"
echo -e "${YELLOW}   git branch -M main${NC}"
echo -e "${YELLOW}   git push -u origin main${NC}"
echo ""
echo "   (Remplacez VOTRE_USERNAME par votre nom d'utilisateur GitHub)"
echo ""
echo "📋 Instructions pour Render :"
echo "=============================="
echo ""
echo "1. Créez un compte sur Render :"
echo "   👉 https://render.com"
echo "   - Cliquez sur 'Get Started for Free'"
echo "   - Connectez-vous avec GitHub"
echo ""
echo "2. Créez un Web Service :"
echo "   - Cliquez sur 'New +' → 'Web Service'"
echo "   - Sélectionnez votre repository 'trello-assistant-backend'"
echo ""
echo "3. Configurez les variables d'environnement :"
echo "   Dans la section 'Environment', ajoutez :"
echo ""
echo "   TRELLO_API_KEY=1d40c72f018e327c7e6c5507895dd2ef"
echo "   TRELLO_API_TOKEN=ATTA4b0eceeb5da3fdcbc8475d35226919b1d029c17153da165caeeecd9981a97777C39CECA6"
echo "   TRELLO_DEFAULT_BOARD_ID=662e4f110f00816573774395"
echo ""
echo "4. Déployez :"
echo "   - Cliquez sur 'Create Web Service'"
echo "   - Render déploiera automatiquement"
echo ""
echo -e "${GREEN}✅ Tout est prêt !${NC}"
echo ""
echo "📖 Pour plus de détails, consultez DEPLOY_NOW.md"
echo ""

