// ========== Custom cursor ==========
(function () {
    const outer = document.querySelector('.cursor-outer');
    const inner = document.querySelector('.cursor-inner');
    if (!outer || !inner || window.matchMedia('(pointer: coarse)').matches) return;

    let mx = -100, my = -100, ox = -100, oy = -100;

    document.addEventListener('mousemove', function (e) {
        mx = e.clientX;
        my = e.clientY;
        inner.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
    });

    document.addEventListener('mouseleave', function () {
        outer.style.opacity = '0';
        inner.style.opacity = '0';
    });
    document.addEventListener('mouseenter', function () {
        outer.style.opacity = '';
        inner.style.opacity = '';
    });

    (function loop() {
        ox += (mx - ox) * 0.12;
        oy += (my - oy) * 0.12;
        outer.style.transform = 'translate(' + ox + 'px,' + oy + 'px)';
        requestAnimationFrame(loop);
    })();

    const HOVER = 'a, button, [role="button"], input, textarea, select, label, .cursor-pointer';
    document.body.addEventListener('mouseenter', function (e) {
        if (e.target.matches && e.target.matches(HOVER)) {
            outer.classList.add('cursor-hover');
            inner.classList.add('cursor-hover');
        }
    }, true);
    document.body.addEventListener('mouseleave', function (e) {
        if (e.target.matches && e.target.matches(HOVER)) {
            outer.classList.remove('cursor-hover');
            inner.classList.remove('cursor-hover');
        }
    }, true);
})();

// ========== Navigation mobile ==========
const menuToggle = document.getElementById('nav-toggle');
const menuClose = document.getElementById('nav-close');
const navMenu = document.getElementById('nav-menu');
const themeToggle = document.getElementById('theme-toggle');
const languageToggle = document.getElementById('language-toggle');
const header = document.querySelector('.header');

function toggleMenu(show) {
    if (show) {
        navMenu.classList.add('show-menu');
        document.body.style.overflow = 'hidden';
    } else {
        navMenu.classList.remove('show-menu');
        document.body.style.overflow = '';
    }
}

if (menuToggle) menuToggle.addEventListener('click', () => toggleMenu(true));
if (menuClose) menuClose.addEventListener('click', () => toggleMenu(false));

document.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => toggleMenu(false));
});

document.addEventListener('click', (e) => {
    if (navMenu && navMenu.classList.contains('show-menu') &&
        !navMenu.contains(e.target) &&
        menuToggle && !menuToggle.contains(e.target)) {
        toggleMenu(false);
    }
});

// ========== Active nav link (based on current page) ==========
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav__link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
        link.classList.add('active');
    }
});

// ========== Scroll hide/show header ==========
let lastScrollTop = 0;
let scrollTimer;
let isScrolling = false;
const SCROLL_THRESHOLD = 100;

function handleScroll() {
    if (navMenu && navMenu.classList.contains('show-menu')) return;
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    header.classList.toggle('header--scrolled', currentScroll > 20);
    if (Math.abs(currentScroll - lastScrollTop) < 5) return;
    if (currentScroll > lastScrollTop && currentScroll > SCROLL_THRESHOLD) {
        if (!isScrolling) { header.classList.add('header--hidden'); isScrolling = true; }
    } else {
        header.classList.remove('header--hidden');
        isScrolling = false;
    }
    lastScrollTop = currentScroll;
}

function scrollStopped() { isScrolling = false; }

function debouncedScroll() {
    clearTimeout(scrollTimer);
    handleScroll();
    scrollTimer = setTimeout(scrollStopped, 150);
}

window.addEventListener('scroll', debouncedScroll, { passive: true });

document.addEventListener('mousemove', (e) => {
    if (e.clientY < 50) header.classList.remove('header--hidden');
});

// ========== Theme ==========
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    const icon = themeToggle.querySelector('i');
    if (icon) { icon.classList.remove('fa-moon'); icon.classList.add('fa-sun'); }
}

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const icon = themeToggle.querySelector('i');
    if (document.body.classList.contains('dark-mode')) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
        localStorage.setItem('theme', 'dark');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
        localStorage.setItem('theme', 'light');
    }
});

// ========== Language ==========
let currentLanguage = localStorage.getItem('lang') || 'fr';

function updateLanguage() {
    document.querySelectorAll('[data-translate]').forEach(el => {
        const key = el.getAttribute('data-translate');
        if (translations[currentLanguage] && translations[currentLanguage][key]) {
            el.textContent = translations[currentLanguage][key];
        }
    });
    document.querySelectorAll('[data-translate-placeholder]').forEach(el => {
        const key = el.getAttribute('data-translate-placeholder');
        if (translations[currentLanguage] && translations[currentLanguage][key]) {
            el.placeholder = translations[currentLanguage][key];
        }
    });
}

const langCycle = ['fr', 'en', 'es', 'de', 'zh'];

function updateLangButton() {
    if (languageToggle) languageToggle.setAttribute('data-lang', currentLanguage.toUpperCase());
}

function applyLang() {
    document.documentElement.lang = currentLanguage;
    updateLanguage();
    updateLangButton();
}

