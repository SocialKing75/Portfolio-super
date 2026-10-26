// Mon Parcours, mise en scène au défilement : ouverture plein écran, texte révélé mot à mot,
// un chapitre plein écran par expérience, carrousels, barre flottante des sections.
document.addEventListener('DOMContentLoaded', () => {
    const page = document.querySelector('.about');
    if (!page) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) document.documentElement.classList.add('js-ab');

    // ---------------------------------------------------------------- Texte mot à mot
    // *mot* = mot-clé en dégradé. Recalculé si la langue change (main.js remplace le texte).
    const story = document.querySelector('.ab-story__text');
    let words = [];
    const splitWords = () => {
        if (!story || story.querySelector('.w')) return;
        const raw = story.textContent.trim();
        let key = false;
        story.innerHTML = raw.split(/\s+/).map(token => {
            const starts = token.startsWith('*'), ends = /\*[^\w]*$/.test(token);
            if (starts) key = true;
            const html = `<span class="w${key ? ' key' : ''}">${token.replace(/\*/g, '')}</span>`;
            if (ends) key = false;
            return html;
        }).join(' ');
        words = [...story.querySelectorAll('.w')];
        update();
    };
    if (story) new MutationObserver(splitWords).observe(story, { childList: true, characterData: true, subtree: true });

    // ---------------------------------------------------------------- Défilé des entreprises
    // Une scène épinglée : au défilement, les photos jaillissent du centre vers l'écran,
    // puis la couleur et le nom passent à l'entreprise suivante (comme les collections Renault).
    const IMAGES = {
        'exp-parasitis': ['photo-1556761175-5973dc0f32e7', 'photo-1450101499163-c8848c66ca85', 'photo-1551650975-87deedd944c3', 'photo-1591453089816-0fbb971b454c', 'photo-1460925895917-afdab827c52f'],
        'exp-sadiem': ['photo-1460925895917-afdab827c52f', 'photo-1551434678-e076c223a692', 'photo-1503387762-592deb58ef4e', 'photo-1481627834876-b7833e8f5570', 'photo-1560518883-ce09059eeffa'],
        'exp-boreal': ['photo-1503387762-592deb58ef4e', 'photo-1560518883-ce09059eeffa', 'photo-1481627834876-b7833e8f5570', 'photo-1551434678-e076c223a692', 'photo-1556761175-5973dc0f32e7'],
        'exp-sisco': ['photo-1481627834876-b7833e8f5570', 'photo-1551650975-87deedd944c3', 'photo-1460925895917-afdab827c52f', 'photo-1503387762-592deb58ef4e', 'photo-1450101499163-c8848c66ca85']
    };
    const COLORS = { 'exp-parasitis': '14, 98%, 50%', 'exp-sadiem': '265, 70%, 58%', 'exp-boreal': '200, 85%, 48%', 'exp-sisco': '165, 65%, 40%' };
    // Direction de sortie de chaque photo (vers les bords), décalage dans le temps.
    const FLIGHTS = [[-1, -0.7, 0], [1, -0.85, 0.12], [0.9, 0.75, 0.24], [-0.85, 0.8, 0.36], [0.15, -1, 0.48]];
    const cards = [...document.querySelectorAll('.about__experience .experience__card')];
    const stage = document.createElement('div');
    stage.className = 'xs';
    stage.style.height = `${cards.length * 170 + 30}vh`;
    const sticky = document.createElement('div');
    sticky.className = 'xs__sticky';
    stage.append(sticky);
    const sheet = document.createElement('div');
    sheet.className = 'xs-sheet';
    sheet.hidden = true;
    sheet.innerHTML = '<div class="xs-sheet__box" role="dialog" aria-modal="true"><button class="xs-sheet__close" type="button" aria-label="Fermer">&times;</button><div class="xs-sheet__body"></div></div>';
    const layers = cards.map((card) => {
        const period = card.querySelector('.experience__period')?.textContent.trim() || '';
        const role = card.querySelector('h5')?.textContent.trim() || '';
        const org = (card.querySelector('h5 + p')?.textContent || '').split(' - ')[0].trim();
        const layer = document.createElement('section');
        layer.className = 'xs__layer';
        layer.style.setProperty('--c', COLORS[card.id] || '14, 98%, 50%');
        layer.setAttribute('aria-label', `${org} — ${role}`);
        layer.innerHTML = `<div class="xs__glow"></div>
            <div class="xs__photos">${(IMAGES[card.id] || []).map(id => `<img src="assets/projects/${id}-400.webp" alt="" loading="lazy" decoding="async">`).join('')}</div>
            <div class="xs__head">
                <p class="xs__kicker">${period}</p>
                <h3 class="xs__name">${[...org].map((c, k) => `<span class="ch" style="--k:${k}">${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</h3>
                <p class="xs__role">${role}</p>
            </div>`;
        // Texte de l'entreprise : chiffres, types, outils, soft skills et missions.
        const panel = document.createElement('div');
        panel.className = 'xs__panel';
        const side = document.createElement('div');
        side.className = 'xs__panel-side';
        card.querySelectorAll(':scope > .experience__stat, :scope > .experience__types, :scope > .experience__tools').forEach(el => side.append(el.cloneNode(true)));
        const tasks = card.querySelector(':scope > .experience__tasks')?.cloneNode(true);
        if (side.children.length) panel.append(side);
        if (tasks) panel.append(tasks);
        layer.querySelector('.xs__head').after(panel);
        sticky.append(layer);
        card.hidden = true;
        return { card, layer, org, photos: [...layer.querySelectorAll('.xs__photos img')], chars: [...layer.querySelectorAll('.ch')] };
    });
    const cta = document.createElement('button');
    cta.type = 'button';
    cta.className = 'xs__cta';
    cta.innerHTML = '<span class="xs__cta-icon"><i class="fa-solid fa-briefcase" aria-hidden="true"></i></span><span class="xs__cta-label"></span><i class="fa-solid fa-arrow-right" aria-hidden="true"></i>';
    const dots = document.createElement('div');
    dots.className = 'xs__dots';
    dots.innerHTML = layers.map(() => '<span></span>').join('');
    // Le texte est affiché dans chaque écran : pas de bouton « Voir le détail ».
    sticky.append(dots);
    if (cards.length) {
        cards[0].parentElement.after(stage);
        document.body.append(sheet);
    }
    let currentXs = 0;
    const openSheet = (i) => {
        const { card, org } = layers[i];
        const clone = card.cloneNode(true);
        clone.hidden = false;
        clone.removeAttribute('id');
        sheet.querySelector('.xs-sheet__body').innerHTML = '';
        sheet.querySelector('.xs-sheet__body').append(clone);
        sheet.style.setProperty('--c', COLORS[card.id] || '14, 98%, 50%');
        sheet.hidden = false;
        document.body.style.overflow = 'hidden';
        sheet.querySelector('.xs-sheet__close').focus();
    };
    const closeSheet = () => { sheet.hidden = true; document.body.style.overflow = ''; cta.focus(); };
    cta.addEventListener('click', () => openSheet(currentXs));
    sheet.addEventListener('click', (e) => { if (e.target === sheet || e.target.closest('.xs-sheet__close')) closeSheet(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); });

    function updateStage(vh) {
        if (!layers.length) return;
        const r = stage.getBoundingClientRect();
        const total = Math.max(1, r.height - vh);
        const p = Math.min(0.9999, Math.max(0, -r.top / total)) * layers.length;
        const idx = Math.floor(p);
        layers.forEach(({ layer, photos, chars }, i) => {
            const t = p - i;                                   // 0 → 1 pendant le passage de cette entreprise
            const fadeIn = i === 0 ? 1 : Math.min(1, Math.max(0, (t + 0.12) / 0.18));
            const fadeOut = i === layers.length - 1 ? 1 : Math.min(1, Math.max(0, (1.04 - t) / 0.16));
            const o = Math.min(fadeIn, fadeOut);
            layer.style.opacity = o.toFixed(3);
            layer.style.visibility = o > 0.001 ? 'visible' : 'hidden';
            layer.classList.toggle('is-on', t > -0.08 && (t < 0.92 || i === layers.length - 1));
            if (reduced || o <= 0.001) return;
            photos.forEach((img, k) => {
                const [dx, dy, delay] = FLIGHTS[k % FLIGHTS.length];
                const f = Math.min(1, Math.max(0, (t - delay) / 0.75));     // vol de la photo
                const ease = f * f;
                const s = 0.25 + ease * 1.9;
                img.style.transform = `translate(-50%, -50%) translate(${dx * ease * 62}vw, ${dy * ease * 58}vh) scale(${s.toFixed(3)})`;
                img.style.opacity = (f <= 0 ? 0 : Math.min(1, f * 6)).toFixed(3);
            });
        });
        currentXs = Math.min(layers.length - 1, idx);
        cta.querySelector('.xs__cta-label').textContent = `Voir le détail · ${layers[currentXs].org}`;
        cta.style.setProperty('--c', COLORS[layers[currentXs].card.id] || '14, 98%, 50%');
        [...dots.children].forEach((d, i) => d.classList.toggle('is-on', i === currentXs));
    }

    // ---------------------------------------------------------------- Carrousels
    // ---------------------------------------------------------------- Stages : défilé horizontal épinglé
    // Le défilement vertical fait glisser les stages de droite à gauche, chacun en grand panneau.
    const STAGE_IMG = { 'exp-renault': 'photo-1551434678-e076c223a692', 'exp-qcs': 'photo-1503387762-592deb58ef4e' };
    const stageCards = [...document.querySelectorAll('.about__internships .experience__card')];
    const hz = document.createElement('div');
    hz.className = 'hz';
    hz.innerHTML = '<div class="hz__sticky"><div class="hz__track"></div><div class="hz__bar"><span></span></div></div>';
    const track = hz.querySelector('.hz__track');
    track.innerHTML = `<article class="hz__intro">
            <p class="hz__eyebrow">${stageCards.length} stages</p>
            <h3 class="hz__big" data-translate="Stages">Stages</h3>
            <p class="hz__hint"><i class="fa-solid fa-arrow-right" aria-hidden="true"></i> <span data-translate="hz-hint">Premières expériences en entreprise</span></p>
        </article>` + stageCards.map((c, n) => {
        const period = c.querySelector('.experience__period')?.textContent.trim() || '';
        const year = (period.match(/\d{4}/) || [''])[0];
        const role = c.querySelector('h5')?.textContent.trim() || '';
        const [org, city] = (c.querySelector('h5 + p')?.textContent || '').split(' - ').map(t => t.trim());
        const tools = c.querySelector('.experience__tools')?.outerHTML || '';
        const tasks = c.querySelector('.experience__tasks')?.outerHTML || '';
        return `<article class="hz__card">
            <div class="hz__media">
                <img src="assets/projects/${STAGE_IMG[c.id] || 'photo-1481627834876-b7833e8f5570'}-800.webp" alt="" loading="lazy">
                <span class="hz__year">${year}</span>
                <span class="hz__num">0${n + 1}</span>
            </div>
            <div class="hz__text">
                <p class="hz__period">${period}${city ? ' · ' + city : ''}</p>
                <h4 class="hz__org">${org || ''}</h4>
                <p class="hz__role">${role}</p>
                ${tasks}${tools}
            </div>
        </article>`;
    }).join('');
    if (stageCards.length) {
        const grid = stageCards[0].parentElement;
        grid.after(hz);
        grid.hidden = true;
        track.querySelectorAll('.experience__tools span').forEach(sp => sp.style.removeProperty('--i'));
    }
    const hzBar = hz.querySelector('.hz__bar span');
    function updateHz(vh) {
        if (!stageCards.length) return;
        const r = hz.getBoundingClientRect();
        const total = Math.max(1, r.height - vh);
        const p = Math.min(1, Math.max(0, -r.top / total));
        const dist = Math.max(0, track.scrollWidth - innerWidth);
        track.style.transform = `translate3d(${-p * dist}px, 0, 0)`;
        hzBar.style.transform = `scaleX(${p})`;
        track.querySelectorAll('.hz__card').forEach(card => {
            const cr = card.getBoundingClientRect();
            const c = (cr.left + cr.width / 2 - innerWidth / 2) / innerWidth;  // 0 au centre de l'écran
            card.style.setProperty('--c', Math.max(-1, Math.min(1, c)).toFixed(3));
        });
    }
    const sizeHz = () => { if (stageCards.length) hz.style.height = `${track.scrollWidth - innerWidth + innerHeight}px`; };
    addEventListener('resize', sizeHz);
    addEventListener('load', sizeHz);
    sizeHz();

    [['.passions__blog', '.about__passions']].forEach(([sel, host]) => {
        const rail = document.querySelector(sel);
        if (!rail) return;
        rail.classList.add('ab-rail');
        const nav = document.createElement('div');
        nav.className = 'ab-rail-nav';
        nav.innerHTML = '<button type="button" aria-label="Précédent"><i class="fa-solid fa-chevron-left"></i></button><button type="button" aria-label="Suivant"><i class="fa-solid fa-chevron-right"></i></button>';
        const [prev, next] = nav.querySelectorAll('button');
        const step = () => (rail.firstElementChild?.getBoundingClientRect().width || 300) + 20;
        prev.addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: 'smooth' }));
        next.addEventListener('click', () => rail.scrollBy({ left: step(), behavior: 'smooth' }));
        rail.before(nav);
    });

    // ---------------------------------------------------------------- Apparitions
    const mark = (sel, kind, step = 90) => document.querySelectorAll(sel).forEach((el, i) => {
        if (!el.dataset.reveal) el.dataset.reveal = typeof kind === 'function' ? kind(el, i) : kind;
        el.style.setProperty('--d', (i % 4) * step + 'ms');
    });
    mark('.section__title, .experience__title, .passions__title', 'up');
    mark('.timeline__item', (el, i) => (i % 2 ? 'right' : 'left'), 0);
    mark('.ab-rail > *', 'up', 110);
    mark('.ab-stat', 'up', 100);
    document.querySelectorAll('.experience__tools, .experience__types').forEach(list =>
        list.querySelectorAll('span').forEach((s, i) => s.style.setProperty('--i', i)));
    const io = new IntersectionObserver((entries) => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { threshold: 0.18 });
    document.querySelectorAll('[data-reveal]').forEach(el => reduced ? el.classList.add('is-in') : io.observe(el));

    // ---------------------------------------------------------------- Compteurs
    const counters = [...document.querySelectorAll('.ab-stat strong, .experience__stat strong')];
    counters.forEach(el => {
        if (el.dataset.countFrom) el.dataset.count = document.querySelectorAll(el.dataset.countFrom).length;
        if (!el.dataset.count) {
            const m = el.textContent.match(/^(\D*)(\d+)(.*)$/);
            if (!m) return;
            el.dataset.prefix = m[1]; el.dataset.count = m[2]; el.dataset.suffix = m[3];
        }
        el.textContent = (el.dataset.prefix || '') + el.dataset.count + (el.dataset.suffix || '');
    });
    const cio = new IntersectionObserver((entries) => entries.forEach(e => {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        const el = e.target, target = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
        if (reduced || !target) return;
        const t0 = performance.now();
        const tick = (now) => {
            const t = Math.min(1, (now - t0) / 1400);
            el.textContent = pre + Math.round(target * (1 - Math.pow(1 - t, 3))) + suf;
            if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }), { threshold: 0.6 });
    counters.forEach(el => el.dataset.count && cio.observe(el));

    // ---------------------------------------------------------------- Barre flottante
    const dock = document.querySelector('.ab-dock');
    const dockBtn = dock?.querySelector('.ab-dock__main'), dockMenu = dock?.querySelector('.ab-dock__menu');
    const dockLabel = dock?.querySelector('.ab-dock__label');
    const links = dock ? [...dockMenu.querySelectorAll('a')] : [];
    const targets = links.map(a => document.querySelector(a.getAttribute('href')));
    if (dock) {
        const close = () => { dockMenu.hidden = true; dockBtn.setAttribute('aria-expanded', 'false'); };
        dockBtn.addEventListener('click', (e) => { e.stopPropagation(); dockMenu.hidden = !dockMenu.hidden; dockBtn.setAttribute('aria-expanded', String(!dockMenu.hidden)); });
        links.forEach(a => a.addEventListener('click', close));
        document.addEventListener('click', (e) => { if (!dock.contains(e.target)) close(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    }

    // ---------------------------------------------------------------- Défilement
    const open = document.querySelector('.ab-open');
    const openMedia = open?.querySelector('.ab-open__media'), openInner = open?.querySelector('.ab-open__inner');
    const storySec = document.querySelector('.ab-story');
    const stackImgs = [...document.querySelectorAll('.ab-story__stack img')];
    const line = document.querySelector('.timeline__container');
    const items = [...document.querySelectorAll('.timeline__item')];
    let ticking = false;

    function update() {
        ticking = false;
        const vh = innerHeight, y = scrollY;
        document.body.classList.toggle('ab-at-top', !!open && y < (open?.offsetHeight || 0) - 80);

        // Ouverture : l'image grossit, le titre s'efface
        if (open && !reduced) {
            const p = Math.min(1, y / open.offsetHeight);
            openMedia.style.transform = `scale(${1 + p * 0.15})`;
            openInner.style.transform = `translateY(${p * 120}px)`;
            openInner.style.opacity = String(1 - p * 1.3);
        }
        // Texte : les mots s'allument au fil du défilement
        if (storySec && words.length) {
            const r = storySec.getBoundingClientRect();
            const p = reduced ? 1 : Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh) * 1.15));
            const n = Math.round(p * words.length);
            words.forEach((w, i) => w.classList.toggle('on', i < n));
            stackImgs.forEach((img, i) => img.style.setProperty('--y', `${(1 - p) * (i - 1) * 40}px`));
        }
        // Frise
        if (line) {
            const r = line.getBoundingClientRect();
            line.style.setProperty('--progress', reduced ? 1 : Math.min(1, Math.max(0, (vh * 0.6 - r.top) / r.height)).toFixed(3));
        }
        let best = null, bestD = Infinity;
        items.forEach(it => {
            const r = it.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - vh * 0.5);
            if (d < bestD) { bestD = d; best = it; }
        });
        items.forEach(it => it.classList.toggle('is-current', it === best && bestD < vh * 0.35));
        // Défilé des entreprises
        updateStage(vh);
        updateHz(vh);
        // Barre flottante : visible après l'ouverture, section courante
        if (dock) {
            dock.classList.toggle('is-shown', y > vh * 0.6);
            let active = 0;
            targets.forEach((t, i) => { if (t && t.getBoundingClientRect().top < vh * 0.45) active = i; });
            links.forEach((a, i) => a.classList.toggle('is-active', i === active));
            dockLabel.textContent = links[active]?.textContent || '';
        }
    }
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update);
    // Les éléments ajoutés ici sont traduits dans la langue choisie.
    if (typeof applyLang === 'function') applyLang();
    splitWords();
    update();
});
