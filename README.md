# Assistant Trello Backend

Backend pour un assistant Trello utilisant OpenAI Function Calling. Le système permet de gérer des tâches Trello via des commandes en langage naturel.

## 🎯 Fonctionnalités

- ✅ Créer une tâche dans Trello
- ✅ Marquer une tâche comme terminée
- ✅ Modifier la date d'échéance d'une tâche
- ✅ Archiver une tâche
- ✅ Déplacer une tâche d'une liste à une autre
- ✅ Consulter l'historique des actions d'un board
- ✅ Consulter l'historique des actions d'une carte
- ✅ Améliorer la description d'une carte avec OpenAI
- ✅ Modifier n'importe quel champ d'une carte Trello
- ✅ Déplacer une carte vers une autre liste
- ✅ Archiver une carte (closed = true)
- ✅ Ajouter un label existant à une carte
- ✅ Décaler les échéances de toutes les cartes d'une liste
- ✅ Lister toutes les cartes en retard d'un board
- ✅ Trier une liste selon les dates d'échéance
- ✅ Prioriser une liste selon l'urgence
- ✅ Regrouper intelligemment les cartes d’un board (label, membre, due)
- ✅ Auditer la santé globale d’un board (Board Health)
- ✅ Prendre un snapshot complet d'un board pour les audits
- ✅ Supprimer définitivement une carte

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

### GET /assistant/trello/actions/board

Récupère les actions récentes d'un board Trello (appelle `/1/boards/{id}/actions`).

**Query params :**

- `boardName` (requis) : nom ou ID du board
- `filter` (optionnel) : liste séparée par des virgules des types d'action (`createCard,updateCard,...`)
- `since` / `before` (optionnel) : bornes temporelles ISO 8601
- `limit` (optionnel) : nombre maximum d'actions à retourner

**Réponse :**

```json
{
  "success": true,
  "actions": [
    {
      "id": "665b...",
      "type": "createCard",
      "date": "2025-11-02T10:00:00Z",
      "data": { "...": "..." }
    }
  ]
}
```

### GET /assistant/trello/actions/card

Récupère les actions récentes sur une carte Trello (appelle `/1/cards/{id}/actions`).

**Query params :**

- `cardName` (requis) : nom exact de la carte
- `boardName` (optionnel) : nom ou ID du board si vous ne souhaitez pas utiliser le board par défaut
- `filter` (optionnel) : liste séparée par des virgules des types d'action (`commentCard,updateCard,...`)
- `since` / `before` (optionnel) : bornes temporelles ISO 8601
- `limit` (optionnel) : nombre maximum d'actions à retourner

**Réponse :**

```json
{
  "success": true,
  "actions": [
    {
      "id": "778a...",
      "type": "commentCard",
      "date": "2025-11-04T09:12:00Z",
      "data": { "...": "..." }
    }
  ]
}
```

### POST /assistant/trello/card/description/improve

Améliore la description d'une carte Trello (utilise OpenAI puis met à jour `/1/cards/{id}`).

**Body :**

```json
{
  "cardName": "Budget Q1",
  "instructions": "Rends le texte plus professionnel et ajoute une liste à puces"
}
```

### POST /assistant/trello/card/update-field

Met à jour un champ arbitraire d'une carte Trello (titre, description, due date, position, etc.).

**Body :**

```json
{
  "cardName": "Budget Q1",
  "field": "name",
  "value": "Budget Q1 - Final"
}
```

### POST /assistant/trello/card/move

Déplace une carte Trello vers une autre liste (met à jour `idList` côté Trello).

**Body :**

```json
{
  "cardName": "Budget Q1",
  "listName": "En cours"
}
```

### DELETE /assistant/trello/card

Supprime définitivement une carte Trello.

**Body :**

```json
{
  "cardName": "Budget Q1"
}
```

### POST /assistant/trello/card/archive

Archive une carte Trello (met `closed=true`).

**Body :**

```json
{
  "cardName": "Budget Q1"
}
```

### POST /assistant/trello/checklist/create

Crée une checklist sur une carte Trello et ajoute optionnellement des items.

**Body :**

```json
{
  "cardName": "Budget Q1",
  "checklistName": "Préparation lancement",
  "items": ["Budget validé", "Design finalisé"]
}
```

### POST /assistant/trello/checklist/item/add

Ajoute un nouvel item dans une checklist existante sur une carte Trello.

**Body :**

