# 🔒 Solution : Éviter les demandes d'autorisation répétées

## 🎯 Le problème

ChatGPT affiche : *"Certaines informations seront envoyées à trello-assistant-backend.onrender.com"* à chaque action.

## ✅ Solution en 3 étapes

### Étape 1 : Accepter la première fois

1. **Cliquez sur "Confirmer"** dans la popup d'autorisation
2. Cela permet à ChatGPT de se connecter une première fois

### Étape 2 : Configurer l'authentification dans le Custom GPT

1. Dans ChatGPT, cliquez sur votre **Custom GPT "Trello Assistant"**
2. Cliquez sur le **crayon (Edit)** en haut à droite
3. Allez dans l'onglet **"Actions"** (à gauche)
4. Vous devriez voir votre Action avec le schéma OpenAPI
5. **Scrollez vers le bas** jusqu'à la section **"Authentication"**
6. Cliquez sur **"Add authentication"** ou modifiez l'existant
7. Configurez :
   - **Type** : `API Key`
   - **Name** : `X-API-Key`
   - **Location** : `Header`
   - **Value** : `trello-assistant` (ou n'importe quelle valeur)
8. Cliquez sur **"Save"** (en haut à droite)

### Étape 3 : Vérifier le schéma OpenAPI

Assurez-vous que votre schéma OpenAPI contient bien la section `security` :

```json
{
  "components": {
    "securitySchemes": {
      "ApiKeyAuth": {
        "type": "apiKey",
        "in": "header",
        "name": "X-API-Key"
      }
    }
  },
  "security": [
    {
      "ApiKeyAuth": []
    }
  ]
}
```

**Le fichier `openapi-schema.json` contient déjà cette configuration.**

## 🔍 Vérification

Après avoir configuré l'authentification :

1. **Fermez et rouvrez** votre conversation avec le Custom GPT
2. Testez avec : *"Ajoute une tâche Test"*
3. ChatGPT ne devrait **plus demander l'autorisation**

## ⚠️ Si ça ne fonctionne pas

### Option A : Recréer l'Action

1. Supprimez l'Action existante
2. Créez une nouvelle Action
3. Collez le contenu de `openapi-schema.json` dans "Schema"
4. Configurez l'authentification **immédiatement** (avant de sauvegarder)
5. Sauvegardez

### Option B : Utiliser le schéma simplifié

Utilisez le fichier `openapi-schema-simple.json` qui est une version minimale avec l'authentification.

### Option C : Vérifier que le backend accepte les requêtes

Testez manuellement :

```bash
curl -X POST https://trello-assistant-backend.onrender.com/assistant/trello \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test" \
  -d '{"tool_calls": []}'
```

Le backend devrait répondre (même avec une erreur de format, c'est normal).

## 📝 Notes importantes

- **La première fois**, ChatGPT demandera toujours l'autorisation (c'est normal)
- **Après configuration de l'authentification**, ChatGPT stocke la clé et ne redemande plus
- **Le backend accepte les requêtes avec ou sans clé** (pour compatibilité)
- Si vous **modifiez le schéma**, vous devrez peut-être reconfigurer l'authentification

## 🎯 Résultat attendu

Après configuration :
- ✅ Plus de popup "Certaines informations seront envoyées..."
- ✅ Les actions Trello s'exécutent directement
- ✅ ChatGPT utilise automatiquement la clé API stockée

