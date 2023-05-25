// SELECT ALL ELEMENTS WITH TARGET
let els = document.querySelectorAll('[data-toggle]');
els.forEach(el => {
    let target = document.querySelector(el.dataset.target);
    el.addEventListener('click', () => {
        if(el.dataset.toggle == "modal"){
            target.classList.toggle('show')
        }
    });
})

const modals = document.querySelectorAll('.modal')
modals.forEach(modal => {
    modal.addEventListener('click', (e) => {
        const isOutside = !e.target.closest('.modal-content')
        if(isOutside) modal.classList.toggle('show')
    })
})