```json
{
  "cardName": "Budget Q1",
  "checklistName": "Préparation lancement",
  "itemName": "Rappeler le fournisseur"
}
```

### POST /assistant/trello/checklist/item/check

Coche un item dans une checklist existante (met `state=complete` via Trello).

**Body :**

```json
{
  "cardName": "Budget Q1",
  "checklistName": "Préparation lancement",
  "itemName": "Rappeler le fournisseur"
}
```

### POST /assistant/trello/label/add

Ajoute un label existant (par nom ou couleur) à une carte.

**Body :**

```json
{
  "cardName": "Installation CHU",
  "labelNameOrColor": "Urgent"
}
```

### POST /assistant/trello/due/shift

Décale l'ensemble des échéances des cartes d'une liste (jours positifs ou négatifs).

**Body :**

```json
{
  "listName": "À faire",
  "days": 3
}
```

**Réponse :**

```json
{
  "success": true,
  "shifted": [
    {
      "cardName": "Budget Q1",
      "oldDue": "2025-02-10T09:00:00.000Z",
      "newDue": "2025-02-13T09:00:00.000Z"
    }
  ]
}
```

### GET /assistant/trello/due/overdue

Liste toutes les cartes en retard sur un board.

**Query :**

- `boardName` (requis) : nom ou ID du board

**Réponse :**

```json
{
  "success": true,
  "overdue": [
    {
      "cardName": "Budget Q1",
      "listName": "À faire",
      "due": "2025-02-10T09:00:00.000Z",
      "overdueByDays": 3
    }
  ]
}
```

### POST /assistant/trello/sort/due

Trie les cartes d'une liste selon leurs échéances (ordre ascendant par défaut).

**Body :**

```json
{
  "listName": "À faire",
  "order": "asc"
}
```

### POST /assistant/trello/sort/prioritize

Réorganise une liste selon un score d'urgence (échéance dépassée, labels critiques, due proche...).

**Body :**

```json
{
  "listName": "Interventions"
}
```

### POST /assistant/trello/sort/group

Groupe les cartes d’un board selon un critère (label, member, due) et crée les listes correspondantes si besoin.

**Body :**

```json
{
  "boardName": "Organisation",
  "criteria": "label"
}
```

### GET /assistant/trello/snapshot/board

Retourne un snapshot complet d'un board Trello (listes, cartes, labels, checklists, stats).

**Query :**

- `boardName` (requis)

**Réponse :**

```json
{
  "success": true,
  "snapshot": {
    "boardName": "Organisation",
    "boardId": "board123",
    "lists": [
      {
        "id": "listA",
        "name": "À faire",
        "cards": [
          {
            "id": "card1",
            "name": "Budget Q1",
            "due": "2025-02-10T09:00:00.000Z",
            "labels": [],
            "members": [],
            "checklists": []
          }
        ]
      }
    ],
    "stats": {
      "totalCards": 12,
      "overdue": 2,
      "dueToday": 1,
      "dueThisWeek": 4,
      "noDue": 5,
      "unassigned": 3,
      "withChecklists": 4,
      "completedChecklists": 1
    }
  }
}
```

### POST /assistant/trello/audit/board

Analyse un board Trello et retourne les problèmes détectés + recommandations.

**Body :**

```json
{
  "boardName": "Organisation"
}
```

### POST /assistant/trello/audit/list

Analyse une liste précise d'un board (problèmes locaux + recommandations).

**Body :**

```json
{
  "boardName": "Organisation",
  "listName": "À faire"
}
```

### POST /assistant/trello/audit/cleanup

Génère un plan d'actions de nettoyage (archivage, labels, rééquilibrage) sans modifier Trello.

**Body :**

```json
{
  "boardName": "Organisation"
}
```

### POST /assistant/trello/audit/history

Analyse l'historique d'un board, détecte les périodes d'inactivité, pics et membres/cartes stagnants.

**Body :**

```json
{
  "boardName": "Organisation",
  "since": "2025-11-01T00:00:00Z",
  "before": "2025-11-24T00:00:00Z"
}
```

**Réponse :**

```json
{
  "success": true,
  "report": {
    "periodAnalyzed": {
      "since": "2025-11-01T00:00:00Z",
      "before": "2025-11-24T00:00:00Z",
      "totalActions": 412
    },
    "anomalies": [
      { "type": "stalled_card", "message": "Carte Budget Q1 inactive depuis 9 jours" }
    ]
  }
}
```

**Réponse :**

