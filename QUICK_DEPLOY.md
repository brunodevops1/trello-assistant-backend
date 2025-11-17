# 🚀 Déploiement Rapide sur Render (5 minutes)

## Étape 1 : Préparer Git (2 min)

```bash
# Initialiser Git
git init

# Ajouter tous les fichiers (sauf .env qui est déjà ignoré)
git add .

# Premier commit
git commit -m "Initial commit - Trello Assistant Backend"
```

## Étape 2 : Créer le repo GitHub (1 min)

1. Allez sur https://github.com/new
2. Nom du repo : `trello-assistant-backend` (ou votre choix)
3. **Ne cochez PAS** "Initialize with README"
4. Cliquez sur "Create repository"

## Étape 3 : Pousser le code (1 min)

```bash
# Remplacez VOTRE_USERNAME par votre nom d'utilisateur GitHub
git remote add origin https://github.com/VOTRE_USERNAME/trello-assistant-backend.git
git branch -M main
git push -u origin main
```

## Étape 4 : Déployer sur Render (1 min)

1. **Créer un compte** : https://render.com (gratuit, connectez-vous avec GitHub)

2. **Créer un Web Service** :
   - Cliquez sur "New +" → "Web Service"
   - Sélectionnez votre repository `trello-assistant-backend`
   - Render détectera automatiquement la configuration

3. **Configurer les variables d'environnement** :
   Dans la section "Environment", ajoutez :
   ```
   TRELLO_API_KEY=votre_clé_api_trello
   TRELLO_API_TOKEN=votre_token_trello
   TRELLO_DEFAULT_BOARD_ID=662e4f110f00816573774395
   OPENAI_API_KEY=votre_clé_openai (optionnel)
   ```

4. **Déployer** :
   - Cliquez sur "Create Web Service"
   - Render va automatiquement builder et déployer

5. **Attendre** : Le premier déploiement prend 2-3 minutes

## Étape 5 : Tester (30 sec)

Une fois déployé, vous obtiendrez une URL comme :
```
https://trello-assistant-backend.onrender.com
```

Testez avec :
```bash
curl https://votre-app.onrender.com/health
```

Devrait retourner : `{"status":"ok","service":"trello-assistant-backend"}`

## ✅ C'est tout !

Votre backend est maintenant accessible publiquement.

## 🔄 Mettre à jour le client ChatGPT

Dans `examples/chatgpt-client.js`, changez :
```javascript
const BACKEND_URL = 'https://votre-app.onrender.com';
```

## ⚠️ Note importante

Le plan gratuit Render met le service en veille après 15 minutes d'inactivité. Le premier appel après veille peut prendre 30-60 secondes.

Pour éviter cela, vous pouvez utiliser un service de ping gratuit comme UptimeRobot qui appelle `/health` toutes les 5 minutes.

## 📖 Guide détaillé

Pour plus de détails, consultez `DEPLOY_RENDER.md`

