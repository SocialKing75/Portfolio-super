// ========== Preloader ==========
(function () {
    const preloader = document.getElementById('preloader');
    if (!preloader) return;

    // Déjà joué cette session
    if (document.documentElement.classList.contains('no-preloader')) {
        preloader.remove();
        document.body.classList.remove('preloading');
        return;
    }

    sessionStorage.setItem('preloader-shown', '1');

    // Après l'animation (2.2s) : .preloaded → ligne disparaît + panneaux s'ouvrent
    setTimeout(function () {
        preloader.classList.add('preloaded');
        document.body.classList.remove('preloading');
    }, 2300);

    // Suppression du DOM après ouverture complète des panneaux
    setTimeout(function () {
        preloader.remove();
    }, 3200);
})();

// ========== Scroll reveal: home about snippet ==========
document.addEventListener('DOMContentLoaded', () => {
    const about = document.querySelector('.home__about');
    if (about) {
        let userScrolled = false;
        const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const onScroll = () => {
            userScrolled = true;
            const rect = about.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.95 && rect.bottom > 0) {
                if (prefersReduced) about.classList.add('no-anim');
                about.classList.add('in-view');
                window.removeEventListener('scroll', onScroll);
                if (observer) observer.unobserve(about);
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && userScrolled) {
                    if (prefersReduced) entry.target.classList.add('no-anim');
                    entry.target.classList.add('in-view');
                    obs.unobserve(entry.target);
                    window.removeEventListener('scroll', onScroll);
                }
            });
        }, { threshold: 0.2 });

        observer.observe(about);
    }

    // ========== Staggered reveal: passion items ==========
    const items = Array.from(document.querySelectorAll('.passion-item'));
    if (items.length) {
        const prefsReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const obs = new IntersectionObserver((entries, o) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const idx = items.indexOf(el);
                    if (prefsReduced) {
                        el.classList.add('in-view');
                    } else {
                        el.style.animationDelay = `${(idx >= 0 ? idx : 0) * 120}ms`;
                        el.classList.add('in-view');
                    }
                    o.unobserve(el);
                }
            });
        }, { threshold: 0.12 });

        items.forEach(i => obs.observe(i));
    }
});