```json
{
  "success": true,
  "plan": {
    "boardName": "Organisation",
    "generatedAt": "2025-02-05T08:00:00.000Z",
    "suggestions": [
      {
        "type": "archive_old_done_cards",
        "message": "Archiver les cartes terminées depuis plus de 30 jours.",
        "actions": [
          { "action": "archiveCard", "cardId": "card123" }
        ]
      }
    ]
  }
}
```

**Tool call :**

```json
{
  "type": "function",
  "function": {
    "name": "suggestBoardCleanup",
    "arguments": "{\"board_name\":\"Organisation\"}"
  }
}
```

### POST /assistant/trello/report/board

Produit un rapport exécutif complet en combinant toutes les analyses avancées (snapshot, santé, historique, plan de nettoyage) puis un résumé GPT.

**Body :**

```json
{
  "boardName": "Organisation"
}
```

**Réponse :**

```json
{
  "success": true,
  "report": {
    "summaryText": "Synthèse narrative structurée...",
    "keyFindings": [
      "Backlog en forte croissance",
      "Membres inactifs sur 3 cartes critiques"
    ],
    "actionItems": [
      "Relancer les responsables des cartes stalled",
      "Mettre en place un point hebdomadaire sur les risques"
    ],
    "healthReport": { "...": "..." },
    "historyReport": { "...": "..." },
    "cleanupPlan": { "...": "..." },
    "snapshot": { "...": "..." }
  }
}
```

**Tool call :**

```json
{
  "type": "function",
  "function": {
    "name": "generateBoardSummary",
    "arguments": "{\"board_name\":\"Organisation\"}"
  }
}
```

**Réponse :**

```json
{
  "success": true,
  "report": {
    "boardName": "Organisation",
    "listName": "À faire",
    "generatedAt": "2025-02-01T09:00:00.000Z",
    "health": "medium",
    "problems": [
      { "type": "no_label", "cardId": "card1", "cardName": "Budget Q1", "listName": "À faire" }
    ],
    "recommendations": [
      { "action": "applyLabel", "cardId": "card1", "listName": "À faire", "suggestedValue": { "label": "À catégoriser" } }
    ]
  }
}
```

**Réponse :**

```json
{
  "success": true,
  "report": {
    "boardName": "Organisation",
    "generatedAt": "2025-02-01T09:00:00.000Z",
    "health": "medium",
    "problems": [
      {
        "type": "overdue",
        "cardId": "card1",
        "cardName": "Budget Q1",
        "listName": "À faire"
      }
    ],
    "recommendations": [
      {
        "action": "shiftDueDates",
        "cardId": "card1",
        "suggestedValue": { "days": 3 }
      }
    ]
  }
}
```

**Réponse :**

```json
{
  "success": true,
  "groups": {
    "criteria": "label",
    "groups": [
      {
        "groupName": "Urgent",
        "cardCount": 3,
        "cards": [
          { "cardName": "Carte 1", "listBefore": "À faire", "listAfter": "Urgent" }
        ]
      }
    ]
  }
}
```

**Réponse :**

```json
{
  "success": true,
  "prioritized": [
    {
      "cardName": "Incident critique",
      "due": "2025-02-10T09:00:00.000Z",
      "priorityScore": 150,
      "newPos": 1
    }
  ]
}
```

**Réponse :**

```json
{
  "success": true,
  "sorted": [
    { "cardName": "Carte C", "due": "2025-01-08T08:00:00.000Z", "newPos": 1 },
    { "cardName": "Carte A", "due": "2025-01-10T10:00:00.000Z", "newPos": 2 }
  ]
}
```

### GET /assistant/trello/labels

Liste les labels disponibles sur un board Trello.

**Query :**

- `boardName` (requis) : nom ou ID du board

**Réponse :**

```json
{
  "success": true,
  "labels": [
    { "id": "64d1", "name": "Urgent", "color": "red" },
    { "id": "64d2", "name": "Info", "color": "blue" }
  ]
}
```

**Réponse :**

```json
{
  "success": true,
  "label": {
    "cardName": "Installation CHU",
    "labelId": "65b...",
    "labelName": "Urgent",
    "labelColor": "red",
    "attached": true
  }
}
```

**Réponse :**

```json
{
  "success": true,
  "item": {
    "cardName": "Budget Q1",
    "checklistName": "Préparation lancement",
    "itemName": "Rappeler le fournisseur",
    "checklistId": "64d...",
    "itemId": "64d_item",
    "state": "complete"
  }
}
```

