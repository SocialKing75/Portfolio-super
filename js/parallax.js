// ========== Parallax (page Mon Parcours) ==========
// Chaque élément [data-parallax="vitesse"] est décalé verticalement selon sa distance
// au centre de l'écran. Vitesse négative = monte plus vite, positive = plus lent.
(function () {
    // Intensité globale de l'effet (1 = discret, 3 = marqué)
    const INTENSITY = 3;
    const items = Array.from(document.querySelectorAll('[data-parallax]'));
    if (!items.length) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const state = items.map(el => ({ el, speed: (parseFloat(el.dataset.parallax) || 0) * INTENSITY, offset: 0 }));
    let ticking = false;

    function update() {
        ticking = false;
        const vh = window.innerHeight;
        for (const s of state) {
            const rect = s.el.getBoundingClientRect();
            if (rect.bottom < -200 || rect.top > vh + 200) continue;
            // position naturelle (sans le décalage déjà appliqué)
            const center = rect.top - s.offset + rect.height / 2;
            s.offset = (center - vh / 2) * s.speed;
            s.el.style.translate = '0 ' + s.offset.toFixed(1) + 'px';
        }
    }

    function request() {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(update);
        }
    }

    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    window.addEventListener('load', request);
    request();
})();
