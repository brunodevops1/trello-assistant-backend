/**
 * Script pour tester les credentials Trello
 */

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const apiKey = process.env.TRELLO_API_KEY;
const apiToken = process.env.TRELLO_API_TOKEN;
const boardId = process.env.TRELLO_DEFAULT_BOARD_ID;

console.log('\n🔍 Vérification des credentials Trello...\n');

// Vérifier que les variables sont définies
if (!apiKey || apiKey === 'your_trello_api_key') {
  console.error('❌ TRELLO_API_KEY non configurée ou valeur par défaut');
  process.exit(1);
}

if (!apiToken || apiToken === 'your_trello_api_token') {
  console.error('❌ TRELLO_API_TOKEN non configurée ou valeur par défaut');
  process.exit(1);
}

if (!boardId || boardId === 'your_default_board_id') {
  console.error('❌ TRELLO_DEFAULT_BOARD_ID non configurée ou valeur par défaut');
  process.exit(1);
}

console.log('✅ Variables d\'environnement définies');
console.log(`   API_KEY: ${apiKey.substring(0, 10)}...`);
console.log(`   API_TOKEN: ${apiToken.substring(0, 10)}...`);
console.log(`   BOARD_ID: ${boardId.substring(0, 20)}...\n`);

// Tester la connexion
async function testConnection() {
  try {
    console.log('🔌 Test de connexion à Trello...\n');
    
    // Test 1: Vérifier l'utilisateur
    const userResponse = await axios.get('https://api.trello.com/1/members/me', {
      params: {
        key: apiKey,
        token: apiToken,
      },
    });
    
    console.log('✅ Connexion réussie !');
    console.log(`   Utilisateur: ${userResponse.data.fullName || userResponse.data.username}`);
    console.log(`   Email: ${userResponse.data.email || 'Non disponible'}\n`);
    
    // Test 2: Vérifier le board
    try {
      const boardResponse = await axios.get(`https://api.trello.com/1/boards/${boardId}`, {
        params: {
          key: apiKey,
          token: apiToken,
        },
      });
      
      console.log('✅ Board accessible !');
      console.log(`   Nom: ${boardResponse.data.name}`);
      console.log(`   ID: ${boardResponse.data.id}\n`);
      
      // Test 3: Lister les listes du board
      const listsResponse = await axios.get(`https://api.trello.com/1/boards/${boardId}/lists`, {
        params: {
          key: apiKey,
          token: apiToken,
          filter: 'open',
        },
      });
      
      console.log('✅ Listes disponibles:');
      listsResponse.data.forEach((list: any) => {
        console.log(`   - ${list.name} (${list.id})`);
      });
      
      console.log('\n🎉 Tous les tests sont passés ! Les credentials fonctionnent correctement.\n');
      
    } catch (boardError: any) {
      if (boardError.response?.status === 404) {
        console.error(`❌ Board introuvable: ${boardId}`);
        console.error('   Vérifiez que le BOARD_ID est correct dans votre .env\n');
      } else {
        throw boardError;
      }
    }
    
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.error('❌ Erreur d\'authentification (401)');
      console.error('   Vos credentials Trello sont invalides.');
      console.error('   Vérifiez que:');
      console.error('   1. TRELLO_API_KEY est correcte');
      console.error('   2. TRELLO_API_TOKEN est correct et valide');
      console.error('   3. Le token n\'a pas expiré\n');
    } else {
      console.error('❌ Erreur:', error.message);
    }
    process.exit(1);
  }
}

testConnection();

