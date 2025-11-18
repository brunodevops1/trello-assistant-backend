#!/usr/bin/env node
/**
 * Script de démarrage pour Render
 * Détecte automatiquement le bon chemin vers dist/index.js
 */

const path = require('path');
const fs = require('fs');

// Chemins possibles (ordre important - tester d'abord les plus probables)
// Le répertoire de travail sur Render est /opt/render/project/src
const possiblePaths = [
  path.join(process.cwd(), 'dist', 'index.js'),  // /opt/render/project/src/dist/index.js
  path.join(process.cwd(), '..', 'dist', 'index.js'),  // /opt/render/project/dist/index.js
  path.join('/opt/render/project', 'src', 'dist', 'index.js'),
  path.join('/opt/render/project', 'dist', 'index.js'),
  // Chemins alternatifs
  path.resolve(__dirname, 'dist', 'index.js'),
  path.resolve(__dirname, '..', 'dist', 'index.js'),
  path.resolve(__dirname, '..', '..', 'dist', 'index.js'),
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
  possiblePaths.forEach(p => {
    const exists = fs.existsSync(p);
    console.error(`   ${exists ? '✅' : '❌'} ${p}`);
  });
  console.error(`📁 Répertoire de travail actuel: ${process.cwd()}`);
  console.error(`📁 __dirname: ${__dirname}`);
  console.error(`📁 Contenu du répertoire actuel:`);
  try {
    const files = fs.readdirSync(process.cwd());
    files.forEach(f => {
      const fullPath = path.join(process.cwd(), f);
      const stat = fs.statSync(fullPath);
      console.error(`   ${stat.isDirectory() ? '📁' : '📄'} ${f}`);
    });
  } catch (e) {
    console.error(`   (impossible de lire le répertoire: ${e.message})`);
  }
  
  // Essayer de trouver dist/ quelque part
  console.error(`\n🔍 Recherche de 'dist' dans les sous-répertoires:`);
  function findDist(dir, depth = 0) {
    if (depth > 3) return;
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory() && file === 'dist') {
            const indexPath = path.join(fullPath, 'index.js');
            if (fs.existsSync(indexPath)) {
              console.error(`   ✅ Trouvé: ${indexPath}`);
              // Si on trouve dist/, l'utiliser directement
              entryPoint = indexPath;
            }
          } else if (stat.isDirectory() && !file.startsWith('.') && !file.includes('node_modules')) {
            findDist(fullPath, depth + 1);
          }
        } catch (e) {}
      }
    } catch (e) {}
  }
  
  // Chercher dans le répertoire actuel et le parent
  findDist(process.cwd());
  if (!entryPoint) {
    try {
      findDist(path.join(process.cwd(), '..'));
    } catch (e) {}
  }
  
  if (!entryPoint) {
    console.error(`\n❌ Impossible de trouver dist/index.js. Le build a-t-il réussi ?`);
    process.exit(1);
  }
}

// Démarrer l'application
require(entryPoint);

