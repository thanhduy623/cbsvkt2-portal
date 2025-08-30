import { connectGAS } from './connectGAS.js';
import { Loading } from './loading.js';

document.addEventListener("DOMContentLoaded", () => {
    setUpGetReportButton();
});

async function setUpGetReportButton() {
    const form = document.getElementById("baoCaoNhapForm");
    if (!form) return console.error("❌ Form không tồn tại");

    // Tạo container hiển thị dữ liệu
    let reportContainer = document.createElement("div");
    reportContainer.id = "reportContainer";
    reportContainer.style.marginTop = "20px";
    form.insertAdjacentElement("afterend", reportContainer);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const baoCaoNam = form.querySelector("#baoCaoNam").value.trim();
        const baoCaoThang = form.querySelector("#baoCaoThang").value.trim();
        const toDang = form.querySelector("#toDang").value.trim();
        const passCode = form.querySelector("#passCode").value.trim();

        if (!baoCaoNam || !baoCaoThang || !toDang || !passCode) {
            alert("❌ Vui lòng điền đầy đủ thông tin");
            return;
        }

        Loading.show();

        try {
            // XÓA BẢNG CŨ nếu có
            reportContainer.innerHTML = "";

            const resMembers = await connectGAS("getMemberList", {});
            if (!resMembers.success) throw new Error("❌ Lấy danh sách Chi bộ thất bại");
            let members = resMembers.data;

            members = members.filter(m => m.toDang === toDang);

            const data = { baoCaoNam, baoCaoThang, toDang, passCode };
            const resReports = await connectGAS("getReport", data);

            let reports = [];
            if (resReports.success && Array.isArray(resReports.data)) {
                reports = resReports.data;
            }

            const finalData = members.map(member => {
                const mssv = String(member.MSSV).trim();
                const report = reports.find(r =>
                    String(r.maSinhVien).trim() === mssv &&
                    String(r.baoCaoThang).trim() === baoCaoThang &&
                    String(r.baoCaoNam).trim() === baoCaoNam
                ) || {};

                return {
                    hoTen: member.HO_TEN,
                    maSinhVien: mssv,
                    toDang: member.toDang,
                    ...report,
                    status: report.maSinhVien ? "Đã báo cáo" : "Chưa thực hiện báo cáo"
                };
            });

            displayReport(finalData, reportContainer);

        } catch (err) {
            console.error(err);
            alert(err.message || "❌ Không thể kết nối server!");
            reportContainer.innerHTML = "";
        } finally {
            Loading.hide();
        }
    });
}

function displayReport(data, container) {
    // Reset container
    container.innerHTML = "";

    if (!data || data.length === 0) {
        container.innerHTML = "<p>Không có dữ liệu báo cáo.</p>";
        return;
    }

    let html = `
        <h2>DỮ LIỆU TỔNG HỢP</h2>
        <table border="1" cellpadding="5" cellspacing="0" 
               style="width:100%; border-collapse: collapse;">
            <thead>
                <tr>
                    <th>STT</th>
                    <th>Họ và tên</th>
                    <th>Tư tưởng, chính trị</th>
                    <th>Tình hình rèn luyện</th>
                    <th>Kết quả học tập</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((row, index) => {
        if (!row.maSinhVien || row.status === "Chưa thực hiện báo cáo") {
            return `
                <tr style="cursor:pointer;">
                    <td>${index + 1}</td>
                    <td>
                        <strong>${row.hoTen || ""}</strong><br>
                        MSSV: ${row.maSinhVien || ""}<br>
                        Phân loại: ${row.dangVien || ""}
                    </td>
                    <td colspan="3" style="text-align:center; color:red;">
                        Chưa báo cáo
                    </td>
                </tr>
            `;
        }
        return `
            <tr style="cursor:pointer;">
                <td>${index + 1}</td>
                <td>
                    <strong>${row.hoTen || ""}</strong><br>
                    MSSV: ${row.maSinhVien || ""}<br>
                    Phân loại: ${row.dangVien || ""}
                </td>
                <td>
                    - Tự diễn biến, tự chuyển hóa: ${row.dienBienChuyenHoa || ""}<br>
                    - Suy thoái tư tưởng chính trị: ${row.suyThoaiChinhTri || ""}
                </td>
                <td>
                    - Điểm rèn luyện hiện tại: <strong>${row.renluyen || ""}</strong><br>
                    - Vi phạm nội quy: ${row.viPhamNoiQuy || ""}<br>
                    - Vi phạm pháp luật: ${row.viPhamPhapLuat || ""}<br>
                    - Dữ liệu học kỳ: ${row.hocKy || ""}
                </td>
                <td>
                    - Tổng kết học kỳ: <strong>${row.tongKetHocKy || ""}</strong><br>
                    - Tự đánh giá: ${row.tuDanhGiaHocTap || ""}<br>
                    - Dữ liệu học kỳ: ${row.hocKy || ""}
                </td>
            </tr>
        `;
    }).join("")}
            </tbody>
        </table>
    `;

    container.innerHTML = html;

    // Gắn sự kiện click chi tiết (chỉ những dòng có báo cáo)
    container.querySelectorAll("tbody tr").forEach((tr, index) => {
        if (data[index].status === "Đã báo cáo") {
            tr.addEventListener("click", () => showDetail(data[index]));
        }
    });
}




