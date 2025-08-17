// ../js/loading.js
export const Loading = (() => {
    // Tạo overlay khi lần đầu gọi
    let overlay = null;

    function createOverlay() {
        if (overlay) return;
        overlay = document.createElement("div");
        overlay.id = "loading-overlay";
        overlay.style.position = "fixed";
        overlay.style.top = 0;
        overlay.style.left = 0;
        overlay.style.width = "100%";
        overlay.style.height = "100%";
        overlay.style.backgroundColor = "rgba(0,0,0,0.5)";
        overlay.style.display = "flex";
        overlay.style.justifyContent = "center";
        overlay.style.alignItems = "center";
        overlay.style.zIndex = 9999;
        overlay.style.fontSize = "1.5rem";
        overlay.style.color = "#fff";
        overlay.innerHTML = `<div class="loading-spinner">
            <div class="spinner"></div>
            <span style="margin-left: 10px;">Đang xử lý...</span>
        </div>`;
        document.body.appendChild(overlay);

        // Spinner CSS
        const style = document.createElement("style");
        style.innerHTML = `
        .spinner {
            width: 40px;
            height: 40px;
            border: 5px solid #fff;
            border-top-color: transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg);}
            100% { transform: rotate(360deg);}
        }`;
        document.head.appendChild(style);
    }

    return {
        show: () => {
            createOverlay();
            overlay.style.display = "flex";
        },
        hide: () => {
            if (overlay) overlay.style.display = "none";
        }
    };
})();
