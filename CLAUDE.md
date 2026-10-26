# Règles du portfolio

## Section « À propos » (page d'accueil, `index.html`)

- Un nouvel élément s'ajoute **en premier** (juste après le titre « À propos de Joë Deriu »),
  sous forme de bloc `.home__hackathon` avec le badge `<span class="badge-new badge-new--corner" data-translate="Nouveau">Nouveau</span>`.
- Quand un élément est ajouté, **retirer le badge « Nouveau » des éléments précédents** :
  seul le plus récent le porte. (`js/main.js` l'applique aussi automatiquement au chargement.)
- Chaque élément porte, avant le titre, dans `<p class="hackathon-card__meta">` :
  la date de l'événement `<time class="hackathon-card__event" datetime="AAAA-MM" data-event-start="AAAA-MM" [data-event-end="AAAA-MM"]>`
  puis la date de publication (jour de l'ajout) `<time class="hackathon-card__date" datetime="AAAA-MM-JJ">Publié le …</time>`.
  `js/main.js` les reformate dans la langue choisie. Ne jamais inventer une date d'événement : la demander.
- Tout nouveau texte est traduit dans les 5 langues de `js/translations.js` (fr, en, es, de, zh).