function parseBangDiem(str) {
    if (!str || typeof str !== "string") return [];

    const items = str.match(/\{.*?\}/g);
    if (!items) return [];

    return items.map(s => {
        const obj = {};
        s.replace(/[{}]/g, "") // bỏ { }
            .split(",")
            .forEach(pair => {
                let [key, value] = pair.split("=");
                key = key.trim();
                value = value.trim();
                if (value === "null") value = "";
                obj[key] = value;
            });
        return obj;
    });
}

let detailWindow = null; // biến toàn cục để lưu popup

function showDetail(item) {
    // Parse bảng điểm
    const diem = parseBangDiem(item.bangDiemHocTap);

    let bangDiemHTML = "";
    if (diem.length > 0) {
        bangDiemHTML = `
            <table border="1" cellpadding="5" cellspacing="0" 
                   style="border-collapse: collapse; width:100%; margin-top:10px;">
                <thead>
                    <tr style="background:#f2f2f2;">
                        <th>Môn học</th>
                        <th>Giữa kỳ</th>
                        <th>Cuối kỳ</th>
                        <th>GPA / Tổng kết</th>
                    </tr>
                </thead>
                <tbody>
                    ${diem.map(d => `
                        <tr>
                            <td>${d.ten || ""}</td>
                            <td>${d.giuaKy || ""}</td>
                            <td>${d.cuoiKy || ""}</td>
                            <td>${d.gpa || ""}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        `;
    } else {
        bangDiemHTML = "<p>Không có bảng điểm</p>";
    }

    // Nội dung chi tiết
    const detailHTML = `
        <h2>📌 Chi tiết báo cáo</h2>
        <p><strong>Họ tên:</strong> ${item.hoTen || ""} (${item.maSinhVien || ""})</p>
        <p><strong>Năm báo cáo:</strong> ${item.baoCaoNam || ""} - 
        <strong>Tháng:</strong> ${item.baoCaoThang || ""}</p>
        <p><strong>Đảng viên:</strong> ${item.dangVien || ""}</p>
        <p><strong>Tổ Đảng:</strong> ${item.toDang || ""}</p>
        <p><strong>Học kỳ:</strong> ${item.hocKy || ""} - <strong>Năm học:</strong> ${item.namHoc || ""}</p>
        <hr>

        <h3>Tư tưởng, chính trị</h3>
        <p>- Tự diễn biến, tự chuyển hóa: ${item.dienBienChuyenHoa || ""}</p>
        <p>- Suy thoái tư tưởng chính trị: ${item.suyThoaiChinhTri || ""}</p>
        <p>Nhận xét lập trường: ${item.nhanXetLapTruong.trim() || ""}</p>            
        </div>

        <h3>Rèn luyện</h3>
        <p>- Điểm rèn luyện hiện tại: <strong>${item.renluyen || ""}</strong></p>
        <p>- Vi phạm nội quy: ${item.viPhamNoiQuy || ""}</p>
        <p>- Vi phạm pháp luật: ${item.viPhamPhapLuat || ""}</p>
        <p>Nhận xét rèn luyện: ${item.nhanXetRenLuyen.trim() || ""}</p>

        <h3>Học tập</h3>
        <p>- Tự đánh giá: ${item.tuDanhGiaHocTap || ""}</p>
        <p>- Tổng kết học kỳ: ${item.tongKetHocKy || ""}</p>
        <p>Nhận xét học tập: ${item.nhanXetHocTap.trim() || ""}</p>

        <h3>Bảng điểm chi tiết</h3>
        ${bangDiemHTML}
    `;



    // Nếu popup chưa mở hoặc đã bị đóng → mở mới
    if (!detailWindow || detailWindow.closed) {
        detailWindow = window.open("", "ChiTietBaoCao", "width=800,height=600,scrollbars=yes");
    }

    // Ghi đè nội dung popup mỗi lần click
    detailWindow.document.open();
    detailWindow.document.write(`
        <html>
        <head>
            <title>Chi tiết báo cáo</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
                h2 { margin-bottom: 10px; }
                h3 { margin-top: 20px; }
                table { margin-top: 10px; }
                td, th { text-align: center; }
            </style>
        </head>
        <body>
            ${detailHTML}
        </body>
        </html>
    `);
    detailWindow.document.close();
}
