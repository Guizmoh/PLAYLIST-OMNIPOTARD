# Playlist

Un site pour partager tes morceaux (MP3, WAV…). Les visiteurs peuvent **noter** et **commenter sans créer de compte**, soit en général, soit à un **moment précis** du morceau (comme sur SoundCloud).
Toi seul, en mode créateur, vois **à quel moment de l'écoute** chaque commentaire a été écrit.

---

## 1. Mettre le site en ligne sur GitHub (5 min)

1. Crée un compte sur [github.com](https://github.com) si besoin.
2. Clique sur **New repository**, nomme-le par exemple `playlist`, coche **Public**, puis **Create repository**.
3. Clique sur **uploading an existing file** et glisse **tous les fichiers de ce dossier** (`index.html`, `style.css`, `app.js`, `config.js`, `tracks.json`, le dossier `music/`…). Clique sur **Commit changes**.
4. Va dans **Settings → Pages** : sous *Branch*, choisis `main` et `/ (root)`, puis **Save**.
5. Après 1 minute, ton site est en ligne à l'adresse :
   `https://TON-PSEUDO.github.io/playlist/`

C'est ce lien que tu partages. Chaque morceau a aussi son propre lien (bouton **Partager**).

## 2. Ajouter un morceau

**Le plus simple :** sur GitHub, ouvre le dossier `music/` → **Add file → Upload files**, et dépose :

- ton son : `mon-morceau.mp3` (ou `.wav`)
- sa pochette avec **le même nom** : `mon-morceau.jpg` (ou `.png`, `.webp`)

C'est tout ! Le morceau apparaît automatiquement sur le site, avec le titre « Mon morceau ».

**Pour choisir le titre, l'ordre ou ajouter une description**, modifie `tracks.json` :

```json
[
  {
    "file": "music/mon-morceau.mp3",
    "cover": "music/mon-morceau.jpg",
    "title": "Mon morceau",
    "description": "Enregistré en une nuit."
  }
]
```

Les morceaux de `tracks.json` s'affichent en premier, dans cet ordre ; les autres fichiers de `music/` suivent.

> **Taille des fichiers :** l'envoi par le site GitHub est limité à **25 Mo par fichier**. Pour les gros WAV (jusqu'à 100 Mo), utilise [GitHub Desktop](https://desktop.github.com) ou exporte en MP3 320 kbps.

> Supprime les morceaux de démo (`music/demo-*`) et leurs lignes dans `tracks.json`.

## 3. Activer les commentaires partagés (Supabase, gratuit)

Sans cette étape, le site marche en **mode démo** : les commentaires restent dans le navigateur de la personne qui les écrit. Pour les recevoir toi, de n'importe où :

1. Crée un compte sur [supabase.com](https://supabase.com) puis **New project** (choisis une région Europe, n'importe quel mot de passe).
2. Ouvre **SQL Editor → New query**, colle le contenu de `supabase.sql`, **remplace `ton-email@exemple.com` par ton e-mail** (tout en bas), puis **Run**.
3. Va dans **Authentication → Users → Add user → Create new user** : mets ton e-mail (le même) et un mot de passe. Coche *Auto Confirm User*.
4. Dans **Authentication → Sign In / Providers**, désactive **Allow new users to sign up** (personne d'autre ne pourra créer de compte).
5. Va dans **Project Settings → API** et copie :
   - **Project URL** → dans `config.js`, `supabaseUrl`
   - **anon public key** → dans `config.js`, `supabaseAnonKey`
   (Jamais la clé `service_role` !)
6. Envoie le nouveau `config.js` sur GitHub (ouvre le fichier sur GitHub → crayon ✏️ → colle → *Commit*).

## 4. Le mode créateur

Clique sur l'icône 👤 en haut à droite (ou va sur `…/playlist/#/admin`) et connecte-toi avec l'e-mail et le mot de passe de l'étape 3.

En mode créateur :

- sous chaque commentaire, une pastille verte **✎ écrit à 1:42** indique où en était l'écoute quand la personne a commencé à écrire (même si elle n'a pas attaché de timecode) ;
- ces moments apparaissent aussi comme petits points verts sous la forme d'onde ;
- tu peux supprimer des commentaires ;
- l'accueil de l'espace créateur montre le **classement des auditeurs** : un classement global (score de préférence + nombre de fois classé 1er) et la liste de chaque personne qui a classé tes morceaux ;
- il indique aussi le nombre de commentaires de chaque morceau, avec un lien vers sa page.

## Le classement des morceaux préférés

Sur l'accueil, sous la liste des morceaux (ou via **Mon classement** dans le menu), la section de classement permet à chaque visiteur de glisser-déposer les morceaux (ou d'utiliser les flèches sur mobile) dans son ordre de préférence. Une fois enregistré, l'accueil s'affiche dans son ordre à lui, et toi tu vois tous les classements dans l'espace créateur. Les visiteurs ne voient pas les classements des autres.

Ces informations ne sont jamais envoyées aux visiteurs (protégées côté base de données).

## Comment marche le timecode pour les visiteurs

- Pendant l'écoute, la pastille **🕒 à 1:23** suit la lecture, en gris.
- Dès que la personne commence à écrire, le moment est figé.
- Un clic sur la pastille l'active (orange) : le commentaire sera lié à ce passage. Dans l'espace créateur, il apparaît sur la forme d'onde et se clique pour réécouter le passage.

**Les commentaires sont privés** : les visiteurs ne voient pas les commentaires des autres (pour ne pas les intimider), seulement les leurs, gardés dans leur navigateur. Toi seul vois tout, en mode créateur.
- Sans clic, le commentaire est publié comme **général**.

## Personnaliser

Tout se règle dans `config.js` (nom du site, ton nom d'artiste, texte d'accueil, message sur les critiques constructives). Les couleurs sont en haut de `style.css` (`--accent`, `--bg`…). Le fichier `propositions.html` (les 4 maquettes) peut être supprimé.

## Tester sur ton ordinateur

Dans ce dossier : `python -m http.server 8000`, puis ouvre <http://localhost:8000>.
