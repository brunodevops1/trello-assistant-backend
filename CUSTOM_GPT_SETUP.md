# 🤖 Configuration Custom GPT pour ChatGPT Plus

Guide étape par étape pour créer un Custom GPT qui utilise votre backend Trello.

## ✅ Prérequis

- ✅ Compte **ChatGPT Plus** (actif)
- ✅ Backend déployé : `https://trello-assistant-backend.onrender.com`
- ✅ Votre clé OpenAI API (pour tester)

## 🚀 Étape 1 : Créer le Custom GPT

1. Allez sur **https://chat.openai.com**
2. Cliquez sur votre nom en bas à gauche
3. Cliquez sur **"My GPTs"**
4. Cliquez sur **"Create a GPT"** (bouton vert en haut à droite)
5. Cliquez sur **"Configure"** (onglet en haut)

## 📝 Étape 2 : Configurer les informations de base

### Name
```
Trello Assistant
```

### Description
```
Assistant pour gérer vos tâches Trello. Crée, modifie et complète des tâches automatiquement via votre board Trello.
```

### Instructions (copiez-collez tout ceci)
```
Tu es un assistant spécialisé dans la gestion de tâches Trello.

RÔLE:
- Tu aides les utilisateurs à gérer leurs tâches Trello via des commandes en langage naturel.
- Tu dois TOUJOURS utiliser les actions (Actions) disponibles pour exécuter les actions Trello.
- Ne réponds JAMAIS en texte libre quand une action Trello est possible - utilise toujours une action.

ACTIONS DISPONIBLES:
1. createTrelloTask - Crée une nouvelle tâche dans Trello
2. completeTrelloTask - Marque une tâche comme terminée (déplace vers "Terminé")
3. updateTrelloDueDate - Met à jour la date d'échéance d'une tâche

QUAND UTILISER CHAQUE ACTION:
- createTrelloTask : Quand l'utilisateur demande d'ajouter, créer, insérer une tâche
  → Paramètres: title (requis), list (optionnel, défaut "Nouvelles taches"), due_date (optionnel, format ISO), board (optionnel)
  
- completeTrelloTask : Quand l'utilisateur demande de marquer, compléter, terminer une tâche
  → Paramètres: task_name (requis), board (optionnel)
  
- updateTrelloDueDate : Quand l'utilisateur demande de changer, modifier, mettre à jour une date d'échéance
  → Paramètres: task_name (requis), due_date (requis, format ISO), board (optionnel)

FORMAT DES DATES:
- Toujours utiliser le format ISO 8601 : "2026-01-31T00:00:00Z"
- Si l'utilisateur dit "vendredi", calcule la date du prochain vendredi
- Si l'utilisateur dit "dans 3 jours", calcule la date correspondante
- Si l'utilisateur dit "aujourd'hui", utilise la date d'aujourd'hui à minuit UTC

EXEMPLES DE REQUÊTES:
- "Ajoute une tâche Préparer le budget dans Nouvelles taches pour vendredi"
  → createTrelloTask(title="Préparer le budget", list="Nouvelles taches", due_date="2026-01-XXT00:00:00Z")
  
- "Marque Médiation SNCF comme terminée"
  → completeTrelloTask(task_name="Médiation SNCF")
  
- "Change la date de Renouvellement RTE au 31 janvier"
  → updateTrelloDueDate(task_name="Renouvellement RTE", due_date="2026-01-31T00:00:00Z")

RÉPONSES:
- Sois concis et clair
- Confirme toujours les actions effectuées avec un message positif
- En cas d'erreur, explique clairement ce qui s'est passé et propose une solution
- Si une tâche n'est pas trouvée, suggère des noms similaires si possible
```

## 🔌 Étape 3 : Ajouter l'Action (API)

