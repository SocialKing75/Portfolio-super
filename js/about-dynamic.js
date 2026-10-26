// Mon Parcours : apparitions au défilement, compteurs, frise qui se remplit,
// navigation de sections active et cartes qui s'inclinent sous la souris.
document.addEventListener('DOMContentLoaded', () => {
    const page = document.querySelector('.about');
    if (!page) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Apparitions
    const mark = (sel, kind, step = 90) => document.querySelectorAll(sel).forEach((el, i) => {
        el.dataset.reveal = typeof kind === 'function' ? kind(el, i) : kind;
        el.style.setProperty('--d', (i % 4) * step + 'ms');
    });
    mark('.ab-hero__eyebrow, .ab-hero__title, .ab-hero__sub', 'up', 120);
    mark('.ab-stat', 'zoom', 110);
    mark('.section__title, .experience__title, .passions__title', 'up');
    mark('.timeline__item', (el, i) => (i % 2 ? 'right' : 'left'), 0);
    mark('.experience__card', 'up', 110);
    mark('.blog-card', 'left', 120);
    document.querySelectorAll('.experience__tools, .experience__types').forEach(list =>
        list.querySelectorAll('span').forEach((s, i) => s.style.setProperty('--i', i)));

    if (!reduced) {
        document.documentElement.classList.add('js-ab');
        const io = new IntersectionObserver((entries) => entries.forEach(e => {
            if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
        }), { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
        document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));
    }

    // ---- Compteurs (chiffres clés et statistiques des cartes)
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
    const runCounter = (el) => {
        const target = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
        if (reduced || !target) return;
        const t0 = performance.now(), dur = 1400;
        const tick = (now) => {
            const t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 3);
            el.textContent = pre + Math.round(target * e) + suf;
            if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    };
    const cio = new IntersectionObserver((entries) => entries.forEach(e => {
        if (e.isIntersecting) { runCounter(e.target); cio.unobserve(e.target); }
    }), { threshold: 0.6 });
    counters.forEach(el => el.dataset.count && cio.observe(el));

    // ---- Frise qui se remplit + étape courante, navigation active
    const line = document.querySelector('.timeline__container');
    const items = [...document.querySelectorAll('.timeline__item')];
    const navLinks = [...document.querySelectorAll('.ab-nav a')];
    const sections = navLinks.map(a => document.querySelector(a.getAttribute('href')));
    let ticking = false;
    const update = () => {
        ticking = false;
        const vh = innerHeight;
        if (line) {
            const r = line.getBoundingClientRect();
            const p = Math.min(1, Math.max(0, (vh * 0.6 - r.top) / r.height));
            line.style.setProperty('--progress', reduced ? 1 : p.toFixed(3));
        }
        let best = null, bestD = Infinity;
        items.forEach(it => {
            const r = it.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - vh * 0.5);
            if (d < bestD) { bestD = d; best = it; }
        });
        items.forEach(it => it.classList.toggle('is-current', it === best && bestD < vh * 0.35));
        let active = 0;
        sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < vh * 0.4) active = i; });
        navLinks.forEach((a, i) => a.classList.toggle('is-active', i === active));
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update);
    update();

    // ---- Inclinaison 3D des cartes (souris uniquement)
    if (!reduced && matchMedia('(hover: hover) and (pointer: fine)').matches) {
        document.querySelectorAll('.experience__card').forEach(card => {
            card.addEventListener('pointermove', (e) => {
                const r = card.getBoundingClientRect();
                const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
                card.style.setProperty('--mx', x * 100 + '%');
                card.style.setProperty('--my', y * 100 + '%');
                card.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 6}deg) rotateY(${(x - 0.5) * 8}deg) translateY(-4px)`;
            });
            card.addEventListener('pointerleave', () => { card.style.transform = ''; });
        });
    }
});
