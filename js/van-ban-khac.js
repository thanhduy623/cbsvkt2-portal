document.addEventListener('DOMContentLoaded', async () => {
    const container = document.querySelector('.sub-content');
    if (!container) return console.error('Không tìm thấy phần tử .sub-content');

    try {
        const res = await fetch('../data/van-ban-khac.json'); // đường dẫn từ index.html
        const routes = await res.json();

        container.innerHTML = routes.map(route => `
            <a href="${route.href}" class="card">
                <i class="${route.icon}"></i>
                <p class="nameCard">${route.label.toUpperCase()}</p>
            </a>
        `).join('');
    } catch (err) {
        console.error('Không thể tải routes.json', err);
    }
});
