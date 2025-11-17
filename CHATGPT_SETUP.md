# Configuration ChatGPT pour utiliser l'assistant Trello

Pour que ChatGPT crée des tâches Trello automatiquement, vous devez configurer les **Custom Instructions** ou utiliser l'**API OpenAI** avec les tools définis.

## 🎯 Méthode 1 : ChatGPT avec Custom Instructions (Recommandé)

### Étape 1 : Récupérer les définitions des tools

```bash
curl http://localhost:3000/assistant/tools
```

Ou ouvrez dans votre navigateur : `http://localhost:3000/assistant/tools`

### Étape 2 : Configurer ChatGPT

1. **Ouvrez ChatGPT** (chat.openai.com)
2. Allez dans **Settings** → **Custom Instructions**
3. Dans la section **"How would you like ChatGPT to respond?"**, ajoutez :

```
Tu es un assistant Trello. Quand l'utilisateur demande de créer, modifier ou compléter une tâche Trello, tu dois appeler l'API backend à l'adresse http://localhost:3000/assistant/trello avec les tool_calls appropriés.

Les tools disponibles sont :
- createTrelloTask: Crée une nouvelle tâche
- completeTrelloTask: Marque une tâche comme terminée  
- updateTrelloDueDate: Met à jour la date d'échéance

Format de requête POST à http://localhost:3000/assistant/trello :
{
  "tool_calls": [{
    "id": "call_xxx",
    "type": "function",
    "function": {
      "name": "createTrelloTask",
      "arguments": "{\"title\": \"...\", \"list\": \"...\", \"due_date\": \"...\"}"
    }
  }]
}
```

**Note** : Cette méthode nécessite que ChatGPT puisse faire des appels HTTP, ce qui n'est pas directement supporté dans l'interface web standard.

## 🚀 Méthode 2 : Utiliser l'API OpenAI avec Function Calling (Recommandé)

Cette méthode fonctionne avec un client qui appelle l'API OpenAI et votre backend.

### Code d'exemple (Node.js)

```javascript
const axios = require('axios');

const OPENAI_API_KEY = 'votre_clé_openai';
const BACKEND_URL = 'http://localhost:3000';

// 1. Récupérer les tools depuis votre backend
const { data: toolsData } = await axios.get(`${BACKEND_URL}/assistant/tools`);

// 2. Appeler OpenAI avec le message utilisateur
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
        content: 'Ajoute une tâche "Préparer le budget 2026" dans "Nouvelles taches" pour vendredi',
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

// 3. Si OpenAI a généré des tool_calls, les exécuter via votre backend
const assistantMessage = openaiResponse.data.choices[0].message;
if (assistantMessage.tool_calls) {
  const backendResponse = await axios.post(
    `${BACKEND_URL}/assistant/trello`,
    {
      tool_calls: assistantMessage.tool_calls,
    }
  );
  
  console.log('✅ Résultat:', backendResponse.data);
}
```

## 🔧 Méthode 3 : Utiliser le backend directement (Sans ChatGPT)

Vous pouvez aussi appeler directement le backend avec des tool_calls :

```bash
curl -X POST http://localhost:3000/assistant/trello \
  -H "Content-Type: application/json" \
  -d '{
    "tool_calls": [{
      "id": "call_1",
      "type": "function",
      "function": {
        "name": "createTrelloTask",
        "arguments": "{\"title\": \"Test depuis curl\", \"list\": \"Nouvelles taches\"}"
      }
    }]
  }'
```

## 📱 Méthode 4 : Intégration avec ChatGPT via un proxy/middleware

Pour une intégration transparente, vous pouvez créer un middleware qui :
1. Intercepte les messages de ChatGPT
2. Appelle votre backend quand nécessaire
3. Retourne les résultats à ChatGPT

## ⚠️ Limitations actuelles

- **ChatGPT Web** : Ne peut pas faire d'appels HTTP directs vers votre backend local
- **Solution** : Utiliser l'API OpenAI avec un client personnalisé, ou déployer le backend sur un serveur public

## 🚀 Solution complète recommandée

1. **Déployer le backend** sur Render/Railway (voir `DEPLOYMENT.md`)
2. **Créer un client** qui :
   - Écoute les messages utilisateur
   - Appelle OpenAI avec les tools
   - Exécute les tool_calls via votre backend déployé
   - Retourne les résultats à l'utilisateur

## 📝 Exemple de flux complet

```
Utilisateur → "Ajoute une tâche Test dans Nouvelles taches"
    ↓
Client → Appelle OpenAI avec tools
    ↓
OpenAI → Génère tool_call: createTrelloTask
    ↓
Client → Appelle votre backend avec tool_call
    ↓
Backend → Crée la tâche sur Trello
    ↓
Backend → Retourne le résultat
    ↓
Client → Affiche "✅ Tâche créée avec succès"
```

## 🎯 Pour tester rapidement

Testez d'abord le backend directement :

```bash
# Créer une tâche
curl -X POST http://localhost:3000/assistant/trello \
  -H "Content-Type: application/json" \
  -d '{
    "tool_calls": [{
      "id": "test_1",
      "type": "function",
      "function": {
        "name": "createTrelloTask",
        "arguments": "{\"title\": \"Test depuis terminal\", \"list\": \"Nouvelles taches\"}"
      }
    }]
  }'
```

Si cela fonctionne, votre backend est prêt. Il ne reste plus qu'à connecter ChatGPT via l'API OpenAI.