### POST /assistant/trello/checklist/item/check

Coche un item existant dans une checklist.

**Body :**

```json
{
  "cardName": "Budget Q1",
  "checklistName": "Préparation lancement",
  "itemName": "Rappeler le fournisseur"
}
```

**Réponse :**

```json
{
  "success": true,
  "item": {
    "cardName": "Budget Q1",
    "checklistName": "Préparation lancement",
    "itemName": "Rappeler le fournisseur",
    "checklistId": "64d...",
    "itemId": "64d_item",
    "state": "complete"
  }
}
```

**Réponse :**

```json
{
  "success": true,
  "item": {
    "cardName": "Budget Q1",
    "checklistName": "Préparation lancement",
    "itemName": "Rappeler le fournisseur",
    "checklistId": "64d...",
    "itemId": "64d_item"
  }
}
```
**Réponse :**

```json
{
  "success": true,
  "checklist": {
    "cardName": "Budget Q1",
    "checklistName": "Préparation lancement",
    "checklistId": "64d...",
    "items": ["Budget validé", "Design finalisé"]
  }
}
```

**Réponse :**

```json
{
  "success": true,
  "archived": {
    "cardName": "Budget Q1",
    "archived": true
  }
}
```

**Réponse :**

```json
{
  "success": true,
  "deleted": {
    "cardName": "Budget Q1",
    "deleted": true
  }
}
```

**Réponse :**

```json
{
  "success": true,
  "moved": {
    "cardName": "Budget Q1",
    "oldList": "À faire",
    "newList": "En cours"
  }
}
```

**Réponse :**

```json
{
  "success": true,
  "updated": {
    "cardName": "Budget Q1",
    "field": "name",
    "value": "Budget Q1 - Final"
  }
}
```

**Réponse :**

```json
{
  "success": true,
  "updated": "Nouvelle description structurée..."
}
```

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

### Récupérer les actions d'un board

```bash
curl -G http://localhost:3000/assistant/trello/actions/board \
  -H "Content-Type: application/json" \
  --data-urlencode "boardName=Organisation" \
  --data-urlencode "filter=createCard,updateCard" \
  --data-urlencode "since=2025-11-01T00:00:00Z" \
  --data-urlencode "limit=20"
```

### Récupérer les actions d'une carte

```bash
curl -G http://localhost:3000/assistant/trello/actions/card \
  --data-urlencode "cardName=Budget Q1" \
  --data-urlencode "boardName=Organisation" \
  --data-urlencode "filter=createCard,commentCard" \
  --data-urlencode "since=2025-11-01T00:00:00Z" \
  --data-urlencode "limit=10"
```

### Exemple de tool call getBoardActions

```json
{
  "id": "call_7",
  "type": "function",
  "function": {
    "name": "getBoardActions",
    "arguments": "{\"board_name\":\"Organisation\",\"filter\":[\"createCard\",\"updateCard\"],\"limit\":20,\"since\":\"2025-11-01T00:00:00Z\"}"
  }
}
```

### Exemple de tool call getCardActions

```json
{
  "id": "call_8",
  "type": "function",
  "function": {
    "name": "getCardActions",
    "arguments": "{\"card_name\":\"Budget Q1\",\"filter\":[\"createCard\",\"commentCard\"],\"since\":\"2025-11-01T00:00:00Z\",\"limit\":10}"
  }
}
```

### Améliorer la description d'une carte

```bash
curl -X POST http://localhost:3000/assistant/trello/card/description/improve \
  -H "Content-Type: application/json" \
  -d '{
    "cardName": "Budget Q1",
    "instructions": "Rends la description concise avec une liste des prochaines étapes"
  }'
```

### Exemple de tool call improveCardDescription

```json
{
  "id": "call_9",
  "type": "function",
  "function": {
    "name": "improveCardDescription",
    "arguments": "{\"card_name\":\"Budget Q1\",\"instructions\":\"Ton professionnel et axé résultats\"}"
  }
}
```

### Exemple de tool call updateCardField

```json
{
  "id": "call_10",
  "type": "function",
  "function": {
    "name": "updateCardField",
    "arguments": "{\"card_name\":\"Budget Q1\",\"field\":\"due\",\"value\":\"2025-12-15T12:00:00Z\"}"
  }
}
```

### Exemple de tool call moveCardToList

