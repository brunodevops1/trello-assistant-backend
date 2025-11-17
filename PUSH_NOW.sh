#!/bin/bash

# Script pour pousser le code sur GitHub
# Username: brunodevops1

echo "🚀 Push vers GitHub pour brunodevops1"
echo "======================================"
echo ""

# Vérifier si le remote existe déjà
if git remote get-url origin > /dev/null 2>&1; then
  CURRENT_URL=$(git remote get-url origin)
  echo "⚠️  Remote 'origin' existe déjà : $CURRENT_URL"
  read -p "Voulez-vous le remplacer? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git remote remove origin
    echo "✅ Remote supprimé"
  else
    echo "❌ Annulé"
    exit 1
  fi
fi

# Ajouter le remote
echo "📡 Ajout du remote GitHub..."
git remote add origin https://github.com/brunodevops1/trello-assistant-backend.git

# Vérifier la branche
echo "🌿 Vérification de la branche..."
git branch -M main

echo ""
echo "✅ Configuration terminée !"
echo ""
echo "📋 Assurez-vous d'avoir créé le repository sur GitHub :"
echo "   https://github.com/new"
echo "   Nom: trello-assistant-backend"
echo ""
read -p "Le repository est créé sur GitHub? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo "⚠️  Créez d'abord le repository sur GitHub, puis relancez ce script."
  exit 1
fi

# Pousser le code
echo ""
echo "📤 Push du code vers GitHub..."
echo ""

if git push -u origin main; then
  echo ""
  echo "✅ Code poussé avec succès !"
  echo ""
  echo "🌐 Prochaine étape : Déployer sur Render"
  echo "   1. https://render.com → Get Started for Free"
  echo "   2. Connectez avec GitHub"
  echo "   3. New + → Web Service"
  echo "   4. Sélectionnez trello-assistant-backend"
  echo "   5. Ajoutez les variables d'environnement"
  echo "   6. Create Web Service"
  echo ""
else
  echo ""
  echo "❌ Erreur lors du push"
  echo ""
  echo "💡 Vérifiez que :"
  echo "   - Le repository existe sur GitHub"
  echo "   - Vous êtes authentifié (git config --global user.name)"
  echo "   - Vous avez les permissions sur le repo"
  echo ""
  exit 1
fi

