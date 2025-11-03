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
                const sameReports = reports.filter(r =>
                    String(r.maSinhVien).trim() === mssv &&
                    String(r.baoCaoThang).trim() === baoCaoThang &&
                    String(r.baoCaoNam).trim() === baoCaoNam
                );

                const report = sameReports.length > 0
                    ? sameReports[sameReports.length - 1] // ✅ lấy bản cuối cùng (gửi mới nhất)
                    : {};


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
        ${generateSummary(data)}
        <br>
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
                    Phân loại: ${row.dangVien || ""} ${row.thamGiaSinhHoatCB === "Không thể tham gia" ? '<span style="color:red;"> - Xin vắng</span>' : ""}
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
        <p>
        <strong>Họ tên:</strong> ${item.hoTen || ""} (${item.maSinhVien || ""})
        ${item.thamGiaSinhHoatCB === "Không thể tham gia" ? '<span style="color:red;"> – Xin vắng</span>' : ""}

        </p>
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
        <hr>

        <h3>Rèn luyện</h3>
        <p>- Điểm rèn luyện hiện tại: <strong>${item.renluyen || ""}</strong></p>
        <p>- Vi phạm nội quy: ${item.viPhamNoiQuy || ""}</p>
        <p>- Vi phạm pháp luật: ${item.viPhamPhapLuat || ""}</p>
        <p>Nhận xét rèn luyện: ${item.nhanXetRenLuyen.trim() || ""}</p>
        <hr>

        <h3>Học tập</h3>
        <p>- Tự đánh giá: ${item.tuDanhGiaHocTap || ""}</p>
        <p>- Tổng kết học kỳ: ${item.tongKetHocKy || ""}</p>
        <p>Nhận xét học tập: ${item.nhanXetHocTap.trim() || ""}</p>
        <hr>

        <h3>Bảng điểm chi tiết</h3>
        ${bangDiemHTML}

        ${item.thamGiaSinhHoatCB === "Không thể tham gia" ? `
            <h3>Xin vắng sinh hoạt</h3>
            <p>- Tham gia sinh hoạt chi bộ: ${item.thamGiaSinhHoatCB || ""}</p>
            <p>- Mail xin vắng: ${item.mailXinVang || ""}</p>
            <p>- Báo xin vắng: ${item.baoXinVang || ""}</p>
            <p>- Lý do xin vắng: ${item.lyDoXinVang || ""}</p>
            <p>- Đơn xin vắng: ${item.donXinVang ? `<a href="${item.donXinVang}" target="_blank">Xem file</a>` : ""}</p>
        ` : ""}

    `;



    // Nếu tab chưa mở hoặc đã đóng → mở mới
    if (!detailWindow || detailWindow.closed) {
        detailWindow = window.open("", "_blank"); // mở tab mới
    }

    // Ghi đè nội dung tab
    detailWindow.document.open();
    detailWindow.document.write(`
        <html>
        <head>
            <title>Chi tiết báo cáo</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
                h2 { margin-bottom: 10px; }
                h3 { margin-top: 20px; }
                table { margin-top: 10px; border-collapse: collapse; width: 100%; }
                td, th { text-align: center; padding: 5px; border: 1px solid #ddd; }
                th { background: #f2f2f2; }
            </style>
        </head>
        <body>
            ${detailHTML}
        </body>
        </html>
    `);
    detailWindow.document.close();
}


function generateSummary(data) {
    if (!Array.isArray(data) || data.length === 0) return "";

    // Helper: chuyển chuỗi thành số
    function toNumber(val) {
        if (!val) return NaN;
        let n = parseFloat(val.toString().replace(",", "."));
        return isNaN(n) ? NaN : n;
    }

    const tongBaoCao = data.filter(d => d.status === "Đã báo cáo").length;

    // 1. Đảng viên
    const tongDangVien = data.filter(d => d.dangVien).length;
    const dangVienChinhThuc = data.filter(d => String(d.dangVien).toLowerCase().includes("chính thức")).length;
    const dangVienDuBi = data.filter(d => String(d.dangVien).toLowerCase().includes("dự bị")).length;

    // 2. Báo cáo
    const soDaBaoCao = tongBaoCao;
    const soChuaBaoCao = data.length - soDaBaoCao;
    const soXinVang = data.filter(d => d.donXinVang || d.baoXinVang).length;

    // 3. Tư tưởng, chính trị
    const dienBien = data.filter(d => String(d.dienBienChuyenHoa).trim() === "Có");
    const suyThoai = data.filter(d => String(d.suyThoaiChinhTri).trim() === "Có");

    const viPhamNoiQuy = data.filter(d => String(d.viPhamNoiQuy).trim() === "Có");
    const viPhamPhapLuat = data.filter(d => String(d.viPhamPhapLuat).trim() === "Có");

    // 4. Điểm rèn luyện
    const renLuyenScores = data.map(d => toNumber(d.renluyen)).filter(v => !isNaN(v));
    const renLuyenMin = renLuyenScores.length ? Math.min(...renLuyenScores) : "–";
    const renLuyenMax = renLuyenScores.length ? Math.max(...renLuyenScores) : "–";
    const renLuyenAvg = renLuyenScores.length ? (renLuyenScores.reduce((a, b) => a + b, 0) / renLuyenScores.length).toFixed(2) : "–";

    // 5. Điểm học tập
    const hocTapScores = data
        .map(d => toNumber(d.tongKetHocKy) || toNumber(d.tuDanhGiaHocTap))
        .filter(v => !isNaN(v));
    const hocTapMin = hocTapScores.length ? Math.min(...hocTapScores) : "–";
    const hocTapMax = hocTapScores.length ? Math.max(...hocTapScores) : "–";
    const hocTapAvg = hocTapScores.length ? (hocTapScores.reduce((a, b) => a + b, 0) / hocTapScores.length).toFixed(2) : "–";

    return `
        <div style="
            margin:20px 0; 
            padding:20px; 
            border:2px solid #444; 
            border-radius:10px; 
            font-size:15px;
        ">
            <h3 style="margin-top:0; text-align:center; font-size:20px; font-weight:bold;">📊 THỐNG KÊ TỔNG HỢP</h3>

            <div style="display:flex; flex-wrap:wrap; gap:15px; margin-top:10px;">
                
                <div style="flex:1; min-width:250px; padding:12px; border:1px solid #ccc; border-radius:8px; background:#fff;">
                    <h4 style="font-size:16px; font-weight:bold; color:#2c3e50;">👥 Đảng viên</h4>
                    <p>- Tổng số: ${tongDangVien}</p>
                    <p>- Chính thức: ${dangVienChinhThuc}</p>
                    <p>- Dự bị: ${dangVienDuBi}</p>
                </div>

                <div style="flex:1; min-width:250px; padding:12px; border:1px solid #ccc; border-radius:8px; background:#fff;">
                    <h4 style="font-size:16px; font-weight:bold; color:#2c3e50;">📑 Báo cáo</h4>
                    <p>- Đã báo cáo: ${soDaBaoCao}</p>
                    <p>- Chưa báo cáo: ${soChuaBaoCao}</p>
                    <p>- Xin vắng: ${soXinVang}</p>
                </div>

                <div style="flex:1; min-width:250px; padding:12px; border:1px solid #ccc; border-radius:8px; background:#fff;">
                    <h4 style="font-size:16px; font-weight:bold; color:#2c3e50;">🧠 Tư tưởng chính trị</h4>
                    <p style="color:${(dienBien.length + suyThoai.length) !== 0 ? 'red' : 'inherit'};">
                        - Tư tưởng giao động: ${dienBien.length + suyThoai.length} / ${tongBaoCao}
                    </p>
                    <p style="color:${viPhamNoiQuy.length !== 0 ? 'red' : 'inherit'};">
                        - Vi phạm nội quy: ${viPhamNoiQuy.length} / ${tongBaoCao}
                    </p>
                    <p style="color:${viPhamPhapLuat.length !== 0 ? 'red' : 'inherit'};">
                        - Vi phạm pháp luật: ${viPhamPhapLuat.length} / ${tongBaoCao}
                    </p>
                </div>
                                    
                <div style="flex:1; min-width:250px; padding:12px; border:1px solid #ccc; border-radius:8px; background:#fff;">
                    <h4 style="font-size:16px; font-weight:bold; color:#2c3e50;">💪 Rèn luyện</h4>
                    <p>- Thấp nhất: ${renLuyenMin}</p>
                    <p>- Cao nhất: ${renLuyenMax}</p>
                    <p>- Trung bình: ${renLuyenAvg}</p>
                </div>

                <div style="flex:1; min-width:250px; padding:12px; border:1px solid #ccc; border-radius:8px; background:#fff;">
                    <h4 style="font-size:16px; font-weight:bold; color:#2c3e50;">📚 Học tập</h4>
                    <p>- Thấp nhất: ${hocTapMin}</p>
                    <p>- Cao nhất: ${hocTapMax}</p>
                    <p>- Trung bình: ${hocTapAvg}</p>
                </div>

            </div>
        </div>
    `;
}

