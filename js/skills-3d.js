// Maquette 3D des compétences : un bâtiment isométrique dont chaque étage est une catégorie.
// Les données sont lues dans la grille .sk-card / .sk-soft de la page, pour ne rien dupliquer.
document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('sk3d');
    if (!root) return;

    const LEVELS = { mid: 1, high: 2, expert: 3 };
    const W = 600, D = 340, H = 60;
    // Emprise de chaque étage [x, y, largeur, profondeur] : le bâtiment se rétrécit en gradins
    // côté visible, ce qui dégage des terrasses comme sur une vraie maquette.
    const FOOTPRINTS = [
        [0, 0, 600, 340],
        [40, 0, 560, 320],
        [40, 0, 500, 280],
        [100, 0, 440, 280],
        [100, 0, 380, 230]
    ];

    const floors = [...document.querySelectorAll('.sk-card')].map(card => ({
        title: card.querySelector('.sk-card__title').textContent.trim(),
        icon: card.querySelector('.sk-card__icon i').className,
        skills: [...card.querySelectorAll('.sk-item')].map(item => {
            const lvl = item.querySelector('.sk-level');
            const key = Object.keys(LEVELS).find(k => lvl.classList.contains('sk-level--' + k)) || 'mid';
            return { name: item.querySelector('.sk-name').textContent.trim(), level: lvl.textContent.trim(), rank: LEVELS[key], icon: null };
        })
    }));
    const soft = document.querySelector('.sk-soft');
    if (soft) {
        floors.push({
            title: 'Soft Skills',
            icon: 'fa-solid fa-star',
            skills: [...soft.querySelectorAll('.sk-tag')].map(tag => ({
                name: tag.textContent.trim(), level: 'Savoir-être', rank: 2,
                icon: tag.querySelector('i')?.className || null
            }))
        });
    }
    if (!floors.length) return;

    const el = (tag, cls, html) => {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (html !== undefined) n.innerHTML = html;
        return n;
    };

    // Boîte : faces avant (y = profondeur) et gauche (x = 0), plus un dessus optionnel.
    const box = (w, d, h, cls) => {
        const b = el('div', 'sk3d-box ' + (cls || ''));
        b.style.width = w + 'px'; b.style.height = d + 'px';
        const front = el('div', 'sk3d-face sk3d-face--front');
        front.style.cssText = `width:${w}px;height:${h}px;transform:translateY(${d}px) rotateX(90deg)`;
        const left = el('div', 'sk3d-face sk3d-face--left');
        left.style.cssText = `width:${d}px;height:${h}px;transform:rotateZ(90deg) rotateX(90deg)`;
        const top = el('div', 'sk3d-face sk3d-face--top');
        top.style.cssText = `width:${w}px;height:${d}px;transform:translateZ(${h}px)`;
        b.append(front, left, top);
        return b;
    };

    // --- Mobilier ---
    // Chaque objet : [x, y, largeur, profondeur] en fraction de la pièce, puis hauteur et altitude
    // en pixels (mises à l'échelle de la pièce), puis le matériau.
    const desk = [
        [0.18, 0.18, 0.64, 0.3, 20, 0, 'wood'],
        [0.34, 0.2, 0.32, 0.05, 22, 20, 'screen'],
        [0.4, 0.58, 0.2, 0.16, 12, 0, 'accent'],
        [0.4, 0.74, 0.2, 0.04, 28, 0, 'accent']
    ];
    const plant = [
        [0.84, 0.1, 0.09, 0.09, 12, 0, 'pot'],
        [0.82, 0.08, 0.13, 0.13, 16, 12, 'plant']
    ];
    const chairs = (y) => [0.24, 0.42, 0.6].map(x => [x, y, 0.12, 0.1, 10, 0, 'accent']);
    // Un espace différent par compétence, comme les zones d'un plan (café, agora, accueil…).
    const ZONE_KINDS = {
        // Langages
        openspace: [
            [0.08, 0.2, 0.84, 0.22, 18, 0, 'wood'],
            [0.14, 0.22, 0.16, 0.04, 18, 18, 'screen'],
            [0.42, 0.22, 0.16, 0.04, 18, 18, 'screen'],
            [0.7, 0.22, 0.16, 0.04, 18, 18, 'screen'],
            ...chairs(0.56).map(([x, ...r]) => [x - 0.06, ...r]),
            [0.84, 0.56, 0.09, 0.1, 10, 0, 'accent']
        ],
        labo: [
            [0.08, 0.1, 0.12, 0.2, 46, 0, 'rack'],
            [0.08, 0.34, 0.12, 0.2, 46, 0, 'rack'],
            [0.08, 0.58, 0.12, 0.2, 46, 0, 'rack'],
            [0.42, 0.3, 0.44, 0.24, 18, 0, 'wood'],
            [0.52, 0.32, 0.24, 0.05, 20, 18, 'screen'],
            [0.58, 0.66, 0.12, 0.12, 12, 0, 'accent']
        ],
        tableur: [
            [0.1, 0.06, 0.8, 0.04, 34, 10, 'screen'],
            [0.22, 0.42, 0.56, 0.24, 18, 0, 'wood'],
            [0.4, 0.44, 0.2, 0.04, 16, 18, 'screen'],
            [0.44, 0.74, 0.12, 0.12, 12, 0, 'accent'],
            ...plant
        ],
        electronique: [
            [0.1, 0.12, 0.8, 0.26, 20, 0, 'wood'],
            [0.18, 0.18, 0.12, 0.1, 8, 20, 'rack'],
            [0.38, 0.16, 0.2, 0.14, 4, 20, 'accent'],
            [0.66, 0.16, 0.1, 0.12, 12, 20, 'white'],
            [0.3, 0.52, 0.12, 0.12, 12, 0, 'accent'],
            [0.6, 0.52, 0.12, 0.12, 12, 0, 'accent'],
            [0.82, 0.66, 0.12, 0.24, 30, 0, 'white']
        ],
        // Bureautique & Data
        archives: [
            [0.06, 0.08, 0.1, 0.84, 40, 0, 'white'],
            [0.22, 0.08, 0.1, 0.84, 40, 0, 'white'],
            [0.5, 0.3, 0.4, 0.24, 18, 0, 'wood'],
            [0.6, 0.32, 0.2, 0.04, 16, 18, 'screen'],
            [0.64, 0.64, 0.12, 0.12, 12, 0, 'accent']
        ],
        dashboards: [
            [0.08, 0.06, 0.38, 0.04, 30, 12, 'screen'],
            [0.54, 0.06, 0.38, 0.04, 30, 12, 'screen'],
            [0.18, 0.52, 0.64, 0.14, 12, 0, 'white'],
            [0.18, 0.66, 0.64, 0.08, 22, 0, 'white'],
            [0.38, 0.3, 0.24, 0.12, 7, 0, 'wood'],
            [0.06, 0.4, 0.1, 0.12, 10, 0, 'accent']
        ],
        accueil: [
            [0.22, 0.3, 0.52, 0.12, 22, 0, 'white'],
            [0.22, 0.42, 0.12, 0.3, 22, 0, 'white'],
            [0.44, 0.32, 0.14, 0.04, 14, 22, 'screen'],
            [0.5, 0.18, 0.12, 0.1, 12, 0, 'accent'],
            ...plant
        ],
        planning: [
            [0.1, 0.06, 0.8, 0.03, 28, 8, 'board'],
            [0.2, 0.36, 0.6, 0.28, 16, 0, 'wood'],
            ...chairs(0.22).map(([x, ...r]) => [x + 0.02, ...r]),
            ...chairs(0.7).map(([x, ...r]) => [x + 0.02, ...r])
        ],
        // Logiciels métier
        dessin: [
            [0.1, 0.16, 0.34, 0.26, 22, 0, 'white'],
            [0.12, 0.18, 0.3, 0.22, 3, 22, 'board'],
            [0.56, 0.16, 0.34, 0.26, 22, 0, 'white'],
            [0.58, 0.18, 0.3, 0.22, 3, 22, 'board'],
            [0.22, 0.54, 0.1, 0.1, 14, 0, 'accent'],
            [0.68, 0.54, 0.1, 0.1, 14, 0, 'accent'],
            ...plant.map(([x, y, ...r]) => [x, y + 0.7, ...r])
        ],
        maquette: [
            [0.12, 0.22, 0.76, 0.46, 18, 0, 'wood'],
            [0.3, 0.3, 0.2, 0.26, 26, 18, 'white'],
            [0.5, 0.36, 0.16, 0.18, 14, 18, 'accent'],
            [0.68, 0.32, 0.1, 0.12, 34, 18, 'white'],
            [0.42, 0.76, 0.14, 0.12, 14, 0, 'accent'],
            ...plant
        ],
        metre: [
            [0.1, 0.1, 0.5, 0.26, 18, 0, 'wood'],
            [0.16, 0.14, 0.3, 0.16, 2, 18, 'board'],
            [0.7, 0.08, 0.2, 0.3, 36, 0, 'white'],
            [0.14, 0.5, 0.06, 0.3, 6, 0, 'white'],
            [0.24, 0.5, 0.06, 0.3, 6, 0, 'white'],
            [0.5, 0.56, 0.12, 0.12, 12, 0, 'accent']
        ],
        projection: [
            [0.1, 0.06, 0.8, 0.04, 36, 10, 'screen'],
            ...chairs(0.4),
            ...chairs(0.58),
            ...chairs(0.76),
            [0.8, 0.5, 0.08, 0.08, 20, 0, 'rack']
        ],
        // Création & Médias
        montage: [
            [0.14, 0.2, 0.72, 0.26, 20, 0, 'wood'],
            [0.24, 0.22, 0.22, 0.04, 20, 20, 'screen'],
            [0.54, 0.22, 0.22, 0.04, 20, 20, 'screen'],
            [0.06, 0.22, 0.06, 0.1, 22, 0, 'rack'],
            [0.88, 0.22, 0.06, 0.1, 22, 0, 'rack'],
            [0.44, 0.6, 0.12, 0.12, 12, 0, 'accent']
        ],
        motion: [
            [0.1, 0.12, 0.42, 0.28, 18, 0, 'wood'],
            [0.18, 0.14, 0.26, 0.04, 18, 18, 'screen'],
            [0.2, 0.26, 0.2, 0.1, 2, 18, 'board'],
            [0.24, 0.56, 0.12, 0.12, 12, 0, 'accent'],
            [0.64, 0.5, 0.26, 0.3, 8, 0, 'accent'],
            ...plant
        ],
        photo: [
            [0.2, 0.06, 0.6, 0.04, 40, 0, 'board'],
            [0.2, 0.1, 0.6, 0.4, 1, 0, 'board'],
            [0.44, 0.24, 0.12, 0.12, 12, 0, 'accent'],
            [0.08, 0.5, 0.04, 0.04, 34, 0, 'rack'],
            [0.05, 0.47, 0.1, 0.1, 10, 34, 'white'],
            [0.86, 0.5, 0.04, 0.04, 34, 0, 'rack'],
            [0.83, 0.47, 0.1, 0.1, 10, 34, 'white'],
            [0.46, 0.76, 0.06, 0.06, 20, 0, 'rack']
        ],
        streaming: [
            [0.14, 0.12, 0.6, 0.26, 20, 0, 'wood'],
            [0.24, 0.14, 0.4, 0.04, 22, 20, 'screen'],
            [0.36, 0.5, 0.14, 0.14, 14, 0, 'accent'],
            [0.36, 0.64, 0.14, 0.04, 30, 0, 'accent'],
            [0.82, 0.3, 0.04, 0.04, 30, 0, 'rack'],
            [0.78, 0.26, 0.12, 0.12, 4, 30, 'accent']
        ],
        // Soft Skills
        direction: [
            [0.18, 0.18, 0.64, 0.3, 20, 0, 'wood'],
            [0.42, 0.06, 0.16, 0.1, 22, 0, 'accent'],
            [0.26, 0.6, 0.14, 0.12, 12, 0, 'white'],
            [0.6, 0.6, 0.14, 0.12, 12, 0, 'white'],
            ...plant
        ],
        agora: [
            [0.06, 0.06, 0.88, 0.2, 24, 0, 'white'],
            [0.06, 0.26, 0.88, 0.2, 14, 0, 'white'],
            [0.06, 0.46, 0.88, 0.18, 6, 0, 'white'],
            [0.4, 0.74, 0.2, 0.14, 16, 0, 'accent']
        ],
        creatif: [
            [0.1, 0.06, 0.8, 0.03, 26, 8, 'board'],
            [0.14, 0.38, 0.24, 0.22, 10, 0, 'accent'],
            [0.56, 0.5, 0.24, 0.22, 10, 0, 'accent'],
            [0.36, 0.7, 0.18, 0.16, 8, 0, 'wood']
        ],
        flex: [
            [0.12, 0.14, 0.18, 0.18, 30, 0, 'white'],
            [0.62, 0.14, 0.18, 0.18, 30, 0, 'white'],
            [0.38, 0.56, 0.18, 0.18, 30, 0, 'white'],
            [0.82, 0.7, 0.1, 0.1, 10, 0, 'accent']
        ],
        warroom: [
            [0.06, 0.06, 0.88, 0.03, 30, 6, 'board'],
            [0.24, 0.34, 0.52, 0.34, 16, 0, 'wood'],
            [0.1, 0.42, 0.1, 0.16, 12, 0, 'accent'],
            [0.8, 0.42, 0.1, 0.16, 12, 0, 'accent'],
            [0.44, 0.78, 0.12, 0.1, 12, 0, 'accent']
        ],
        scrum: [
            [0.06, 0.06, 0.88, 0.03, 32, 4, 'kanban'],
            [0.26, 0.44, 0.1, 0.1, 10, 0, 'accent'],
            [0.46, 0.36, 0.1, 0.1, 10, 0, 'accent'],
            [0.64, 0.44, 0.1, 0.1, 10, 0, 'accent'],
            [0.36, 0.64, 0.1, 0.1, 10, 0, 'accent'],
            [0.56, 0.64, 0.1, 0.1, 10, 0, 'accent']
        ],
        securite: [
            [0.08, 0.1, 0.24, 0.24, 26, 0, 'rack'],
            [0.44, 0.2, 0.46, 0.24, 18, 0, 'wood'],
            [0.52, 0.22, 0.14, 0.04, 16, 18, 'screen'],
            [0.7, 0.22, 0.14, 0.04, 16, 18, 'screen'],
            [0.62, 0.58, 0.12, 0.12, 12, 0, 'accent']
        ],
        strategie: [
            [0.06, 0.06, 0.03, 0.8, 30, 6, 'board'],
            [0.3, 0.24, 0.36, 0.36, 14, 0, 'wood'],
            [0.42, 0.36, 0.12, 0.12, 6, 14, 'accent'],
            [0.76, 0.3, 0.12, 0.12, 12, 0, 'accent'],
            [0.42, 0.72, 0.12, 0.12, 12, 0, 'accent']
        ]
    };
    // Personnages (position [x, y] en fraction de la zone), comme les silhouettes de la maquette Renault.
    const PEOPLE = {
        openspace: [[0.3, 0.82], [0.76, 0.84]], labo: [[0.3, 0.42], [0.82, 0.72]],
        tableur: [[0.18, 0.8]], electronique: [[0.48, 0.62]],
        archives: [[0.38, 0.5], [0.86, 0.82]], dashboards: [[0.12, 0.22], [0.7, 0.32]],
        accueil: [[0.62, 0.2], [0.62, 0.6]], planning: [[0.9, 0.5]],
        dessin: [[0.46, 0.62], [0.9, 0.4]], maquette: [[0.2, 0.82], [0.86, 0.76]],
        metre: [[0.4, 0.46]], projection: [[0.88, 0.82], [0.46, 0.26]],
        montage: [[0.3, 0.66]], motion: [[0.56, 0.62]],
        photo: [[0.5, 0.3], [0.5, 0.66]], streaming: [[0.58, 0.56]],
        direction: [[0.5, 0.56], [0.1, 0.82]], agora: [[0.2, 0.82], [0.76, 0.84]],
        creatif: [[0.5, 0.22], [0.86, 0.42]], flex: [[0.24, 0.46], [0.72, 0.4], [0.54, 0.84]],
        warroom: [[0.16, 0.22], [0.62, 0.22]], scrum: [[0.4, 0.54], [0.58, 0.56], [0.2, 0.22]],
        securite: [[0.24, 0.62]], strategie: [[0.2, 0.52], [0.72, 0.78]]
    };

    function person(x, y, k) {
        const p = el('div', 'sk3d-person');
        p.style.left = x + 'px';
        p.style.top = y + 'px';
        // Jambes, buste, bras et tête : une silhouette simple, blanche, à l'échelle de la maquette.
        const part = ([px, py, w, d, h, z], cls = '') => {
            const b = box(w * k, d * k, h * k, 'sk3d-obj sk3d-obj--person ' + cls);
            b.style.left = px * k + 'px';
            b.style.top = py * k + 'px';
            b.style.transform = `translateZ(${z * k}px)`;
            return b;
        };
        p.append(
            part([1, 1, 3, 4, 13, 0]),
            part([6, 1, 3, 4, 13, 0]),
            part([0, 0, 10, 6, 13, 13]),
            part([-3, 1, 3, 4, 12, 13]),
            part([10, 1, 3, 4, 12, 13]),
            part([1.5, 0, 7, 6, 8, 27], 'sk3d-obj--head')
        );
        return p;
    }

    // Espaces de chaque étage, dans l'ordre des compétences.
    const FLOOR_ZONES = [
        ['openspace', 'labo', 'tableur', 'electronique'],
        ['archives', 'dashboards', 'accueil', 'planning'],
        ['dessin', 'maquette', 'metre', 'projection'],
        ['montage', 'motion', 'photo', 'streaming'],
        ['direction', 'agora', 'creatif', 'flex', 'warroom', 'scrum', 'securite', 'strategie']
    ];

    function furnish(kind, rw, rd) {
        const k = Math.max(0.55, Math.min(1.3, Math.min(rw, rd) / 130));
        let top = 0;
        const items = kind.map(([x, y, w, d, h, z, mat]) => {
            const ow = Math.max(3, w * rw), od = Math.max(3, d * rd);
            const b = box(ow, od, h * k, 'sk3d-obj sk3d-obj--' + mat);
            b.style.left = x * rw + 'px';
            b.style.top = y * rd + 'px';
            if (z) b.style.transform = `translateZ(${z * k}px)`;
            top = Math.max(top, (z + h) * k);
            return b;
        });
        return { items, top: Math.round(top) };
    }

    // Découpages de plateau [x, y, largeur, profondeur] en fraction, façon plan d'architecte.
    const LAYOUTS_4 = [
        [[0, 0, 0.4, 0.56], [0.4, 0, 0.6, 0.44], [0, 0.56, 0.58, 0.44], [0.58, 0.44, 0.42, 0.56]],
        [[0, 0, 0.6, 0.5], [0.6, 0, 0.4, 0.5], [0, 0.5, 0.35, 0.5], [0.35, 0.5, 0.65, 0.5]],
        [[0, 0, 0.3, 1], [0.3, 0, 0.7, 0.42], [0.3, 0.42, 0.35, 0.58], [0.65, 0.42, 0.35, 0.58]],
        [[0, 0, 0.5, 0.6], [0.5, 0, 0.5, 0.38], [0.5, 0.38, 0.5, 0.62], [0, 0.6, 0.5, 0.4]]
    ];
    function zoneLayout(n, floorIndex) {
        if (n === 4) return LAYOUTS_4[floorIndex % LAYOUTS_4.length];
        if (n === 8) return [
            [0, 0, 0.22, 0.5], [0.22, 0, 0.3, 0.46], [0.52, 0, 0.2, 0.5], [0.72, 0, 0.28, 0.46],
            [0, 0.5, 0.3, 0.5], [0.3, 0.46, 0.22, 0.54], [0.52, 0.5, 0.26, 0.5], [0.78, 0.46, 0.22, 0.54]
        ];
        const rows = n > 3 ? 2 : 1, cols = Math.ceil(n / rows);
        return Array.from({ length: n }, (_, k) => [(k % cols) / cols, Math.floor(k / cols) / rows, 1 / cols, 1 / rows]);
    }

    // --- Structure ---
    const info = el('div', 'sk3d-info');
    const infoTitle = el('h3', 'sk3d-info__title');
    const infoSub = el('p', 'sk3d-info__sub');
    const infoCard = el('div', 'sk3d-info__card');
    info.append(infoTitle, infoSub, infoCard);

    const viewport = el('div', 'sk3d-viewport');
    const stage = el('div', 'sk3d-stage');
    const scene = el('div', 'sk3d-scene');
    scene.style.width = W + 'px'; scene.style.height = D + 'px';
    scene.append(el('div', 'sk3d-shadow'));
    stage.append(scene);
    viewport.append(stage);

    const controls = el('div', 'sk3d-controls');
    const overviewBtn = el('button', 'sk3d-btn sk3d-btn--overview', '<i class="fa-solid fa-building" aria-hidden="true"></i>');
    overviewBtn.type = 'button';
    overviewBtn.setAttribute('aria-label', "Vue d'ensemble du bâtiment");
    const floorBtns = el('div', 'sk3d-controls__floors');
    controls.append(overviewBtn, floorBtns);

    const hint = el('p', 'sk3d-hint', '<i class="fa-solid fa-hand-pointer" aria-hidden="true"></i> Glissez pour faire pivoter la maquette');

    // Plein écran (API Fullscreen) quand le navigateur le permet.
    const fsBtn = el('button', 'sk3d-fs', '<i class="fa-solid fa-expand" aria-hidden="true"></i>');
    fsBtn.type = 'button';
    fsBtn.setAttribute('aria-label', 'Afficher la maquette en plein écran');
    if (!document.fullscreenEnabled) fsBtn.hidden = true;
    fsBtn.addEventListener('click', () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else root.requestFullscreen().catch(() => {});
    });
    document.addEventListener('fullscreenchange', () => {
        const on = document.fullscreenElement === root;
        fsBtn.innerHTML = `<i class="fa-solid ${on ? 'fa-compress' : 'fa-expand'}" aria-hidden="true"></i>`;
        fsBtn.setAttribute('aria-label', on ? 'Quitter le plein écran' : 'Afficher la maquette en plein écran');
    });

    root.append(info, viewport, controls, hint, fsBtn);

    // --- Étages ---
    const floorEls = floors.map((f, i) => {
        const floor = el('div', 'sk3d-floor');
        floor.style.setProperty('--z', i * H + 'px');
        floor.style.setProperty('--i', i);
        const [fx, fy, fw, fd] = FOOTPRINTS[Math.min(i, FOOTPRINTS.length - 1)];
        floor.style.left = fx + 'px'; floor.style.top = fy + 'px';
        floor.style.width = fw + 'px'; floor.style.height = fd + 'px';

        const shell = box(fw, fd, H, 'sk3d-shell');
        const slab = el('div', 'sk3d-slab');
        // Murs du fond, bas, pour voir l'intérieur une fois le toit retiré.
        const backY = el('div', 'sk3d-face sk3d-wall');
        backY.style.cssText = `width:${fw}px;height:${H}px;transform:rotateX(90deg)`;
        const backX = el('div', 'sk3d-face sk3d-wall sk3d-wall--side');
        backX.style.cssText = `width:${fd}px;height:${H}px;transform:translateX(${fw}px) rotateZ(90deg) rotateX(90deg)`;
        shell.prepend(slab, backY, backX);

        const label = el('div', 'sk3d-floor__label', `<b>${i}</b> ${f.title}`);
        shell.querySelector('.sk3d-face--front').append(label);

        // Zones : un plateau ouvert découpé en espaces de tailles différentes, une compétence par zone.
        const zones = zoneLayout(f.skills.length, i);
        const pad = 10;
        const iw = fw - pad * 2, id = fd - pad * 2;

        const rooms = f.skills.map((s, k) => {
            const [zx, zy, zw, zd] = zones[k];
            const rw = zw * iw, rd = zd * id;
            const r = zy > 0.01 ? 1 : 0;
            const rows = 2;
            const room = el('div', 'sk3d-room' + (k % 2 ? ' sk3d-room--alt' : ''));
            room.style.cssText = `left:${pad + zx * iw}px;top:${pad + zy * id}px;width:${rw}px;height:${rd}px`;

            // Cloisons basses sur les limites intérieures, avec un passage laissé libre.
            const kk = Math.max(0.55, Math.min(1.3, Math.min(rw, rd) / 130));
            if (zx > 0.01) {
                const wall = box(4, rd * 0.62, 16 * kk, 'sk3d-obj sk3d-obj--partition');
                wall.style.left = '-2px'; wall.style.top = rd * 0.38 + 'px';
                room.append(wall);
            }
            if (zy > 0.01) {
                const wall = box(rw * 0.58, 4, 16 * kk, 'sk3d-obj sk3d-obj--partition');
                wall.style.left = rw * 0.42 + 'px'; wall.style.top = '-2px';
                room.append(wall);
            }

            const seq = FLOOR_ZONES[i % FLOOR_ZONES.length];
            const kind = seq[k % seq.length];
            const furniture = furnish(ZONE_KINDS[kind], rw, rd);
            const pk = Math.max(0.6, Math.min(1.2, Math.min(rw, rd) / 130));
            (PEOPLE[kind] || []).forEach(([px, py]) => furniture.items.push(person(px * rw, py * rd, pk)));

            const pin = el('button', 'sk3d-pin');
            pin.type = 'button';
            pin.style.left = rw / 2 + 'px';
            pin.style.top = rd / 2 + 'px';
            pin.style.setProperty('--lift', furniture.top + 'px');
            // Rangée du fond : tige plus longue pour que les étiquettes ne se chevauchent pas.
            pin.style.setProperty('--stem', (rows > 1 && r === 0 ? 62 : 22) + 'px');
            pin.setAttribute('aria-label', `${s.name} — ${s.level}`);
            pin.innerHTML = `<span class="sk3d-pin__inner">
                <span class="sk3d-pin__icon"><i class="${s.icon || f.icon}" aria-hidden="true"></i></span>
                <span class="sk3d-pin__label">${s.name}</span>
                <span class="sk3d-pin__stem"></span>
                <span class="sk3d-pin__dot"></span>
            </span>`;
            pin.addEventListener('click', (e) => { e.stopPropagation(); selectSkill(i, k); });
            room.addEventListener('click', () => selectSkill(i, k));

            room.append(...furniture.items, pin);
            shell.append(room);
            return { room, pin };
        });

        floor.append(shell);
        floor.addEventListener('click', () => { if (current !== i) selectFloor(i); });
        scene.append(floor);

        const btn = el('button', 'sk3d-btn', `<i class="${f.icon}" aria-hidden="true"></i><span>${f.title}</span>`);
        btn.type = 'button';
        btn.setAttribute('aria-label', `Étage ${i} : ${f.title}`);
        btn.addEventListener('click', () => selectFloor(i));
        floorBtns.prepend(btn);

        return { floor, rooms, btn };
    });

    // --- États ---
    let current = -1;

    function showOverview() {
        current = -1;
        stage.style.setProperty('--focus', '0px');
        stage.style.setProperty('--zoom', 1);
        root.classList.remove('is-floor');
        floorEls.forEach(({ floor, btn, rooms }) => {
            floor.classList.remove('is-active', 'is-above', 'is-below');
            btn.classList.remove('is-active');
            rooms.forEach(r => r.room.classList.remove('is-selected'));
        });
        overviewBtn.classList.add('is-active');
        infoTitle.textContent = 'Le bâtiment';
        infoSub.textContent = `${floors.length} étages, ${floors.reduce((a, f) => a + f.skills.length, 0)} compétences. Sélectionnez un étage.`;
        infoCard.hidden = true;
    }

    function selectFloor(i) {
        current = i;
        // Recentre la vue sur l'étage ouvert.
        // Le zoom se fait autour du centre de l'étage ouvert, recentré à l'écran.
        const zf = i * H + H / 2;
        scene.style.setProperty('--zf', zf + 'px');
        stage.style.setProperty('--focus', '-40px');
        // Les étages plus petits sont agrandis pour garder des zones lisibles.
        const fp = FOOTPRINTS[Math.min(i, FOOTPRINTS.length - 1)];
        stage.style.setProperty('--zoom', Math.min(1.45, W / fp[2]).toFixed(2));
        root.classList.add('is-floor');
        overviewBtn.classList.remove('is-active');
        floorEls.forEach(({ floor, btn, rooms }, j) => {
            floor.classList.toggle('is-active', j === i);
            floor.classList.toggle('is-above', j > i);
            floor.classList.toggle('is-below', j < i);
            btn.classList.toggle('is-active', j === i);
            rooms.forEach(r => r.room.classList.remove('is-selected'));
        });
        infoTitle.textContent = floors[i].title;
        infoSub.textContent = `Étage ${i} — sélectionnez une compétence`;
        infoCard.hidden = true;
    }

    function selectSkill(i, k) {
        if (current !== i) selectFloor(i);
        const s = floors[i].skills[k];
        floorEls[i].rooms.forEach((r, j) => r.room.classList.toggle('is-selected', j === k));
        infoCard.hidden = false;
        infoCard.innerHTML = `<p class="sk3d-info__name">${s.name}</p>
            <p class="sk3d-info__level">${s.level}</p>
            <div class="sk3d-info__bar" aria-hidden="true">${[1, 2, 3].map(n => `<span class="${n <= s.rank ? 'on' : ''}"></span>`).join('')}</div>`;
    }

    overviewBtn.addEventListener('click', showOverview);
    showOverview();

    // Animation d'arrivée : les étages se posent un à un, puis l'étage 0 s'ouvre.
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        selectFloor(0);
    } else {
        root.classList.add('is-intro');
        requestAnimationFrame(() => requestAnimationFrame(() => {
            root.classList.add('is-building');
            root.classList.remove('is-intro');
        }));
        setTimeout(() => {
            root.classList.remove('is-building');
            if (current === -1) selectFloor(0);
        }, floors.length * 160 + 1100);
    }

    // --- Rotation au glisser ---
    let rx = 58, rz = -38;
    const apply = () => {
        stage.style.setProperty('--rx', rx + 'deg');
        stage.style.setProperty('--rz', rz + 'deg');
    };
    apply();

    let drag = null;
    viewport.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        drag = { x: e.clientX, y: e.clientY, rx, rz, moved: false };
    });
    window.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) < 5) return;
        drag.moved = true;
        root.classList.add('is-dragging');
        rz = Math.max(-62, Math.min(-16, drag.rz - dx * 0.25));
        rx = Math.max(45, Math.min(68, drag.rx - dy * 0.2));
        apply();
    });
    window.addEventListener('pointerup', () => {
        if (drag?.moved) {
            // Empêche le clic qui suit un glisser de changer la sélection.
            viewport.addEventListener('click', (e) => e.stopPropagation(), { capture: true, once: true });
        }
        drag = null;
        root.classList.remove('is-dragging');
    });

    // --- Mise à l'échelle ---
    const fit = () => {
        const s = Math.max(0.3, Math.min(1.3, viewport.clientWidth / 820, viewport.clientHeight / 640));
        stage.style.setProperty('--scale', s);
        // Sur petit écran, les repères restent lisibles malgré la réduction de la maquette.
        stage.style.setProperty('--pin-scale', Math.min(1.5, Math.max(1, 0.6 / s)).toFixed(2));
    };
    fit();
    new ResizeObserver(fit).observe(viewport);
});
