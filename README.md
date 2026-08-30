# Piscine Pro

Application de gestion et de suivi de la qualité de l'eau de piscine — by C. Guilhem.

React + Vite + Tailwind CSS, PWA installable, données stockées en local sur l'appareil
(`localStorage` du navigateur — rien n'est envoyé sur un serveur).

## Tester en local

Il faut Node.js (version 18 ou plus, LTS recommandée : https://nodejs.org).

```bash
npm install
npm run dev
```

L'appli s'ouvre sur http://localhost:5173

Pour construire la version de production (dossier `dist/`) :

```bash
npm run build
npm run preview
```

## Mettre en ligne sur GitHub puis Vercel

### 1. Créer le dépôt GitHub

```bash
git init
git add .
git commit -m "Première version de Piscine Pro"
```

Crée un nouveau dépôt vide sur https://github.com/new (sans README ni .gitignore,
puisqu'ils existent déjà ici), puis :

```bash
git remote add origin https://github.com/<ton-compte>/piscine-pro.git
git branch -M main
git push -u origin main
```

### 2. Déployer sur Vercel

**Option a — via le site Vercel (le plus simple) :**
1. Va sur https://vercel.com/new
2. Importe le dépôt GitHub `piscine-pro`
3. Vercel détecte automatiquement Vite — laisse les réglages par défaut
4. Clique sur "Deploy"

**Option b — via la CLI Vercel (comme pour VMA Pro / Fractionné GPS Pro) :**

```bash
npm install -g vercel
vercel login
vercel
```

Ensuite, à chaque modification :

```bash
git add .
git commit -m "Description de la modif"
git push
```

Vercel redéploie automatiquement à chaque push sur `main`.

## Installer l'appli sur le téléphone (PWA)

Une fois le site en ligne, ouvre l'URL Vercel dans le navigateur du téléphone puis :
- **Android (Chrome)** : menu ⋮ → "Installer l'application" / "Ajouter à l'écran d'accueil"
- **iPhone (Safari)** : bouton Partager → "Sur l'écran d'accueil"

L'appli fonctionne ensuite hors ligne, avec sa propre icône, comme une appli native.
