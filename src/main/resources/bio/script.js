document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'))

        btn.classList.add('active')
        const contentId = btn.getAttribute('data-tab')
        document.getElementById(contentId).classList.add('active')
    })
})