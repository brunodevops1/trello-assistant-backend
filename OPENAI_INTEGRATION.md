# Guide d'intégration OpenAI

Ce document explique comment intégrer ce backend avec ChatGPT ou l'API OpenAI.

## 📋 Définitions des Tools

Les tools sont définis dans `src/services/openai.service.ts`. Voici leur structure :

### 1. createTrelloTask

Crée une nouvelle tâche dans Trello.

**Paramètres :**
- `title` (string, requis) : Le titre de la tâche
- `board` (string, optionnel) : Nom ou ID du board
- `list` (string, optionnel) : Nom de la liste (défaut: "À faire")
- `due_date` (string, optionnel) : Date au format ISO 8601

### 2. completeTrelloTask

Marque une tâche comme terminée.

**Paramètres :**
- `task_name` (string, requis) : Nom exact de la tâche
- `board` (string, optionnel) : Nom ou ID du board

### 3. updateTrelloDueDate

Met à jour la date d'échéance d'une tâche.

**Paramètres :**
- `task_name` (string, requis) : Nom exact de la tâche
- `due_date` (string, requis) : Nouvelle date au format ISO 8601
- `board` (string, optionnel) : Nom ou ID du board

## 🤖 Prompt Système

Le prompt système est disponible via `GET /assistant/tools` ou dans `src/services/openai.service.ts`.

**Rôle de l'assistant :**
- Assistant spécialisé dans la gestion de tâches Trello
- Doit TOUJOURS utiliser les tools disponibles
- Ne jamais répondre en texte libre quand une action Trello est possible

## 🔄 Flux d'intégration

### Option 1 : Via ChatGPT Custom Instructions

1. Récupérez les tools et le prompt système :
   ```bash
   curl http://localhost:3000/assistant/tools
   ```

2. Dans ChatGPT, configurez :
   - Les tools dans les "Custom Instructions" ou via l'API
   - Le prompt système comme instruction système

3. Quand ChatGPT génère des `tool_calls`, envoyez-les au backend :
   ```bash
   curl -X POST http://localhost:3000/assistant/trello \
     -H "Content-Type: application/json" \
     -d '{"tool_calls": [...]}'
   ```

### Option 2 : Via l'API OpenAI directement

```javascript
const axios = require('axios');

// 1. Récupérer les tools
const { data: toolsData } = await axios.get('http://localhost:3000/assistant/tools');

// 2. Appeler OpenAI
const openaiResponse = await axios.post(
  'https://api.openai.com/v1/chat/completions',
  {
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: toolsData.system_prompt },
      { role: 'user', content: 'Ajoute une tâche Test dans À faire' }
    ],
    tools: toolsData.tools,
    tool_choice: 'auto',
  },
  {
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
  }
);

// 3. Exécuter les tool calls
const toolCalls = openaiResponse.data.choices[0].message.tool_calls;
if (toolCalls) {
  const backendResponse = await axios.post(
    'http://localhost:3000/assistant/trello',
    { tool_calls: toolCalls }
  );
  console.log(backendResponse.data);
}
```

## 📝 Exemples de phrases utilisateur

| Phrase utilisateur | Tool appelé | Arguments |
|-------------------|-------------|-----------|
| "Ajoute une tâche Préparer le budget 2026 dans À faire pour vendredi" | `createTrelloTask` | `{title: "Préparer le budget 2026", list: "À faire", due_date: "2026-XX-XX"}` |
| "Marque Médiation SNCF comme terminée" | `completeTrelloTask` | `{task_name: "Médiation SNCF"}` |
| "Change la date de Renouvellement RTE au 31 janvier" | `updateTrelloDueDate` | `{task_name: "Renouvellement RTE", due_date: "2026-01-31T00:00:00Z"}` |

## ⚠️ Notes importantes

1. **Format des dates** : Toujours utiliser ISO 8601 (ex: `2026-01-31T00:00:00Z`)
2. **Recherche de tâches** : La recherche est case-insensitive mais doit correspondre exactement au nom
3. **Board par défaut** : Si non spécifié, utilise `TRELLO_DEFAULT_BOARD_ID`
4. **Liste par défaut** : Si non spécifiée, utilise "À faire"

