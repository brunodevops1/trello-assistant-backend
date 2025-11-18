# 🔄 Mettre à jour votre Custom GPT avec les nouvelles fonctionnalités

## 🎯 Problème

ChatGPT indique que les actions `archiveTrelloTask` et `moveTrelloTask` ne sont pas disponibles car le schéma OpenAPI dans votre Custom GPT n'a pas été mis à jour.

## ✅ Solution : Mettre à jour le schéma OpenAPI

### Étape 1 : Ouvrir votre Custom GPT

1. Allez sur **https://chat.openai.com**
2. Cliquez sur votre nom → **"My GPTs"**
3. Cliquez sur votre Custom GPT **"Trello Assistant"**
4. Cliquez sur le **crayon (Edit)** en haut à droite
5. Allez dans l'onglet **"Actions"** (à gauche)

### Étape 2 : Mettre à jour le schéma

1. Dans la section **"Schema"**, vous devriez voir le schéma OpenAPI actuel
2. **Sélectionnez tout le contenu** (Ctrl+A / Cmd+A) et **supprimez-le**
3. **Copiez-collez** le contenu complet du fichier `openapi-schema.json` (voir ci-dessous)
4. **Vérifiez** que la ligne avec `"enum"` contient bien les 5 actions :
   ```json
   "enum": ["createTrelloTask", "completeTrelloTask", "updateTrelloDueDate", "archiveTrelloTask", "moveTrelloTask"]
   ```
5. Cliquez sur **"Save"** (en haut à droite)

### Étape 3 : Vérifier l'authentification

Assurez-vous que l'authentification est toujours configurée :
- **Type** : `API Key`
- **Name** : `X-API-Key`
- **Location** : `Header`
- **Value** : `trello-assistant` (ou votre valeur)

### Étape 4 : Tester

1. Fermez et rouvrez votre conversation avec le Custom GPT
2. Testez avec : **"Archive la tâche Test"**
3. ChatGPT devrait maintenant reconnaître l'action `archiveTrelloTask`

## 📋 Schéma OpenAPI complet (à copier-coller)

Voici le schéma complet avec les 5 actions :

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Trello Assistant API",
    "version": "1.0.0",
    "description": "API pour gérer les tâches Trello via ChatGPT"
  },
  "servers": [
    {
      "url": "https://trello-assistant-backend.onrender.com",
      "description": "Backend Render (Production)"
    }
  ],
  "components": {
    "securitySchemes": {
      "ApiKeyAuth": {
        "type": "apiKey",
        "in": "header",
        "name": "X-API-Key",
        "description": "Clé API simple pour authentification (optionnelle mais recommandée pour éviter les demandes d'autorisation)"
      }
    }
  },
  "security": [
    {
      "ApiKeyAuth": []
    }
  ],
  "paths": {
    "/assistant/trello": {
      "post": {
        "summary": "Exécuter une action Trello",
        "description": "Crée, complète, met à jour, archive ou déplace une tâche Trello",
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
                        "id": {
                          "type": "string"
                        },
                        "type": {
                          "type": "string",
                          "enum": ["function"]
                        },
                        "function": {
                          "type": "object",
                          "properties": {
                            "name": {
                              "type": "string",
                              "enum": ["createTrelloTask", "completeTrelloTask", "updateTrelloDueDate", "archiveTrelloTask", "moveTrelloTask"]
                            },
                            "arguments": {
                              "type": "string",
                              "description": "JSON string contenant les paramètres de la fonction"
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
            "description": "Action exécutée avec succès",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "results": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "success": {
                            "type": "boolean"
                          },
                          "message": {
                            "type": "string"
                          },
                          "error": {
                            "type": "string"
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
      }
    }
  }
}
```

## 🔍 Vérification rapide

Après avoir mis à jour le schéma, vérifiez que :
- ✅ Le schéma contient bien les 5 actions dans `"enum"`
- ✅ L'authentification est toujours configurée
- ✅ L'URL du serveur est correcte : `https://trello-assistant-backend.onrender.com`

## ⚠️ Note importante

Si vous avez plusieurs Actions configurées, vous devez mettre à jour **toutes** les Actions avec le nouveau schéma, ou supprimer les anciennes et n'en garder qu'une seule.

## 🎯 Actions disponibles après mise à jour

1. ✅ `createTrelloTask` - Créer une tâche
2. ✅ `completeTrelloTask` - Marquer comme terminée
3. ✅ `updateTrelloDueDate` - Modifier la date d'échéance
4. ✅ `archiveTrelloTask` - **NOUVEAU** : Archiver une tâche
5. ✅ `moveTrelloTask` - **NOUVEAU** : Déplacer une tâche

## 📝 Exemples d'utilisation

- **"Archive la tâche Test"** → `archiveTrelloTask(task_name="Test")`
- **"Déplace Budget vers En cours"** → `moveTrelloTask(task_name="Budget", target_list="En cours")`
- **"Transfère la tâche Test dans Terminé"** → `moveTrelloTask(task_name="Test", target_list="Terminé")`

