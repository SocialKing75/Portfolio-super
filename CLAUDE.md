# Règles du portfolio

## Section « À propos » (page d'accueil, `index.html`)

- Un nouvel élément s'ajoute **en premier** (juste après le titre « À propos de Joë Deriu »),
  sous forme de bloc `.home__hackathon` avec le badge `<span class="badge-new badge-new--corner" data-translate="Nouveau">Nouveau</span>`.
- Quand un élément est ajouté, **retirer le badge « Nouveau » des éléments précédents** :
  seul le plus récent le porte. (`js/main.js` l'applique aussi automatiquement au chargement.)
- Chaque élément porte sa date de publication (jour de l'ajout) :
  `<time class="hackathon-card__date" datetime="AAAA-MM-JJ">Publié le …</time>` avant le titre ;
  `js/main.js` la reformate dans la langue choisie.
- Tout nouveau texte est traduit dans les 5 langues de `js/translations.js` (fr, en, es, de, zh).
