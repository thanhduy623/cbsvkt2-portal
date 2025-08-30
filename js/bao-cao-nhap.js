import { connectGAS } from '../js/connectGAS.js';
import { Loading } from './loading.js';  // import module loading

document.addEventListener("DOMContentLoaded", async () => {
    await setUpMemberList();
    setUpAddSubjectButton();
    setUpSubmitButton();
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

        for (let el of inputs) {
            if (el.type === "submit" || el.type === "button" || el.type === "checkbox") continue;
            if (el.closest("#studyTable")) continue;
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

            // chỉ cần có ít nhất 1 ô không rỗng thì push
            if (ten || gpa || giuaKy || cuoiKy) {
                bangDiemHocTap.push({ ten, gpa, giuaKy, cuoiKy });
            }
        });

        // kiểm tra: bảng phải có ít nhất 1 dòng dữ liệu
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

        Loading.show(); // overlay loading khi submit

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
