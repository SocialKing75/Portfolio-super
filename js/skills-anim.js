// Reveal cards + animate progress bars on scroll
document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.sk-card');
    if (!cards.length) return;

    const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const card = entry.target;
                const delay = parseInt(card.dataset.delay || 0);
                setTimeout(() => card.classList.add('visible'), delay);
                obs.unobserve(card);
            }
        });
    }, { threshold: 0.15 });

    cards.forEach(card => obs.observe(card));
});
