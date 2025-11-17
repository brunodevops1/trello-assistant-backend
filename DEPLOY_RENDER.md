# 🚀 Déploiement sur Render (Gratuit)

Render offre un plan gratuit parfait pour ce backend. Voici comment déployer étape par étape.

## 📋 Prérequis

1. Un compte GitHub (gratuit)
2. Un compte Render (gratuit) : https://render.com
3. Votre projet doit être sur GitHub

## 🔧 Étape 1 : Préparer le projet sur GitHub

### 1.1 Initialiser Git (si pas déjà fait)

```bash
git init
git add .
git commit -m "Initial commit - Trello Assistant Backend"
```

### 1.2 Créer un repository sur GitHub

1. Allez sur https://github.com/new
2. Créez un nouveau repository (ex: `trello-assistant-backend`)
3. **Ne cochez PAS** "Initialize with README" (vous avez déjà les fichiers)

### 1.3 Pousser le code

```bash
git remote add origin https://github.com/VOTRE_USERNAME/trello-assistant-backend.git
git branch -M main
git push -u origin main
```

**⚠️ Important** : Assurez-vous que le fichier `.env` est dans `.gitignore` (déjà fait)

## 🌐 Étape 2 : Déployer sur Render

### 2.1 Créer un compte Render

1. Allez sur https://render.com
2. Cliquez sur "Get Started for Free"
3. Connectez-vous avec GitHub

### 2.2 Créer un nouveau Web Service

1. Dans le dashboard Render, cliquez sur **"New +"** → **"Web Service"**
2. Connectez votre repository GitHub
3. Sélectionnez votre repository `trello-assistant-backend`

### 2.3 Configurer le service

Render détectera automatiquement le `render.yaml`, mais vous pouvez aussi configurer manuellement :

**Settings :**
- **Name** : `trello-assistant-backend` (ou votre choix)
- **Environment** : `Node`
- **Build Command** : `npm install && npm run build`
- **Start Command** : `npm start`
- **Plan** : **Free** (gratuit)

### 2.4 Configurer les variables d'environnement

Dans la section **"Environment"**, ajoutez :

```
TRELLO_API_KEY=votre_clé_api_trello
TRELLO_API_TOKEN=votre_token_trello
TRELLO_DEFAULT_BOARD_ID=662e4f110f00816573774395
OPENAI_API_KEY=votre_clé_openai (optionnel)
PORT=10000
```

**⚠️ Important** : Sur Render, le PORT est automatiquement défini. Vous pouvez utiliser `process.env.PORT || 3000` dans le code (déjà fait).

### 2.5 Déployer

1. Cliquez sur **"Create Web Service"**
2. Render va automatiquement :
   - Cloner votre repo
   - Installer les dépendances
   - Builder le projet
   - Démarrer le serveur

### 2.6 Obtenir l'URL

Une fois déployé, Render vous donnera une URL comme :
```
https://trello-assistant-backend.onrender.com
```

## ✅ Étape 3 : Vérifier le déploiement

### 3.1 Test de santé

```bash
curl https://votre-app.onrender.com/health
```

Devrait retourner : `{"status":"ok","service":"trello-assistant-backend"}`

### 3.2 Test des tools

```bash
curl https://votre-app.onrender.com/assistant/tools
```

### 3.3 Test de création de tâche

```bash
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

## 🔄 Mise à jour du client ChatGPT

Une fois déployé, mettez à jour le client pour utiliser l'URL Render :

```javascript
const BACKEND_URL = 'https://votre-app.onrender.com';
```

Ou dans `.env` :
```
BACKEND_URL=https://votre-app.onrender.com
```

## ⚠️ Limitations du plan gratuit Render

- **Spin down** : Le service se met en veille après 15 minutes d'inactivité
- **Premier démarrage lent** : Le premier appel après veille peut prendre 30-60 secondes
- **Limite de bande passante** : 100 GB/mois (largement suffisant)
- **Limite de CPU/RAM** : 512 MB RAM (suffisant pour ce projet)

### Solution pour éviter le spin down

Si vous voulez éviter que le service se mette en veille, vous pouvez :
1. Utiliser un service de ping gratuit (ex: UptimeRobot) qui appelle `/health` toutes les 5 minutes
2. Passer au plan payant ($7/mois)

## 🐛 Dépannage

### Le service ne démarre pas

1. Vérifiez les **logs** dans le dashboard Render
2. Vérifiez que toutes les variables d'environnement sont définies
3. Vérifiez que `npm run build` fonctionne en local

### Erreur 502 Bad Gateway

- Le service est probablement en train de démarrer (attendez 30-60 secondes)
- Vérifiez les logs pour voir les erreurs

### Variables d'environnement non chargées

- Assurez-vous qu'elles sont bien définies dans le dashboard Render
- Redéployez après modification des variables

## 📝 Checklist de déploiement

- [ ] Code poussé sur GitHub
- [ ] Compte Render créé
- [ ] Web Service créé et connecté au repo
- [ ] Variables d'environnement configurées
- [ ] Build réussi
- [ ] Service démarré
- [ ] Tests de santé OK
- [ ] Tests des endpoints OK

## 🎉 C'est tout !

Votre backend est maintenant accessible publiquement et peut être utilisé par ChatGPT ou tout autre client.

**URL de votre backend** : `https://votre-app.onrender.com`

