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

// ========== Footer form (mailto) ==========
document.addEventListener('DOMContentLoaded', () => {
    applyLang();

    const newsletterForm = document.getElementById('footer-newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('newsletter-email')?.value.trim() || '';
            if (!email) return;
            const recipient = 'jorechercher@protonmail.com';
            const subjectRaw = document.getElementById('newsletter-subject')?.value.trim() || '';
            const messageRaw = document.getElementById('newsletter-msg')?.value.trim() || '';
            const subject = encodeURIComponent(subjectRaw || 'Message depuis le portfolio');
            let bodyText = `Email: ${email}`;
            if (messageRaw) bodyText += `\n\nMessage:\n${messageRaw}`;
            window.location.href = `mailto:${recipient}?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
        });
    }

    document.querySelectorAll('.back-to-top').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
});
