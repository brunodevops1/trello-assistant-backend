#!/usr/bin/env node
/**
 * Script de démarrage pour Render
 * Détecte automatiquement le bon chemin vers dist/index.js
 */

const path = require('path');
const fs = require('fs');

// Chemins possibles
const possiblePaths = [
  path.join(process.cwd(), 'dist', 'index.js'),
  path.join(process.cwd(), 'src', 'dist', 'index.js'),
  path.join('/opt/render/project', 'dist', 'index.js'),
  path.join('/opt/render/project', 'src', 'dist', 'index.js'),
];

let entryPoint = null;

for (const filePath of possiblePaths) {
  if (fs.existsSync(filePath)) {
    entryPoint = filePath;
    console.log(`✅ Fichier trouvé: ${filePath}`);
    break;
  }
}

if (!entryPoint) {
  console.error('❌ Erreur: dist/index.js introuvable dans les chemins suivants:');
  possiblePaths.forEach(p => console.error(`   - ${p}`));
  console.error(`📁 Répertoire de travail actuel: ${process.cwd()}`);
  console.error(`📁 Contenu du répertoire:`);
  try {
    const files = fs.readdirSync(process.cwd());
    files.forEach(f => console.error(`   - ${f}`));
  } catch (e) {
    console.error(`   (impossible de lire le répertoire)`);
  }
  process.exit(1);
}

// Démarrer l'application
require(entryPoint);

