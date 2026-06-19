// ========== Project Modals ==========
document.addEventListener('DOMContentLoaded', () => {
    const projectCards = document.querySelectorAll('.project__card');
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.modal__close');
    const total = String(projectCards.length).padStart(2, '0');

    // Inject the dossier index (big number + eyebrow). The displayed number
    // follows the card's visual order in the grid, not its data-project id.
    projectCards.forEach((card, i) => {
        const projectId = card.getAttribute('data-project');
        const modal = document.getElementById(`modal-${projectId}`);
        if (!modal) return;
        const num = String(i + 1).padStart(2, '0');
        const body = modal.querySelector('.modal__body');
        if (!body) return;

        if (!modal.querySelector('.modal__index')) {
            const index = document.createElement('span');
            index.className = 'modal__index';
            index.textContent = num;
            index.setAttribute('aria-hidden', 'true');
            (modal.querySelector('.modal__content') || modal).insertBefore(
                index, modal.querySelector('.modal__image'));
        }
        if (!body.querySelector('.modal__eyebrow')) {
            const eyebrow = document.createElement('span');
            eyebrow.className = 'modal__eyebrow';
            eyebrow.textContent = `Projet ${num} / ${total}`;
            body.insertBefore(eyebrow, body.firstChild);
        }
    });

    projectCards.forEach(card => {
        card.addEventListener('click', () => {
            const projectId = card.getAttribute('data-project');
            const modal = document.getElementById(`modal-${projectId}`);
            if (modal) {
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    });

    function closeModal() {
        modals.forEach(modal => modal.classList.remove('active'));
        document.body.style.overflow = 'auto';
    }

    closeButtons.forEach(btn => btn.addEventListener('click', closeModal));

    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    // ===== Category filter =====
    const filterBtns = document.querySelectorAll('.projects__filter-btn');
    if (filterBtns.length) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.getAttribute('data-filter');

                filterBtns.forEach(b => {
                    const active = b === btn;
                    b.classList.toggle('active', active);
                    b.setAttribute('aria-pressed', active ? 'true' : 'false');
                });

                projectCards.forEach(card => {
                    const match = filter === 'all' ||
                        card.getAttribute('data-category') === filter;
                    card.classList.toggle('is-hidden', !match);
                });
            });
        });
    }
});
