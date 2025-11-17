/**
 * Client simple pour connecter ChatGPT à votre backend Trello
 * 
 * Usage: node examples/chatgpt-client.js "Ajoute une tâche Test dans Nouvelles taches"
 */

require('dotenv').config();
const axios = require('axios');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY non configurée dans .env');
  process.exit(1);
}

async function processUserMessage(userMessage) {
  try {
    console.log(`\n💬 Message utilisateur: "${userMessage}"\n`);

    // 1. Récupérer les tools depuis le backend
    console.log('📥 Récupération des tools...');
    const { data: toolsData } = await axios.get(`${BACKEND_URL}/assistant/tools`);
    console.log(`✅ ${toolsData.tools.length} tools disponibles\n`);

    // 2. Appeler OpenAI avec le message utilisateur
    console.log('🤖 Appel à OpenAI...');
    const openaiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: toolsData.system_prompt,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        tools: toolsData.tools,
        tool_choice: 'auto',
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const assistantMessage = openaiResponse.data.choices[0].message;
    console.log(`✅ Réponse OpenAI reçue\n`);

    // 3. Si OpenAI a généré des tool_calls, les exécuter via le backend
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log(`🔧 ${assistantMessage.tool_calls.length} tool call(s) détecté(s)\n`);

      for (const toolCall of assistantMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        console.log(`   → ${toolCall.function.name}(${JSON.stringify(args)})\n`);
      }

      console.log('📡 Exécution via le backend...\n');
      const backendResponse = await axios.post(
        `${BACKEND_URL}/assistant/trello`,
        {
          tool_calls: assistantMessage.tool_calls,
        }
      );

      console.log('✅ Résultats:\n');
      backendResponse.data.results.forEach((result) => {
        if (result.success) {
          console.log(`   ✅ ${result.message}`);
        } else {
          console.log(`   ❌ Erreur: ${result.error}`);
        }
      });

      // Afficher le message de l'assistant s'il y en a un
      if (assistantMessage.content) {
        console.log(`\n💬 ${assistantMessage.content}`);
      }

      return backendResponse.data;
    } else {
      // Pas de tool_call, juste une réponse textuelle
      console.log('💬 Réponse:', assistantMessage.content);
      return { message: assistantMessage.content };
    }
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
    throw error;
  }
}

// Exécution
const userMessage = process.argv[2] || "Ajoute une tâche 'Test depuis client' dans 'Nouvelles taches'";

processUserMessage(userMessage)
  .then(() => {
    console.log('\n✅ Terminé\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Échec\n');
    process.exit(1);
  });

