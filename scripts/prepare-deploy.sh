#!/bin/bash

# Script pour préparer le projet au déploiement

echo "🔍 Vérification du projet avant déploiement...\n"

# Vérifier que .env est dans .gitignore
if grep -q "^\.env$" .gitignore; then
  echo "✅ .env est dans .gitignore"
else
  echo "⚠️  Ajout de .env à .gitignore..."
  echo ".env" >> .gitignore
fi

# Vérifier que node_modules est dans .gitignore
if grep -q "^node_modules" .gitignore; then
  echo "✅ node_modules est dans .gitignore"
else
  echo "⚠️  Ajout de node_modules à .gitignore..."
  echo "node_modules/" >> .gitignore
fi

# Vérifier que dist est dans .gitignore
if grep -q "^dist" .gitignore; then
  echo "✅ dist est dans .gitignore"
else
  echo "⚠️  Ajout de dist à .gitignore..."
  echo "dist/" >> .gitignore
fi

# Vérifier le build
echo "\n🔨 Test du build..."
npm run build

if [ $? -eq 0 ]; then
  echo "✅ Build réussi"
else
  echo "❌ Erreur de build"
  exit 1
fi

# Vérifier les tests
echo "\n🧪 Exécution des tests..."
npm test

echo "\n✅ Projet prêt pour le déploiement !"
echo "\n📋 Prochaines étapes :"
echo "1. git add ."
echo "2. git commit -m 'Prepare for deployment'"
echo "3. git push origin main"
echo "4. Suivez les instructions dans DEPLOY_RENDER.md"

