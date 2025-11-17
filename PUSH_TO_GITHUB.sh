#!/bin/bash

# Script pour pousser le code sur GitHub
# Usage: ./PUSH_TO_GITHUB.sh VOTRE_USERNAME_GITHUB

if [ -z "$1" ]; then
  echo "❌ Usage: ./PUSH_TO_GITHUB.sh VOTRE_USERNAME_GITHUB"
  echo ""
  echo "Exemple: ./PUSH_TO_GITHUB.sh bruno"
  exit 1
fi

USERNAME=$1
REPO_NAME="trello-assistant-backend"

echo "🚀 Préparation du push vers GitHub..."
echo ""

# Vérifier si le remote existe déjà
if git remote get-url origin > /dev/null 2>&1; then
  echo "⚠️  Remote 'origin' existe déjà"
  read -p "Voulez-vous le remplacer? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git remote remove origin
  else
    echo "❌ Annulé"
    exit 1
  fi
fi

# Ajouter le remote
echo "📡 Ajout du remote GitHub..."
git remote add origin https://github.com/${USERNAME}/${REPO_NAME}.git

# Vérifier la branche
echo "🌿 Vérification de la branche..."
git branch -M main

# Afficher les instructions
echo ""
echo "✅ Remote configuré !"
echo ""
echo "📋 Prochaines étapes :"
echo ""
echo "1. Créez le repository sur GitHub :"
echo "   https://github.com/new"
echo "   Nom: ${REPO_NAME}"
echo "   ⚠️  Ne cochez PAS 'Add a README file'"
echo ""
echo "2. Une fois le repo créé, exécutez :"
echo "   git push -u origin main"
echo ""
echo "Ou si vous voulez que je le fasse maintenant, dites-moi et je lancerai le push."
echo ""

