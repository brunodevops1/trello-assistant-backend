# Assistant Trello Backend

Backend pour un assistant Trello utilisant OpenAI Function Calling. Le système permet de gérer des tâches Trello via des commandes en langage naturel.

## 🎯 Fonctionnalités

- ✅ Créer une tâche dans Trello
- ✅ Marquer une tâche comme terminée
- ✅ Modifier la date d'échéance d'une tâche

## 🏗️ Architecture

Le système supporte deux variantes d'intégration :

- **Variante A (Recommandée)** : ChatGPT/OpenAI parse le message et envoie directement les `tool_calls` au backend
- **Variante B** : Le backend reçoit le message brut et fait appel à OpenAI pour le parsing

## 📋 Prérequis

- Node.js 18+ 
- Compte Trello avec API Key et Token
- (Optionnel) Clé API OpenAI si vous utilisez la variante B

## 🔧 Installation

1. Cloner le projet et installer les dépendances :

```bash
npm install
```

2. Configurer les variables d'environnement :

Copiez `env.example` vers `.env` et remplissez les valeurs :

```bash
cp env.example .env
```

Variables requises :
- `TRELLO_API_KEY` : Votre clé API Trello
- `TRELLO_API_TOKEN` : Votre token API Trello
- `TRELLO_DEFAULT_BOARD_ID` : L'ID du board par défaut (ou son nom)

Variables optionnelles :
- `OPENAI_API_KEY` : Nécessaire uniquement pour la variante B
- `PORT` : Port du serveur (défaut: 3000)

### Obtenir les credentials Trello

1. Allez sur https://trello.com/app-key
2. Copiez votre **API Key**
3. Générez un **Token** (lien en bas de la page)
4. Pour obtenir l'ID d'un board, ouvrez le board dans Trello et ajoutez `.json` à l'URL, ou utilisez le nom du board

## 🚀 Démarrage

### Mode développement

```bash
npm run dev
```

### Mode production

```bash
npm run build
npm start
```

Le serveur démarre sur `http://localhost:3000`

## 📡 Endpoints

### POST /assistant/trello

Endpoint principal pour exécuter des actions Trello.

#### Format 1 : Tool calls directs (Variante A - Recommandée)

```json
{
  "tool_calls": [
    {
      "id": "call_abc123",
      "type": "function",
      "function": {
        "name": "createTrelloTask",
        "arguments": "{\"title\": \"Préparer le budget 2026\", \"list\": \"À faire\", \"due_date\": \"2026-01-31T00:00:00Z\"}"
      }
    }
  ]
}
```

#### Format 2 : Message brut (Variante B)

```json
{
  "message": "Ajoute une tâche Préparer le budget 2026 dans À faire pour vendredi"
}
```

**Réponse :**

```json
{
  "success": true,
  "results": [
    {
      "tool_call_id": "call_abc123",
      "function_name": "createTrelloTask",
      "success": true,
      "message": "Tâche \"Préparer le budget 2026\" créée avec succès",
      "data": { ... }
    }
  ]
}
```

### GET /assistant/tools

Retourne la définition des tools OpenAI et le prompt système.

**Réponse :**

```json
{
  "tools": [ ... ],
  "system_prompt": "..."
}
```

### GET /health

Vérification de santé du service.

## 🧪 Tests

```bash
npm test
```

**Note** : Les tests nécessitent des variables d'environnement configurées et peuvent faire des appels réels à l'API Trello.

## 🔌 Intégration avec ChatGPT / OpenAI

### Configuration dans ChatGPT Custom Instructions ou via l'API

1. **Définir les tools** : Utilisez les définitions retournées par `GET /assistant/tools`

2. **Définir le prompt système** : Utilisez le `system_prompt` retourné par `GET /assistant/tools`

3. **Appeler le backend** : Quand ChatGPT génère des `tool_calls`, envoyez-les à `POST /assistant/trello`

### Exemple d'intégration complète

