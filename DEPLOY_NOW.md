# 🚀 Déploiement - Instructions Finales

## ✅ Ce qui a été fait

- ✅ Git initialisé
- ✅ Fichiers commités
- ✅ Projet prêt pour GitHub

## 📋 Prochaines étapes (5 minutes)

### 1. Créer le repository GitHub

1. Allez sur **https://github.com/new**
2. **Repository name** : `trello-assistant-backend` (ou votre choix)
3. **Description** : "Backend pour assistant Trello via OpenAI function calling"
4. **Visibilité** : Public ou Private (votre choix)
5. **⚠️ IMPORTANT** : Ne cochez PAS "Add a README file" (vous avez déjà un README)
6. Cliquez sur **"Create repository"**

### 2. Pousser le code sur GitHub

**Remplacez `VOTRE_USERNAME` par votre nom d'utilisateur GitHub** dans cette commande :

```bash
git remote add origin https://github.com/VOTRE_USERNAME/trello-assistant-backend.git
git branch -M main
git push -u origin main
```

Si GitHub vous demande vos identifiants, utilisez un **Personal Access Token** (pas votre mot de passe).

### 3. Déployer sur Render

1. **Créer un compte Render** :
   - Allez sur **https://render.com**
   - Cliquez sur **"Get Started for Free"**
   - Connectez-vous avec **GitHub**

2. **Créer un Web Service** :
   - Dans le dashboard, cliquez sur **"New +"** → **"Web Service"**
   - Sélectionnez votre repository `trello-assistant-backend`
   - Render détectera automatiquement la configuration

3. **Configurer le service** :
   - **Name** : `trello-assistant-backend` (ou votre choix)
   - **Environment** : `Node` (détecté automatiquement)
   - **Build Command** : `npm install && npm run build` (déjà configuré)
   - **Start Command** : `npm start` (déjà configuré)
   - **Plan** : **Free** (gratuit)

4. **Ajouter les variables d'environnement** :
   
   Dans la section **"Environment"**, ajoutez ces variables :
   
   ```
   TRELLO_API_KEY=1d40c72f018e327c7e6c5507895dd2ef
   TRELLO_API_TOKEN=ATTA4b0eceeb5da3fdcbc8475d35226919b1d029c17153da165caeeecd9981a97777C39CECA6
   TRELLO_DEFAULT_BOARD_ID=662e4f110f00816573774395
   OPENAI_API_KEY=votre_clé_openai (si vous en avez une)
   ```
   
   **⚠️ Important** : Collez vos vraies valeurs (celles de votre .env local)

5. **Déployer** :
   - Cliquez sur **"Create Web Service"**
   - Render va automatiquement :
     - Cloner votre repo
     - Installer les dépendances (`npm install`)
     - Builder le projet (`npm run build`)
     - Démarrer le serveur (`npm start`)
   - Le déploiement prend 2-3 minutes

6. **Obtenir l'URL** :
   - Une fois déployé, Render vous donnera une URL comme :
   - `https://trello-assistant-backend.onrender.com`
   - **Notez cette URL**, vous en aurez besoin !

### 4. Tester le déploiement

```bash
# Test de santé
curl https://votre-app.onrender.com/health

# Devrait retourner : {"status":"ok","service":"trello-assistant-backend"}

# Test des tools
curl https://votre-app.onrender.com/assistant/tools

# Test de création de tâche
curl -X POST https://votre-app.onrender.com/assistant/trello \
  -H "Content-Type: application/json" \
  -d '{
    "tool_calls": [{
      "id": "test_1",
      "type": "function",
      "function": {
        "name": "createTrelloTask",
        "arguments": "{\"title\": \"Test depuis Render\", \"list\": \"Nouvelles taches\"}"
      }
    }]
  }'
```

### 5. Mettre à jour le client ChatGPT

Dans `examples/chatgpt-client.js`, remplacez :
```javascript
const BACKEND_URL = 'http://localhost:3000';
```

Par :
```javascript
const BACKEND_URL = 'https://votre-app.onrender.com';
```

## 🎉 C'est tout !

Votre backend est maintenant déployé et accessible publiquement.

## 📝 Checklist

- [ ] Repository GitHub créé
- [ ] Code poussé sur GitHub
- [ ] Compte Render créé
- [ ] Web Service créé sur Render
- [ ] Variables d'environnement configurées
- [ ] Service déployé
- [ ] Tests de santé OK
- [ ] URL notée

## 🔄 Mises à jour futures

Pour mettre à jour le backend après des modifications :

```bash
git add .
git commit -m "Description des changements"
git push origin main
```

Render redéploiera automatiquement !

## ⚠️ Note importante

Le plan gratuit Render met le service en veille après 15 minutes d'inactivité. Le premier appel après veille peut prendre 30-60 secondes.

Pour éviter cela, vous pouvez utiliser **UptimeRobot** (gratuit) qui appelle `/health` toutes les 5 minutes :
1. Créez un compte sur https://uptimerobot.com
2. Ajoutez un monitor HTTP(s)
3. URL : `https://votre-app.onrender.com/health`
4. Intervalle : 5 minutes

## 🆘 Dépannage

Si le déploiement échoue :
1. Vérifiez les **logs** dans le dashboard Render
2. Vérifiez que toutes les variables d'environnement sont définies
3. Vérifiez que `npm run build` fonctionne en local