1. Cliquez sur **"Add Action"** (section Actions)
2. Dans **"Schema"**, collez le contenu du fichier `openapi-schema.json` (voir ci-dessous)
3. **IMPORTANT** : Dans le champ **"Authentication"**, configurez :
   - **Type** : `API Key`
   - **Name** : `X-API-Key`
   - **Location** : `Header`
   - **Value** : Vous pouvez laisser vide ou mettre une valeur simple comme `trello-assistant` (le backend l'accepte optionnellement)
4. Cliquez sur **"Save"** pour sauvegarder l'authentification

### Schema OpenAPI (à coller dans "Schema")

Copiez le contenu du fichier `openapi-schema.json` que j'ai créé, ou utilisez cette version simplifiée :

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
        "summary": "Exécuter une action Trello",
        "operationId": "executeTrelloAction",
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
                            "name": {
                              "type": "string",
                              "enum": ["createTrelloTask", "completeTrelloTask", "updateTrelloDueDate"]
                            },
                            "arguments": {
                              "type": "string",
                              "description": "JSON string avec les paramètres"
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
            "description": "Succès",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
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

## 🎨 Étape 4 : Personnaliser (optionnel)

### Conversation starters (exemples de messages)
- "Ajoute une tâche Test dans Nouvelles taches"
- "Marque ma dernière tâche comme terminée"
- "Quelles sont mes tâches en cours ?"

### Capabilities
- ✅ Web Browsing (optionnel)
- ✅ DALL·E Image Generation (non nécessaire)
- ✅ Code Interpreter (non nécessaire)

## ✅ Étape 5 : Sauvegarder et tester

1. Cliquez sur **"Save"** en haut à droite
2. Choisissez **"Only me"** ou **"Anyone with a link"**
3. Cliquez sur **"Confirm"**

## 🧪 Tester votre Custom GPT

1. Retournez à la conversation ChatGPT
2. Votre Custom GPT "Trello Assistant" devrait apparaître dans la liste
3. Testez avec : **"Ajoute une tâche Test dans Nouvelles taches"**

## ⚠️ Notes importantes

- **Authentification** : Configurez une API Key dans ChatGPT (même simple) pour éviter les demandes d'autorisation répétées. Le backend accepte les requêtes avec ou sans clé pour compatibilité.
- **Format des arguments** : Les `arguments` doivent être une **string JSON**, pas un objet JSON
- **Erreurs** : Si une action échoue, ChatGPT affichera le message d'erreur du backend
- **Demandes d'autorisation** : Si ChatGPT demande toujours l'autorisation, vérifiez que vous avez bien configuré l'authentification dans l'Action (étape 3)

## 🔒 Éviter les demandes d'autorisation répétées

**Problème** : ChatGPT demande l'autorisation à chaque action.

**Solution** : Configurez l'authentification dans l'Action :

1. Dans votre Custom GPT, allez dans **"Configure"** → **"Actions"**
2. Cliquez sur votre Action (ou créez-en une)
3. Dans la section **"Authentication"** :
   - **Type** : Sélectionnez `API Key`
   - **Name** : `X-API-Key`
   - **Location** : `Header`
   - **Value** : Vous pouvez mettre n'importe quelle valeur (ex: `trello-assistant`) ou laisser vide
4. Cliquez sur **"Save"**

**Pourquoi ça fonctionne** : 
- ChatGPT stocke la clé API une fois configurée
- Le backend accepte les requêtes avec ou sans clé (pour compatibilité)
- Une fois la clé configurée, ChatGPT ne demandera plus l'autorisation

**Note** : Si vous changez le schéma OpenAPI, vous devrez peut-être reconfigurer l'authentification.

## 🔧 Dépannage

### ChatGPT demande toujours l'autorisation
- ✅ Vérifiez que vous avez bien configuré l'authentification dans l'Action (voir section ci-dessus)
- ✅ Vérifiez que le schéma OpenAPI contient bien la section `security` (déjà inclus dans `openapi-schema.json`)
- ✅ Essayez de supprimer et recréer l'Action avec l'authentification

### L'action ne s'exécute pas
- Vérifiez que le schema OpenAPI est valide (pas d'erreurs de syntaxe)
- Vérifiez que l'URL du serveur est correcte
- Testez le backend directement : `curl https://trello-assistant-backend.onrender.com/health`

### Erreur "Invalid schema"
- Vérifiez que le JSON est valide (utilisez un validateur JSON)
- Assurez-vous que tous les champs `required` sont présents

### ChatGPT ne comprend pas quand utiliser l'action
- Améliorez les Instructions avec plus d'exemples
- Soyez plus explicite dans les exemples de requêtes

## 📚 Ressources

- Backend URL : `https://trello-assistant-backend.onrender.com`
- Health check : `https://trello-assistant-backend.onrender.com/health`
- Tools : `https://trello-assistant-backend.onrender.com/assistant/tools`

