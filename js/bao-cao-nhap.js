import { connectGAS } from '../js/connectGAS.js';
import { Loading } from './loading.js';  // import module loading

document.addEventListener("DOMContentLoaded", async () => {
    await setUpMemberList();
    setUpAddSubjectButton();
    setUpSubmitButton();
    selectedMonth();
    checkJoinMeeting();
});

// ==========================
// Load danh sách sinh viên
// ==========================
async function setUpMemberList() {
    const mssvInput = document.getElementById("maSinhVien");
    const fullnameInput = document.getElementById("hoTen");
    const form = document.getElementById("baoCaoNhapForm");
    if (!mssvInput || !fullnameInput || !form) return console.error("❌ Thiếu element");

    const allFields = [mssvInput, ...form.querySelectorAll("input, select, textarea, button")];
    allFields.forEach(el => el.disabled = true);
    mssvInput.placeholder = "Đang tải dữ liệu...";

    Loading.show(); // hiển thị overlay loading

    let members = [];
    try {
        const res = await connectGAS("getMemberList", {});
        if (res.success && Array.isArray(res.data)) {
            members = res.data;
            console.log("✅ Danh sách sinh viên:", members);
        } else {
            alert("❌ Không tải được danh sách sinh viên!");
        }
    } catch (err) {
        console.error(err);
        alert("❌ Lỗi khi gọi server!");
    } finally {
        Loading.hide(); // ẩn overlay loading
        allFields.forEach(el => el.disabled = false);
        mssvInput.placeholder = "Nhập mã sinh viên";
    }

    mssvInput.addEventListener("input", () => {
        const val = mssvInput.value.trim();
        if (val.length === 8) {
            const found = members.find(m => String(m.MSSV) === val);
            fullnameInput.value = found ? found.HO_TEN : "";
        } else {
            fullnameInput.value = "";
        }
    });
}

// ==========================
// Submit form kèm overlay loading
// ==========================
function setUpSubmitButton() {
    const form = document.getElementById("baoCaoNhapForm");
    if (!form) return console.error("❌ Form không tồn tại");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const inputs = Array.from(form.querySelectorAll("input, select, textarea"));
        const thamGiaValue = document.getElementById("thamGiaSinhHoatCB")?.value;

        for (let el of inputs) {
            if (el.type === "submit" || el.type === "button" || el.type === "checkbox") continue;

            // ⛔ Bỏ qua các mục Bảng điểm chi tiết
            if (el.closest("#studyTable")) continue;

            // ⛔ Bỏ qua các mục 6.2 - 6.5 nếu "Có thể tham gia"
            if (["mailXinVang", "baoXinVang", "lyDoXinVang", "donXinVang"].includes(el.id)) {
                if (thamGiaValue !== "Không thể tham gia") continue;
            }

            if (!el.value || el.value.trim() === "") {
                alert(`❌ Vui lòng điền đầy đủ thông tin: ${el.name || el.id}`);
                el.focus();
                return;
            }
        }

        const bangDiemHocTap = [];
        document.querySelectorAll("#studyTable tbody tr").forEach(row => {
            const ten = row.querySelector(`input[name^='tenMonHoc']`).value.trim();
            const gpa = row.querySelector(`input[name^='gpa']`).value.trim();
            const giuaKy = row.querySelector(`input[name^='giuaKy']`).value.trim();
            const cuoiKy = row.querySelector(`input[name^='cuoiKy']`).value.trim();

            if (ten || gpa || giuaKy || cuoiKy) {
                bangDiemHocTap.push({ ten, gpa, giuaKy, cuoiKy });
            }
        });

        if (bangDiemHocTap.length === 0) {
            alert("❌ Vui lòng nhập ít nhất một môn học trong bảng!");
            return;
        }

        const data = {};
        inputs.forEach(el => {
            if (el.type === "checkbox") data[el.name || el.id] = el.checked;
            else if (!el.closest("#studyTable")) data[el.name || el.id] = el.value.trim();
        });
        data.bangDiemHocTap = bangDiemHocTap;
        data.baoCaoNam = `Năm ${new Date().getFullYear()}`;

        // ==== Xử lý file đơn xin vắng ====
        const fileInput = document.getElementById("donXinVang");
        const file = fileInput?.files[0];

        if (file) {
            try {
                const base64 = await readFileAsBase64(file);
                const mssv = document.getElementById("maSinhVien").value.trim();
                const hoTen = document.getElementById("hoTen").value.trim();
                const month = document.getElementById("baoCaoThang").value.replace("Tháng ", "");
                const year = new Date().getFullYear();

                const fileName = `ĐXV${year}${month} - ${mssv} - ${hoTen}.pdf`;

                data.donXinVang = {
                    name: fileName,
                    content: base64,
                    mimeType: file.type || "application/pdf"
                };
            } catch (err) {
                console.error("❌ Lỗi đọc file:", err);
                alert("❌ Không thể đọc file đơn xin vắng!");
                return;
            }
        }

        Loading.show();

        try {
            const res = await connectGAS("saveReport", data);
            if (res.success) {
                alert("✅ Lưu báo cáo thành công!");
                form.reset();
            } else {
                alert("❌ Lưu báo cáo thất bại: " + res.message);
            }
        } catch (err) {
            console.error(err);
            alert("❌ Không thể kết nối server!");
        } finally {
            Loading.hide();
        }

        console.log("📦 JSON gửi đi:", data);
    });
}

