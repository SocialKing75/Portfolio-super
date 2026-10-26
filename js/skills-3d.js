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
    const ROOM_KINDS = [
        // Langages : bureau de développeur, double écran.
        [...desk, [0.2, 0.22, 0.12, 0.05, 18, 20, 'screen'], ...plant],
        // Bureautique & Data : bureau, armoire à dossiers.
        [...desk, [0.04, 0.12, 0.1, 0.34, 40, 0, 'white'], [0.04, 0.55, 0.1, 0.3, 30, 0, 'white']],
        // Logiciels métier : table à maquettes avec un petit bâtiment.
        [
            [0.12, 0.22, 0.76, 0.46, 18, 0, 'wood'],
            [0.3, 0.3, 0.2, 0.26, 26, 18, 'white'],
            [0.5, 0.36, 0.16, 0.18, 14, 18, 'accent'],
            [0.68, 0.32, 0.1, 0.12, 34, 18, 'white'],
            [0.42, 0.76, 0.14, 0.12, 14, 0, 'accent'],
            ...plant
        ],
        // Création & Médias : bureau de montage, caméra sur trépied, enceintes.
        [
            ...desk,
            [0.08, 0.14, 0.08, 0.08, 26, 0, 'screen'],
            [0.84, 0.66, 0.03, 0.03, 34, 0, 'screen'],
            [0.8, 0.62, 0.1, 0.1, 10, 34, 'accent']
        ],
        // Soft Skills : salle de réunion.
        [
            [0.22, 0.3, 0.56, 0.36, 16, 0, 'wood'],
            [0.3, 0.12, 0.14, 0.12, 12, 0, 'accent'],
            [0.56, 0.12, 0.14, 0.12, 12, 0, 'accent'],
            [0.3, 0.74, 0.14, 0.12, 12, 0, 'accent'],
            [0.56, 0.74, 0.14, 0.12, 12, 0, 'accent'],
            [0.44, 0.42, 0.12, 0.1, 6, 16, 'white'],
            ...plant
        ]
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

        // Pièces : une par compétence, sur deux rangées.
        const n = f.skills.length;
        const rows = n > 3 ? 2 : 1;
        const cols = Math.ceil(n / rows);
        const pad = 18, gap = 12;
        const rw = (fw - pad * 2 - gap * (cols - 1)) / cols;
        const rd = (fd - pad * 2 - gap * (rows - 1)) / rows;

        const rooms = f.skills.map((s, k) => {
            const c = k % cols, r = Math.floor(k / cols);
            const room = el('div', 'sk3d-room');
            room.style.cssText = `left:${pad + c * (rw + gap)}px;top:${pad + r * (rd + gap)}px;width:${rw}px;height:${rd}px`;

            room.classList.add('sk3d-room--lvl' + s.rank);
            const furniture = furnish(ROOM_KINDS[i % ROOM_KINDS.length], rw, rd);

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
        stage.style.setProperty('--focus', (i - (floors.length - 1) / 2) * H * 0.45 + 'px');
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
