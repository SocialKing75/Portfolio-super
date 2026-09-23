# Journal de bord — Portfolio

Chronologie des interventions sur le site, avec le constat, ce qui a été fait et les décisions.

---

## 2026-09-23 (suite) — Pages Projets et Parcours

### Constat

Scores mesurés en ligne après le premier lot : **accueil 67, projets 62, parcours (about) 72**.
Lighthouse mobile en local sur le même code : accueil 94, projets 66, about 90.

- **Projets** : 24 photos Unsplash chargées d'un coup (12 cartes en 800 px + 12 images de modales
  en 1200 px, jusqu'à 470 Ko). L'image LCP (1re carte) s'affichait à **10,7 s**.
- **About** : décalage de mise en page (CLS 0,07) sur la frise, dû à Marianne Bold qui arrivait tard
  (changement de police pendant l'affichage).

### Ce qui a été fait

- **Cartes projets** : les 12 images auto-hébergées en WebP 400/600/800 px (ratio 2:1) dans
  `assets/projects/`, avec `srcset`/`sizes`, `width`/`height`. 1re carte en `fetchpriority="high"`,
  les autres en `loading="lazy"`.
- **Modales projets** : image en `data-src`, chargée seulement à l'ouverture (`openModal()` dans
  `js/modals.js`, utilisée par le clic sur une carte et par l'ouverture via `#project-N`).
  Restent sur Unsplash, en 1000 px.
- **Marianne Bold** préchargée sur les 6 pages (en plus de Regular).

### Vérification (Lighthouse mobile en local)

| Page | Avant | Après |
|---|---|---|
| Accueil | 94 | 95 |
| Projets | 66 | 86 (LCP 10,7 s → 3,8 s) |
| About | 90 | 93 (CLS 0,07 → 0) |

Test manuel : cartes affichées, modale ouverte avec son image, aucune erreur console.
Les scores en ligne sont plus bas qu'en local (réseau réel, variabilité de PageSpeed ±10 pts).

**Scores en ligne après déploiement (PageSpeed mobile) :**

| Page | Départ | Après lot 1 | Après lot 2 |
|---|---|---|---|
| Accueil | 48 | 67 | **91** |
| Projets | — | 62 | **98** |
| About | — | 72 | **95** |
| Skills | — | — | **96** |

### Pistes restantes

- `style.css` (56 Ko, non minifié) bloque encore le rendu : extraire le CSS critique ou le minifier.
- Font Awesome : 147 Ko de police pour une vingtaine d'icônes → passer en SVG inline ou en sous-ensemble.

---

## 2026-09-23 — Performance mobile (Lighthouse : 48)

### Constat

Score Performance mobile à **48**. Causes identifiées, par ordre d'impact :

1. **`portrait.jpg` : 4065×6098 px, 1,6 Mo**, affiché en 220 px sur mobile (280 px sur desktop).
   C'est l'image LCP de l'accueil.
2. **Préchargeur de 2,3 s** qui masque la page. Lighthouse démarre toujours sans session,
   donc il le voit à chaque test.
3. **CSS externes bloquant le rendu** : Font Awesome `all.min.css` (~100 Ko) et Google Fonts
   Bai Jamjuree (police utilisée seulement en anglais, Marianne étant active en français).
4. **Logo `logo-jd-sunset.png` : 451×361 px, 112 Ko** pour ~52 px de haut, aussi utilisé en favicon.
5. Scripts JS en fin de `<body>` sans `defer`.

### Ce qui a été fait

- **Portrait** : recadrage carré (même zone que celle visible via `object-position: center top`),
  export `assets/portrait-400.webp` (9 Ko), `assets/portrait-800.webp` (29 Ko),
  `assets/portrait-800.jpg` (50 Ko, secours). Dans `index.html` : `<picture>` + `srcset`/`sizes`,
  `width`/`height`, `fetchpriority="high"`, et `<link rel="preload">` de l'image.
- **Préchargeur désactivé sur mobile** (≤ 768 px) via le script inline du `<head>` de `index.html`.
  Desktop inchangé. *Pour le remettre sur mobile : retirer le test `matchMedia(...)`.*
- **CSS non bloquantes** sur les 6 pages : Font Awesome et Google Fonts chargées en
  `media="print" onload="this.media='all'"`, avec `<noscript>` de secours.
- **Logo** → `assets/logo-jd-sunset-150.webp` (6 Ko), avec `width`/`height`.
  **Favicon** → `assets/favicon.png` (2 Ko).
- **Scripts** : `defer` sur tous les `<script src>` des 6 pages.
- **Préconnexions** à `cdn.jsdelivr.net` et `cdnjs.cloudflare.com`, préchargement de
  `Marianne-Regular.woff2`.

### Vérification

Test local en 390×844 (Playwright) : rendu correct, icônes présentes, traductions appliquées,
aucune erreur console. L'image chargée est `portrait-400.webp`.

**Score Lighthouse en ligne après déploiement : accueil 48 → 67.**

### Reste à faire / pistes

- Relancer Lighthouse mobile après déploiement et noter le score ici.
- `portrait.jpg` (1,6 Mo) n'est plus référencé : peut être supprimé du dépôt.
- `logo-jd-sunset.png` d'origine n'est plus référencé non plus.
- Si besoin d'aller plus loin : sous-ensemble Font Awesome (seules quelques icônes utilisées),
  en-têtes de cache longs sur `/assets/` dans `vercel.json`, animation `blob-morph`
  (repeint continu du `border-radius`).