// Helper: đọc file thành base64
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result.split(",")[1]; // bỏ prefix data:...
            resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ==========================
// Thêm dòng môn học
// ==========================
function setUpAddSubjectButton() {
    const addSubjectBtn = document.getElementById("add-subject");
    const studyTableBody = document.querySelector("#studyTable tbody");

    if (!addSubjectBtn || !studyTableBody) return;

    addSubjectBtn.addEventListener("click", () => {
        const lastRow = studyTableBody.querySelector("tr:last-child");
        const lastTenMon = lastRow.querySelector("input[name^='tenMonHoc']").value.trim();

        if (!lastTenMon) {
            alert("❌ Vui lòng nhập tên môn học ở dòng trước trước khi thêm dòng mới!");
            return;
        }

        const newIndex = studyTableBody.querySelectorAll("tr").length + 1;
        const newRow = document.createElement("tr");
        newRow.innerHTML = `
            <td><input type="text" name="tenMonHoc_${newIndex}" placeholder="Tên môn học"></td>
            <td><input type="text" name="gpa_${newIndex}" placeholder="X.X"></td>
            <td><input type="text" name="giuaKy_${newIndex}" placeholder="X.X"></td>
            <td><input type="text" name="cuoiKy_${newIndex}" placeholder="X.X"></td>
        `;
        studyTableBody.appendChild(newRow);
    });
}

// ==========================
// Chọn tháng theo ngày hiện tại
// ==========================
function selectedMonth() {
    const monthSelect = document.getElementById("baoCaoThang");
    if (!monthSelect) return;

    const now = new Date();
    let currentMonth = now.getMonth() + 1;

    if (now.getDate() > 10) {
        currentMonth++;
        if (currentMonth > 12) currentMonth = 1;
    }

    const monthValue = `Tháng ${currentMonth.toString().padStart(2, "0")}`;
    monthSelect.value = monthValue;
}

// ==========================
// Điền dữ liệu báo vắng
// ==========================
function checkJoinMeeting() {
    const thamGiaSelect = document.getElementById("thamGiaSinhHoatCB");
    const vangFields = document.getElementById("vangFields");

    const requiredFields = ["mailXinVang", "baoXinVang", "lyDoXinVang", "donXinVang"];

    function toggleVangFields() {
        if (thamGiaSelect.value === "Không thể tham gia") {
            vangFields.style.display = "block";
            requiredFields.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.setAttribute("required", "required");
            });
        } else {
            vangFields.style.display = "none";
            requiredFields.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.removeAttribute("required");
            });
        }
    }

    toggleVangFields();
    thamGiaSelect.addEventListener("change", toggleVangFields);
}
