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

    root.append(info, viewport, controls, hint);

    // --- Étages ---
    const floorEls = floors.map((f, i) => {
        const floor = el('div', 'sk3d-floor');
        floor.style.setProperty('--z', i * H + 'px');
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

            const size = Math.min(rw, rd) * 0.42;
            const block = box(size, size, s.rank * 16, 'sk3d-block sk3d-block--' + s.rank);
            block.style.left = (rw - size) / 2 + 'px';
            block.style.top = (rd - size) / 2 + 'px';

            const pin = el('button', 'sk3d-pin');
            pin.type = 'button';
            pin.style.left = rw / 2 + 'px';
            pin.style.top = rd / 2 + 'px';
            pin.style.setProperty('--lift', s.rank * 16 + 'px');
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

            room.append(block, pin);
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
        const s = Math.min(1, viewport.clientWidth / 820);
        stage.style.setProperty('--scale', s);
        // Sur petit écran, les repères restent lisibles malgré la réduction de la maquette.
        stage.style.setProperty('--pin-scale', Math.min(1.5, Math.max(1, 0.6 / s)).toFixed(2));
        viewport.style.height = Math.round(620 * s + 40) + 'px';
    };
    fit();
    window.addEventListener('resize', fit);
});