```json
{
  "id": "call_11",
  "type": "function",
  "function": {
    "name": "moveCardToList",
    "arguments": "{\"card_name\":\"Budget Q1\",\"list_name\":\"En cours\"}"
  }
}
```

### Exemple de tool call deleteCard

```json
{
  "id": "call_12",
  "type": "function",
  "function": {
    "name": "deleteCard",
    "arguments": "{\"card_name\":\"Budget Q1\"}"
  }
}
```

### Exemple de tool call archiveCard

```json
{
  "id": "call_13",
  "type": "function",
  "function": {
    "name": "archiveCard",
    "arguments": "{\"card_name\":\"Budget Q1\"}"
  }
}
```

### Exemple de tool call createChecklist

```json
{
  "id": "call_14",
  "type": "function",
  "function": {
    "name": "createChecklist",
    "arguments": "{\"card_name\":\"Budget Q1\",\"checklist_name\":\"Préparation\",\"items\":[\"Budget\",\"Design\"]}"
  }
}
```

### Exemple de tool call addChecklistItem

```json
{
  "id": "call_15",
  "type": "function",
  "function": {
    "name": "addChecklistItem",
    "arguments": "{\"card_name\":\"Budget Q1\",\"checklist_name\":\"Préparation lancement\",\"item_name\":\"Rappeler le fournisseur\"}"
  }
}
```

### Exemple de tool call checkChecklistItem

```json
{
  "id": "call_16",
  "type": "function",
  "function": {
    "name": "checkChecklistItem",
    "arguments": "{\"card_name\":\"Budget Q1\",\"checklist_name\":\"Préparation lancement\",\"item_name\":\"Rappeler le fournisseur\"}"
  }
}
```

### Exemple de tool call addLabel

```json
{
  "id": "call_17",
  "type": "function",
  "function": {
    "name": "addLabel",
    "arguments": "{\"card_name\":\"Installation CHU\",\"label_name_or_color\":\"Urgent\"}"
  }
}
```

### Exemple de tool call listBoardLabels

```json
{
  "id": "call_18",
  "type": "function",
  "function": {
    "name": "listBoardLabels",
    "arguments": "{\"board_name\":\"Organisation\"}"
  }
}
```

### Exemple de tool call shiftDueDates

```json
{
  "id": "call_19",
  "type": "function",
  "function": {
    "name": "shiftDueDates",
    "arguments": "{\"list_name\":\"À faire\",\"days\":2}"
  }
}
```

### Exemple de tool call listOverdueTasks

```json
{
  "id": "call_19",
  "type": "function",
  "function": {
    "name": "listOverdueTasks",
    "arguments": "{\"board_name\":\"Organisation\"}"
  }
}
```

### Exemple de tool call sortListByDueDate

```json
{
  "id": "call_20",
  "type": "function",
  "function": {
    "name": "sortListByDueDate",
    "arguments": "{\"list_name\":\"À faire\",\"order\":\"asc\"}"
  }
}
```

### Exemple de tool call prioritizeList

```json
{
  "id": "call_21",
  "type": "function",
  "function": {
    "name": "prioritizeList",
    "arguments": "{\"list_name\":\"Interventions\"}"
  }
}
```

### Exemple de tool call groupCards

```json
{
  "id": "call_22",
  "type": "function",
  "function": {
    "name": "groupCards",
    "arguments": "{\"board_name\":\"Organisation\",\"criteria\":\"label\"}"
  }
}
```

### Exemple de tool call getBoardSnapshot

```json
{
  "id": "call_23",
  "type": "function",
  "function": {
    "name": "getBoardSnapshot",
    "arguments": "{\"board_name\":\"Organisation\"}"
  }
}
```

### Exemple de tool call analyzeBoardHealth

```json
{
  "id": "call_24",
  "type": "function",
  "function": {
    "name": "analyzeBoardHealth",
    "arguments": "{\"board_name\":\"Organisation\"}"
  }
}
```

### Exemple de tool call auditList

```json
{
  "id": "call_25",
  "type": "function",
  "function": {
    "name": "auditList",
    "arguments": "{\"board_name\":\"Organisation\",\"list_name\":\"À faire\"}"
  }
}
```

### Exemple de tool call checkChecklistItem

```json
{
  "id": "call_16",
  "type": "function",
  "function": {
    "name": "checkChecklistItem",
    "arguments": "{\"card_name\":\"Budget Q1\",\"checklist_name\":\"Préparation lancement\",\"item_name\":\"Rappeler le fournisseur\"}"
  }
}
```

