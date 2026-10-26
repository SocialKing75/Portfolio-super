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

    // ---------------------------------------------------------------- Chapitres d'expérience
    const IMAGES = {
        'exp-parasitis': ['photo-1556761175-5973dc0f32e7', 'photo-1450101499163-c8848c66ca85', 'photo-1551650975-87deedd944c3'],
        'exp-sadiem': ['photo-1460925895917-afdab827c52f', 'photo-1551434678-e076c223a692', 'photo-1503387762-592deb58ef4e'],
        'exp-boreal': ['photo-1503387762-592deb58ef4e', 'photo-1560518883-ce09059eeffa', 'photo-1481627834876-b7833e8f5570'],
        'exp-sisco': ['photo-1481627834876-b7833e8f5570', 'photo-1551650975-87deedd944c3', 'photo-1460925895917-afdab827c52f']
    };
    const chapters = [...document.querySelectorAll('.about__experience .experience__card')].map(card => {
        card.classList.add('xp');
        const period = card.querySelector('.experience__period')?.textContent.trim() || '';
        const role = card.querySelector('h5')?.textContent.trim() || '';
        const org = (card.querySelector('h5 + p')?.textContent || '').split(' - ')[0].trim();
        const panel = document.createElement('div');
        panel.className = 'xp__panel';
        [...card.children].forEach(ch => {
            if (!ch.matches('.experience__period, h5') && !(ch.matches('p') && ch === card.querySelector('h5 + p'))) panel.append(ch);
        });
        const head = document.createElement('div');
        head.className = 'xp__head';
        head.innerHTML = `<p class="xp__kicker">${period}</p>
            <h3 class="xp__name" aria-label="${org}">${[...org].map((c, k) => `<span class="ch" style="--k:${k}" aria-hidden="true">${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</h3>
            <p class="xp__role">${role}</p>`;
        const glow = document.createElement('div');
        glow.className = 'xp__glow';
        const imgs = (IMAGES[card.id] || []).map((id, n) => {
            const img = document.createElement('img');
            img.className = 'xp__float';
            img.src = `assets/projects/${id}-400.webp`;
            img.alt = '';
            img.loading = 'lazy';
            img.dataset.speed = [-0.18, 0.12, -0.08][n];
            return img;
        });
        card.prepend(glow, ...imgs, head);
        card.append(panel);
        card.dataset.reveal = 'chapter';
        return { card, glow, imgs };
    });

    // ---------------------------------------------------------------- Carrousels
    [['.about__internships .experience__grid', '.about__internships'], ['.passions__blog', '.about__passions']].forEach(([sel, host]) => {
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
        // Chapitres : halo qui s'intensifie au centre, images en parallaxe
        chapters.forEach(({ card, glow, imgs }) => {
            const r = card.getBoundingClientRect();
            if (r.bottom < 0 || r.top > vh) return;
            const c = (r.top + r.height / 2 - vh / 2) / vh;
            glow.style.setProperty('--glow', (0.95 - Math.min(0.7, Math.abs(c) * 0.9)).toFixed(3));
            if (!reduced) imgs.forEach(img => img.style.setProperty('--py', `${c * vh * img.dataset.speed}px`));
        });
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
    splitWords();
    update();
});