languageToggle.addEventListener('click', () => {
    const idx = langCycle.indexOf(currentLanguage);
    currentLanguage = langCycle[(idx + 1) % langCycle.length];
    localStorage.setItem('lang', currentLanguage);
    applyLang();
});

// ========== Contact (Web3Forms) ==========
// 1) Va sur https://web3forms.com, saisis ton email, copie l'« Access Key ».
// 2) Colle-la ci-dessous à la place de YOUR_ACCESS_KEY. C'est tout.
const WEB3FORMS_ACCESS_KEY = '6be6fe95-5533-4d50-bdc4-02b138268892';

document.addEventListener('DOMContentLoaded', () => {
    applyLang();

    // Envoi générique vers Web3Forms. Renvoie une promesse résolue à true/false.
    async function sendContact({ name, email, subject, message }, statusEl) {
        if (!WEB3FORMS_ACCESS_KEY || WEB3FORMS_ACCESS_KEY === 'YOUR_ACCESS_KEY') {
            if (statusEl) {
                statusEl.textContent = "Le formulaire n'est pas encore configuré (clé Web3Forms manquante).";
                statusEl.className = 'form-status form-status--error';
            }
            return false;
        }
        if (statusEl) {
            statusEl.textContent = 'Envoi en cours…';
            statusEl.className = 'form-status form-status--pending';
        }
        try {
            const res = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({
                    access_key: WEB3FORMS_ACCESS_KEY,
                    from_name: name || 'Portfolio',
                    name: name || '',
                    email,
                    subject: subject || 'Message depuis le portfolio',
                    message: message || '',
                    botcheck: ''
                })
            });
            const data = await res.json();
            if (data.success) {
                if (statusEl) {
                    statusEl.textContent = 'Message envoyé, merci ! Je reviens vers vous rapidement.';
                    statusEl.className = 'form-status form-status--ok';
                }
                return true;
            }
            throw new Error(data.message || 'Échec');
        } catch (err) {
            if (statusEl) {
                statusEl.textContent = "L'envoi a échoué. Réessayez ou écrivez directement à jorechercher@protonmail.com.";
                statusEl.className = 'form-status form-status--error';
            }
            return false;
        }
    }

    // --- Footer form ---
    const newsletterForm = document.getElementById('footer-newsletter-form');
    if (newsletterForm) {
        let footerStatus = newsletterForm.querySelector('.form-status');
        if (!footerStatus) {
            footerStatus = document.createElement('p');
            footerStatus.className = 'form-status';
            footerStatus.setAttribute('role', 'status');
            footerStatus.setAttribute('aria-live', 'polite');
            newsletterForm.appendChild(footerStatus);
        }
        newsletterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('newsletter-email')?.value.trim() || '';
            if (!email) return;
            const ok = await sendContact({
                email,
                subject: document.getElementById('newsletter-subject')?.value.trim() || '',
                message: document.getElementById('newsletter-msg')?.value.trim() || ''
            }, footerStatus);
            if (ok) newsletterForm.reset();
        });
    }

    // --- Contact modal (injected once, shared across pages) ---
    if (!document.getElementById('contact-modal')) {
        const modal = document.createElement('div');
        modal.className = 'contact-modal';
        modal.id = 'contact-modal';
        modal.innerHTML = `
            <div class="contact-modal__panel" role="dialog" aria-modal="true" aria-labelledby="contact-modal-title">
                <button class="contact-modal__close" type="button" aria-label="Fermer">&times;</button>
                <h3 class="contact-modal__title" id="contact-modal-title">Me contacter</h3>
                <p class="contact-modal__intro">Une question, un projet, une opportunité ? Écrivez-moi, je réponds rapidement.</p>
                <form class="contact-modal__form" novalidate>
                    <input type="text" name="name" class="contact-modal__input" placeholder="Votre nom" autocomplete="name">
                    <input type="email" name="email" class="contact-modal__input" placeholder="Votre email" autocomplete="email" required>
                    <textarea name="message" class="contact-modal__input contact-modal__textarea" placeholder="Votre message" required></textarea>
                    <button type="submit" class="contact-modal__submit">Envoyer</button>
                    <p class="form-status" role="status" aria-live="polite"></p>
                </form>
            </div>`;
        document.body.appendChild(modal);

        const panel = modal.querySelector('.contact-modal__panel');
        const form = modal.querySelector('.contact-modal__form');
        const status = modal.querySelector('.form-status');

        const openModal = () => { modal.classList.add('active'); document.body.style.overflow = 'hidden'; };
        const closeModal = () => {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            status.textContent = ''; status.className = 'form-status';
        };

        modal.querySelector('.contact-modal__close').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('active')) closeModal(); });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = form.email.value.trim();
            const message = form.message.value.trim();
            if (!email || !message) {
                status.textContent = 'Merci de renseigner votre email et votre message.';
                status.className = 'form-status form-status--error';
                return;
            }
            const ok = await sendContact({
                name: form.name.value.trim(),
                email,
                subject: 'Contact via la modale du portfolio',
                message
            }, status);
            if (ok) form.reset();
        });

        // Triggers: any mailto link or element marked data-contact-open opens the modal.
        document.querySelectorAll('[data-contact-open], a[href^="mailto:"]').forEach(el => {
            el.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
        });
    }

    document.querySelectorAll('.back-to-top').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
});
