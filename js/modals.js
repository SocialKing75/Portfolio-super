// ========== Project Modals ==========
document.addEventListener('DOMContentLoaded', () => {
    const projectCards = document.querySelectorAll('.project__card');
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.modal__close');

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
});
