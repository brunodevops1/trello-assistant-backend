/**
 * Script interactif pour configurer le fichier .env
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const envPath = path.join(__dirname, '..', '.env');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function configure() {
  console.log('\n🔧 Configuration du fichier .env\n');
  console.log('Pour obtenir vos credentials Trello:');
  console.log('1. Allez sur https://trello.com/app-key');
  console.log('2. Copiez votre API Key');
  console.log('3. Générez un Token (lien en bas de la page)');
  console.log('4. Pour le Board ID, ouvrez votre board et regardez l\'URL\n');

  const apiKey = await question('TRELLO_API_KEY: ');
  const apiToken = await question('TRELLO_API_TOKEN: ');
  const boardId = await question('TRELLO_DEFAULT_BOARD_ID: ');
  const openaiKey = await question('OPENAI_API_KEY (optionnel, appuyez sur Entrée pour ignorer): ');

  const port = process.env.PORT || '3000';

  const envContent = `# Trello API Configuration
TRELLO_API_KEY=${apiKey}
TRELLO_API_TOKEN=${apiToken}
TRELLO_DEFAULT_BOARD_ID=${boardId}

# OpenAI API Configuration (optionnel si parsing fait côté client)
OPENAI_API_KEY=${openaiKey || 'your_openai_api_key'}

# Server Configuration
PORT=${port}
`;

  fs.writeFileSync(envPath, envContent);
  console.log('\n✅ Fichier .env mis à jour !\n');
  
  rl.close();
  
  // Tester les credentials
  console.log('🧪 Test des credentials...\n');
  const { execSync } = require('child_process');
  try {
    execSync('npx ts-node scripts/test-credentials.ts', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  } catch (error) {
    console.log('\n❌ Les credentials ne fonctionnent pas. Vérifiez vos valeurs.\n');
  }
}

configure();