### Mettre à jour un champ (via API)

```bash
curl -X POST http://localhost:3000/assistant/trello/card/update-field \
  -H "Content-Type: application/json" \
  -d '{
    "cardName": "Budget Q1",
    "field": "desc",
    "value": "Nouvelle description concise"
  }'
```

### Déplacer une carte

```bash
curl -X POST http://localhost:3000/assistant/trello/card/move \
  -H "Content-Type: application/json" \
  -d '{
    "cardName": "Budget Q1",
    "listName": "En cours"
  }'
```

### Supprimer une carte

```bash
curl -X DELETE http://localhost:3000/assistant/trello/card \
  -H "Content-Type: application/json" \
  -d '{
    "cardName": "Budget Q1"
  }'
```

### Archiver une carte

```bash
curl -X POST http://localhost:3000/assistant/trello/card/archive \
  -H "Content-Type: application/json" \
  -d '{
    "cardName": "Budget Q1"
  }'
```

### Créer une checklist

```bash
curl -X POST http://localhost:3000/assistant/trello/checklist/create \
  -H "Content-Type: application/json" \
  -d '{
    "cardName": "Budget Q1",
    "checklistName": "Préparation lancement",
    "items": ["Budget validé", "Design finalisé"]
  }'
```

### Ajouter un item à une checklist

```bash
curl -X POST http://localhost:3000/assistant/trello/checklist/item/add \
  -H "Content-Type: application/json" \
  -d '{
    "cardName": "Budget Q1",
    "checklistName": "Préparation lancement",
    "itemName": "Rappeler le fournisseur"
  }'
```

### Cocher un item de checklist

```bash
curl -X POST http://localhost:3000/assistant/trello/checklist/item/check \
  -H "Content-Type: application/json" \
  -d '{
    "cardName": "Budget Q1",
    "checklistName": "Préparation lancement",
    "itemName": "Rappeler le fournisseur"
  }'
```

### Ajouter un label à une carte

```bash
curl -X POST http://localhost:3000/assistant/trello/label/add \
  -H "Content-Type: application/json" \
  -d '{
    "cardName": "Installation CHU",
    "labelNameOrColor": "Urgent"
  }'
```

### Lister les labels d'un board

```bash
curl -G http://localhost:3000/assistant/trello/labels \
  --data-urlencode "boardName=Organisation"
```

### Décaler toutes les échéances d'une liste

```bash
curl -X POST http://localhost:3000/assistant/trello/due/shift \
  -H "Content-Type: application/json" \
  -d '{
    "listName": "À faire",
    "days": 2
  }'
```

### Lister les cartes en retard

```bash
curl -G http://localhost:3000/assistant/trello/due/overdue \
  --data-urlencode "boardName=Organisation"
```

### Trier une liste selon les échéances

```bash
curl -X POST http://localhost:3000/assistant/trello/sort/due \
  -H "Content-Type: application/json" \
  -d '{
    "listName": "À faire",
    "order": "asc"
  }'
```

### Prioriser une liste

```bash
curl -X POST http://localhost:3000/assistant/trello/sort/prioritize \
  -H "Content-Type: application/json" \
  -d '{
    "listName": "Interventions"
  }'
```

### Grouper les cartes d'un board

```bash
curl -X POST http://localhost:3000/assistant/trello/sort/group \
  -H "Content-Type: application/json" \
  -d '{
    "boardName": "Organisation",
    "criteria": "label"
  }'
```

### Récupérer un snapshot de board

```bash
curl -G http://localhost:3000/assistant/trello/snapshot/board \
  --data-urlencode "boardName=Organisation"
```

### Lancer un audit de board

```bash
curl -X POST http://localhost:3000/assistant/trello/audit/board \
  -H "Content-Type: application/json" \
  -d '{
    "boardName": "Organisation"
  }'
```

### Lancer un audit de liste

```bash
curl -X POST http://localhost:3000/assistant/trello/audit/list \
  -H "Content-Type: application/json" \
  -d '{
    "boardName": "Organisation",
    "listName": "À faire"
  }'
```

### Cocher un item

```bash
curl -X POST http://localhost:3000/assistant/trello/checklist/item/check \
  -H "Content-Type: application/json" \
  -d '{
    "cardName": "Budget Q1",
    "checklistName": "Préparation lancement",
    "itemName": "Rappeler le fournisseur"
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

