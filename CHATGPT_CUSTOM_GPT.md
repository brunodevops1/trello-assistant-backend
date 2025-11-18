# 🤖 Intégration avec ChatGPT.com via Custom GPT

Ce guide explique comment créer un Custom GPT sur ChatGPT.com qui utilise votre backend Trello.

## ✅ Prérequis

- Compte **ChatGPT Plus** (nécessaire pour créer des Custom GPTs)
- Backend déployé sur Render : `https://trello-assistant-backend.onrender.com`

## 🚀 Étape 1 : Créer un Custom GPT

1. Allez sur **https://chat.openai.com**
2. Cliquez sur votre nom en bas à gauche → **"My GPTs"**
3. Cliquez sur **"Create a GPT"**
4. Cliquez sur **"Configure"** (en haut à droite)

## 🔧 Étape 2 : Configurer le GPT

### Informations de base

- **Name** : `Trello Assistant`
- **Description** : `Assistant pour gérer vos tâches Trello. Crée, modifie et complète des tâches automatiquement.`
- **Instructions** : Copiez-collez ceci :

```
Tu es un assistant spécialisé dans la gestion de tâches Trello.

RÔLE:
- Tu aides les utilisateurs à gérer leurs tâches Trello via des commandes en langage naturel.
- Tu dois TOUJOURS utiliser les actions (Actions) disponibles pour exécuter les actions Trello.
- Ne réponds JAMAIS en texte libre quand une action Trello est possible - utilise toujours une action.

ACTIONS DISPONIBLES:
1. createTrelloTask - Crée une nouvelle tâche
2. completeTrelloTask - Marque une tâche comme terminée
3. updateTrelloDueDate - Met à jour la date d'échéance d'une tâche

QUAND UTILISER CHAQUE ACTION:
- createTrelloTask : Quand l'utilisateur demande d'ajouter, créer, insérer une tâche
- completeTrelloTask : Quand l'utilisateur demande de marquer, compléter, terminer une tâche
- updateTrelloDueDate : Quand l'utilisateur demande de changer, modifier, mettre à jour une date d'échéance

FORMAT DES DATES:
- Toujours utiliser le format ISO 8601 : "2026-01-31T00:00:00Z"
- Si l'utilisateur dit "vendredi", calcule la date du prochain vendredi
- Si l'utilisateur dit "dans 3 jours", calcule la date correspondante

RÉPONSES:
- Sois concis et clair
- Confirme toujours les actions effectuées
- En cas d'erreur, explique clairement ce qui s'est passé
```

## 🔌 Étape 3 : Configurer les Actions

Cliquez sur **"Add Action"** et configurez les 3 actions suivantes :

### Action 1 : createTrelloTask

**Schema** :
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Trello Assistant API",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://trello-assistant-backend.onrender.com"
    }
  ],
  "paths": {
    "/assistant/trello": {
      "post": {
        "summary": "Créer une tâche Trello",
        "operationId": "createTrelloTask",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "tool_calls": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "id": {"type": "string"},
                        "type": {"type": "string", "enum": ["function"]},
                        "function": {
                          "type": "object",
                          "properties": {
                            "name": {"type": "string", "enum": ["createTrelloTask"]},
                            "arguments": {
                              "type": "string",
                              "description": "JSON string avec title (requis), list (optionnel), due_date (optionnel), board (optionnel)"
                            }
                          },
                          "required": ["name", "arguments"]
                        }
                      },
                      "required": ["id", "type", "function"]
                    }
                  }
                },
                "required": ["tool_calls"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Tâche créée avec succès",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {"type": "boolean"},
                    "results": {"type": "array"}
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**Note** : ChatGPT Custom GPTs utilise OpenAPI 3.1.0. La configuration ci-dessus est simplifiée. Pour une configuration complète, voir ci-dessous.

## 📝 Configuration complète des Actions (Alternative)

Si la configuration OpenAPI est trop complexe, vous pouvez créer 3 actions séparées :

### Action 1 : Créer une tâche

- **Method** : `POST`
- **URL** : `https://trello-assistant-backend.onrender.com/assistant/trello`
- **Headers** : 
  - `Content-Type: application/json`
- **Body** :
```json
{
  "tool_calls": [{
    "id": "{{$guid}}",
    "type": "function",
    "function": {
      "name": "createTrelloTask",
      "arguments": "{\"title\": \"{{title}}\", \"list\": \"{{list}}\", \"due_date\": \"{{due_date}}\"}"
    }
  }]
}
```

### Action 2 : Compléter une tâche

- **Method** : `POST`
- **URL** : `https://trello-assistant-backend.onrender.com/assistant/trello`
- **Body** :
```json
{
  "tool_calls": [{
    "id": "{{$guid}}",
    "type": "function",
    "function": {
      "name": "completeTrelloTask",
      "arguments": "{\"task_name\": \"{{task_name}}\", \"board\": \"{{board}}\"}"
    }
  }]
}
```

### Action 3 : Mettre à jour la date

- **Method** : `POST`
- **URL** : `https://trello-assistant-backend.onrender.com/assistant/trello`
- **Body** :
```json
{
  "tool_calls": [{
    "id": "{{$guid}}",
    "type": "function",
    "function": {
      "name": "updateTrelloDueDate",
      "arguments": "{\"task_name\": \"{{task_name}}\", \"due_date\": \"{{due_date}}\", \"board\": \"{{board}}\"}"
    }
  }]
}
```

## ⚠️ Limitation actuelle

ChatGPT Custom GPTs avec Actions nécessite une configuration OpenAPI complète. La méthode la plus simple est d'utiliser le **client JavaScript** fourni.

## ✅ Solution recommandée : Client JavaScript

Utilisez le client `examples/chatgpt-client.js` qui fait le pont entre ChatGPT et votre backend :

```bash
# Installer les dépendances
npm install

# Utiliser le client
node examples/chatgpt-client.js "Ajoute une tâche Test dans Nouvelles taches"
```

Ce client :
- ✅ Appelle l'API OpenAI avec les tools
- ✅ Reçoit les tool_calls de ChatGPT
- ✅ Appelle votre backend Render
- ✅ Retourne les résultats

## 🎯 Alternative : Interface Web simple

Créez une petite page HTML qui utilise le client JavaScript pour une interface plus conviviale.