```javascript
// 1. Récupérer les tools
const toolsResponse = await fetch('http://localhost:3000/assistant/tools');
const { tools, system_prompt } = await toolsResponse.json();

// 2. Appeler OpenAI avec les tools
const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: system_prompt },
      { role: 'user', content: 'Ajoute une tâche Test dans À faire' }
    ],
    tools: tools,
    tool_choice: 'auto',
  }),
});

const data = await openaiResponse.json();
const toolCalls = data.choices[0].message.tool_calls;

// 3. Exécuter les tool calls via le backend
if (toolCalls) {
  const backendResponse = await fetch('http://localhost:3000/assistant/trello', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool_calls: toolCalls }),
  });
  
  const result = await backendResponse.json();
  console.log(result);
}
```

## 📝 Exemples de requêtes

### Créer une tâche

```bash
curl -X POST http://localhost:3000/assistant/trello \
  -H "Content-Type: application/json" \
  -d '{
    "tool_calls": [{
      "id": "call_1",
      "type": "function",
      "function": {
        "name": "createTrelloTask",
        "arguments": "{\"title\": \"Préparer le budget 2026\", \"list\": \"À faire\", \"due_date\": \"2026-01-31T00:00:00Z\"}"
      }
    }]
  }'
```

### Marquer une tâche comme terminée

```bash
curl -X POST http://localhost:3000/assistant/trello \
  -H "Content-Type: application/json" \
  -d '{
    "tool_calls": [{
      "id": "call_2",
      "type": "function",
      "function": {
        "name": "completeTrelloTask",
        "arguments": "{\"task_name\": \"Médiation SNCF\"}"
      }
    }]
  }'
```

### Modifier la date d'échéance

```bash
curl -X POST http://localhost:3000/assistant/trello \
  -H "Content-Type: application/json" \
  -d '{
    "tool_calls": [{
      "id": "call_3",
      "type": "function",
      "function": {
        "name": "updateTrelloDueDate",
        "arguments": "{\"task_name\": \"Renouvellement RTE\", \"due_date\": \"2026-01-31T00:00:00Z\"}"
      }
    }]
  }'
```

### Avec message brut (variante B)

```bash
curl -X POST http://localhost:3000/assistant/trello \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Ajoute une tâche Test dans À faire pour vendredi"
  }'
```

## 🏗️ Structure du projet

```
.
├── src/
│   ├── index.ts                 # Point d'entrée
│   ├── routes/
│   │   └── assistant.route.ts   # Routes principales
│   ├── services/
│   │   ├── trello.service.ts     # Service Trello
│   │   └── openai.service.ts    # Service OpenAI + définitions tools
│   ├── types/
│   │   ├── trello.types.ts      # Types Trello
│   │   └── openai.types.ts      # Types OpenAI
│   └── utils/
│       └── errors.ts            # Classes d'erreur
├── tests/
│   └── trello.service.test.ts   # Tests unitaires
├── package.json
├── tsconfig.json
└── README.md
```

## 🛠️ Déploiement

### Render / Railway / Vercel

1. Configurez les variables d'environnement dans le dashboard
2. Déployez depuis le repo Git
3. Assurez-vous que le build command est `npm run build`
4. Le start command est `npm start`

### Variables d'environnement à configurer

- `TRELLO_API_KEY`
- `TRELLO_API_TOKEN`
- `TRELLO_DEFAULT_BOARD_ID`
- `PORT` (optionnel, défaut: 3000)
- `OPENAI_API_KEY` (optionnel, seulement pour variante B)

## 🐛 Gestion des erreurs

Le système gère automatiquement :

- ✅ Tâche introuvable → `TaskNotFoundError`
- ✅ Plusieurs tâches avec le même nom → `MultipleTasksFoundError`
- ✅ Board introuvable → `BoardNotFoundError`
- ✅ Liste introuvable → `ListNotFoundError`
- ✅ Erreurs API Trello (rate limit, auth, etc.)

## 📚 Documentation Trello API

- [Documentation officielle Trello API](https://developer.atlassian.com/cloud/trello/rest/api-group-actions/)
- [Authentification](https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/#authentication-and-authorization)

## 📄 License

MIT

