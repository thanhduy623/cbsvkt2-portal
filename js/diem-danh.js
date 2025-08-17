import { connectGAS } from "./connectGAS.js";

let members = [];
let lastCode = "";

// --- Khởi động ---
async function init() {
    const mess = document.getElementById("mess-exp");
    const btn = document.getElementById("submit");
    const mssvInput = document.getElementById("mssv");
    const fullnameInput = document.getElementById("fullname");
    const monthInput = document.getElementById("month");

    // disable khi tải
    btn.disabled = true;
    mssvInput.disabled = true;
    mess.textContent = "⏳ Đang tải dữ liệu...";

    // Gán tháng hiện tại MM/YYYY
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    monthInput.value = `${mm}/${yyyy}`;

    try {
        const res = await connectGAS("getMemberList", {});
        if (res.success) {
            members = res.data;
            mess.textContent = "✅ Dữ liệu đã sẵn sàng";
            mssvInput.disabled = false;
        } else {
            mess.textContent = "❌ Lỗi: " + res.mess;
        }
    } catch (err) {
        mess.textContent = "❌ Không thể tải dữ liệu: " + err.message;
    }

    // MSSV nhập vào thì tìm tên
    mssvInput.addEventListener("input", () => {
        const val = mssvInput.value.trim();
        if (val.length === 8) {
            const found = members.find(m => String(m.MSSV) === val); // ✅ fix
            fullnameInput.value = found ? found.HO_TEN : "❌ Không tìm thấy";
        } else {
            fullnameInput.value = "";
        }
        validateForm();
    });


    // Code input 6 số → tự nhảy
    for (let i = 1; i <= 6; i++) {
        const input = document.getElementById(`code-${i}`);

        input.addEventListener("input", () => {
            if (input.value.length === 1 && i < 6) {
                document.getElementById(`code-${i + 1}`).focus();
            }
            validateForm();
        });

        input.addEventListener("keydown", (e) => {
            if (e.key === "Backspace" && !input.value && i > 1) {
                document.getElementById(`code-${i - 1}`).focus();
            }
        });
    }

    // Nút submit
    btn.addEventListener("click", async () => {
        const mssv = mssvInput.value.trim();
        const fullname = fullnameInput.value.trim();
        const month = monthInput.value;
        const code = Array.from({ length: 6 }, (_, i) =>
            document.getElementById(`code-${i + 1}`).value
        ).join("");

        const data = { mssv, fullname, month, code };

        mess.textContent = "⏳ Đang gửi...";
        btn.disabled = true;

        try {
            const res = await connectGAS("addMuster", data);
            mess.textContent = res.success ? "✅ Gửi thành công" : "❌ " + res.mess;
        } catch (err) {
            mess.textContent = "❌ Lỗi gửi: " + err.message;
        } finally {
            btn.disabled = false;
        }
    });
}

// --- Kiểm tra form ---
function validateForm() {
    const mssv = document.getElementById("mssv").value.trim();
    const fullname = document.getElementById("fullname").value.trim();
    const code = Array.from({ length: 6 }, (_, i) =>
        document.getElementById(`code-${i + 1}`).value
    ).join("");

    const btn = document.getElementById("submit");

    if (mssv.length === 8 && fullname && !fullname.startsWith("❌") && code.length === 6) {
        btn.disabled = false;
    } else {
        btn.disabled = true;
    }
}

// --- Chạy ngay ---
init();
