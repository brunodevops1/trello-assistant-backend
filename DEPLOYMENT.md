# Guide de déploiement

Ce document explique comment déployer le backend Trello Assistant sur différentes plateformes.

## 🚀 Déploiement local

Le serveur est déjà démarré en local. Pour le relancer :

```bash
npm run dev    # Mode développement
npm start      # Mode production (nécessite npm run build d'abord)
```

## ☁️ Déploiement sur Render

1. **Créer un compte** sur [render.com](https://render.com)

2. **Créer un nouveau Web Service** :
   - Connecter votre repository Git
   - Render détectera automatiquement le `render.yaml`

3. **Configurer les variables d'environnement** dans le dashboard Render :
   - `TRELLO_API_KEY`
   - `TRELLO_API_TOKEN`
   - `TRELLO_DEFAULT_BOARD_ID`
   - `OPENAI_API_KEY` (optionnel)
   - `PORT` (sera défini automatiquement)

4. **Déployer** : Render build et déploie automatiquement

**Build Command** : `npm install && npm run build`  
**Start Command** : `npm start`

## 🚂 Déploiement sur Railway

1. **Créer un compte** sur [railway.app](https://railway.app)

2. **Créer un nouveau projet** :
   - "New Project" → "Deploy from GitHub repo"
   - Sélectionner votre repository

3. **Configurer les variables d'environnement** :
   - Ouvrir "Variables" dans le dashboard
   - Ajouter :
     - `TRELLO_API_KEY`
     - `TRELLO_API_TOKEN`
     - `TRELLO_DEFAULT_BOARD_ID`
     - `OPENAI_API_KEY` (optionnel)

4. **Déployer** : Railway détecte automatiquement le `railway.json`

Railway détecte automatiquement Node.js et exécute les commandes de build/start.

## ▲ Déploiement sur Vercel

1. **Installer Vercel CLI** :
   ```bash
   npm i -g vercel
   ```

2. **Déployer** :
   ```bash
   vercel
   ```

3. **Configurer les variables d'environnement** :
   ```bash
   vercel env add TRELLO_API_KEY
   vercel env add TRELLO_API_TOKEN
   vercel env add TRELLO_DEFAULT_BOARD_ID
   vercel env add OPENAI_API_KEY
   ```

Ou via le dashboard Vercel : Settings → Environment Variables

**Note** : Vercel est optimisé pour les fonctions serverless. Pour une application Express complète, Render ou Railway sont plus adaptés.

## 🐳 Déploiement avec Docker (optionnel)

Créer un `Dockerfile` :

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Puis déployer sur n'importe quelle plateforme supportant Docker (Railway, Render, AWS, etc.).

## ✅ Vérification après déploiement

Une fois déployé, testez les endpoints :

```bash
# Health check
curl https://votre-app.render.com/health

# Récupérer les tools
curl https://votre-app.render.com/assistant/tools
```

## 🔒 Sécurité

- ✅ Ne jamais commiter le fichier `.env`
- ✅ Utiliser les variables d'environnement de la plateforme
- ✅ Activer HTTPS (automatique sur Render/Railway/Vercel)
- ✅ Limiter les CORS si nécessaire (actuellement ouvert à tous)

## 📝 Notes importantes

- **Render** : Gratuit avec limitations, idéal pour démarrer
- **Railway** : Payant mais très simple, excellent pour les projets
- **Vercel** : Gratuit pour les projets open-source, optimisé serverless

Pour ce projet, **Render** ou **Railway** sont recommandés car ils supportent mieux les applications Express long-running.

