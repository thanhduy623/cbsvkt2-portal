/**
 * Module xử lý giao diện giả lập văn bản 2 cột (1:5)
 * - Trình tự: KD_MB_02 -> KD_MB_01 -> KD_MB_03
 * - Kiểm tra tối thiểu 3 ý (> 150 ký tự) cho I.1, I.2, I.3, II.1, II.2, VI
 * - Radio 1 trong 5 cho mục B.II (KĐG -> "Kết nạp chưa đủ 6 tháng")
 * - 6 Popup xác nhận tuần tự trước khi tải file
 * - Tự động xóa các dòng (<w:p>) chứa biến bị bỏ trống trong file DOCX xuất ra
 */

const SEQUENTIAL_CONFIRM_MESSAGES = [
  "Không cung cấp link này cho đối tượng khác ngoài Chi bộ",
  "Đảm bảo các phần ký tên liền mạch và đủ ví trí ký",
  "Xoá các dòng trống trong file nếu có",
  "Đọc và cập nhật các phần tô vàng trong các file (nếu có thay đổi)",
  "Đây chỉ là file tham khảo đề nghị chỉnh sửa hoàn chỉnh",
  "Xác nhận tải file và nộp cho tổ đúng hạn",
  "Nhắc nhở điền dữ liệu báo cáo dữ liệu và tiến độ thực hiện",
];

document.addEventListener("DOMContentLoaded", () => {
  renderBulletGroups();
  initSidebarNavigation();
  initSpecialSelects();
  initSyncAndCalculations();
  initDownloadAllButton();
  validateAllSteps(false);
});

/* ==========================================================================
   1. RENDER CÁC DÒNG NHẬP LIỆU VỚI BỘ ĐẾM TỐI THIỂU 120 KÝ TỰ
   ========================================================================== */
function renderBulletGroups() {
  const groups = document.querySelectorAll(".bullet-group");
  groups.forEach((group) => {
    const prefix = group.dataset.prefix;
    const count = parseInt(group.dataset.count, 10) || 5;
    const reqCount = parseInt(group.dataset.reqCount, 10) || 0;
    const minLen = parseInt(group.dataset.minLen, 10) || 1;
    const placeholder = group.dataset.placeholder || "Nhập nội dung";

    for (let i = 1; i <= count; i++) {
      const key = `${prefix}${i}`;
      const isReq = i <= reqCount;

      const row = document.createElement("div");
      row.className = "bullet-item";

      const dash = document.createElement("span");
      dash.className = "bullet-dash";
      dash.textContent = "-";

      const textarea = document.createElement("textarea");
      textarea.className = `bullet-textarea ${isReq ? "is-required" : ""}`;
      textarea.rows = 1;
      textarea.dataset.key = key;

      if (isReq) {
        textarea.dataset.required = "true";
        textarea.dataset.minLength = String(minLen);
        textarea.placeholder =
          minLen > 150
            ? `${placeholder} (Ý ${i} - Bắt buộc trên 150 ký tự)...`
            : `${placeholder} (Ý ${i} - Bắt buộc)...`;
      } else {
        textarea.placeholder = `${placeholder} (Ý ${i} - Tùy chọn, bỏ trống sẽ tự xóa dòng)...`;
      }

      const meta = document.createElement("div");
      meta.className = "bullet-meta";

      const badge = document.createElement("span");
      badge.className = `bullet-badge ${isReq ? "req" : "opt"}`;
      badge.textContent = isReq ? "* Bắt buộc" : "Tùy chọn";
      meta.appendChild(badge);

      let counterEl = null;
      if (isReq && minLen > 150) {
        counterEl = document.createElement("span");
        counterEl.className = "char-counter";
        counterEl.textContent = "0/150 ký tự";
        meta.appendChild(counterEl);
      }

      textarea.addEventListener("input", () => {
        autoResizeTextarea(textarea);
        if (counterEl) {
          const len = textarea.value.trim().length;
          counterEl.textContent = `${len}/150 ký tự`;
          counterEl.classList.toggle("ok", len >= minLen);
        }
      });

      row.appendChild(dash);
      row.appendChild(textarea);
      row.appendChild(meta);
      group.appendChild(row);
    }
  });
}

function autoResizeTextarea(el) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

/* ==========================================================================
   2. ĐIỀU HƯỚNG SIDEBAR (1:5) THEO TRÌNH TỰ BM02 -> BM01 -> BM03
   ========================================================================== */
function initSidebarNavigation() {
  document.querySelectorAll(".step-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchStep(btn.dataset.target);
    });
  });
}

function switchStep(targetId) {
  document.querySelectorAll(".step-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.target === targetId);
  });
  document.querySelectorAll(".a4-paper").forEach((paper) => {
    paper.classList.toggle("active", paper.id === targetId);
  });

  document.querySelectorAll(".bullet-textarea").forEach(autoResizeTextarea);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ==========================================================================
   3. XỬ LÝ SELECT CỤM ĐẶC BIỆT ("Không có.") TẠI MỤC III, IV, V
   ========================================================================== */
function initSpecialSelects() {
  document.querySelectorAll(".special-mode-select").forEach((select) => {
    const applyMode = () => {
      const prefix = select.dataset.targetPrefix;
      const mode = select.value;

      for (let i = 1; i <= 5; i++) {
        const ta = document.querySelector(`[data-key="${prefix}${i}"]`);
        if (!ta) continue;

        if (mode === "none") {
          if (i === 1) {
            ta.value = "Không có.";
            ta.disabled = true;
            ta.classList.remove("input-error");
          } else {
            ta.value = "";
            ta.disabled = true;
          }
        } else {
          if (ta.value === "Không có.") ta.value = "";
          ta.disabled = false;
        }
        autoResizeTextarea(ta);
      }
      validateAllSteps(false);
    };

    select.addEventListener("change", applyMode);
    applyMode();
  });
}

/* ==========================================================================
   4. ĐỒNG BỘ DỮ LIỆU & TÍNH ĐIỂM TỰ ĐỘNG
   ========================================================================== */
function initSyncAndCalculations() {
  document.querySelectorAll("[data-key]").forEach((el) => {
    el.addEventListener("input", () => {
      const key = el.dataset.key;
      const val = el.value;

      document.querySelectorAll(`[data-key="${key}"]`).forEach((sibling) => {
        if (sibling !== el) {
          sibling.value = val;
        }
      });

      updateMirrors(key, val);

      if (el.classList.contains("score-input")) {
        validateScoreBound(el);
        recalculateScores(true);
      }

      const minLen = parseInt(el.dataset.minLength, 10) || 1;
      if (val.trim().length >= minLen) {
        document
          .querySelectorAll(`[data-key="${key}"]`)
          .forEach((s) => s.classList.remove("input-error"));
      }

      validateAllSteps(false);
    });
  });

  // Lắng nghe thay đổi Radio xếp loại B.II
  document.querySelectorAll('input[name="rank_selection"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      validateAllSteps(false);
    });
  });
}

function updateMirrors(key, value) {
  document.querySelectorAll(`[data-mirror="${key}"]`).forEach((mirror) => {
    mirror.textContent = value || (key === "ho_ten" ? "[Họ và tên]" : "");
  });
}

function validateScoreBound(input) {
  const min = parseFloat(input.min) || 0;
  const max = parseFloat(input.max) || 100;
  let val = parseFloat(input.value);
  if (isNaN(val)) return;
  if (val < min) input.value = min;
  if (val > max) input.value = max;
}

function getNumericValue(key) {
  const el = document.querySelector(`[data-key="${key}"]`);
  return el && el.value !== "" ? parseFloat(el.value) || 0 : 0;
}

function recalculateScores(autoSelectRank = false) {
  const tcc_1_1 = getNumericValue("tcc_1_1");
  const tcc_1_2 = getNumericValue("tcc_1_2");
  const tcc_1_3 = getNumericValue("tcc_1_3");
  const tcc_1 = +(tcc_1_1 + tcc_1_2 + tcc_1_3).toFixed(2);

  const tcc_2 = getNumericValue("tcc_2");
  const ntcc = +(tcc_1 + tcc_2).toFixed(2);

  const tcr_2 = getNumericValue("tcr_2");
  const tcr_3 = getNumericValue("tcr_3");
  const tcr_4 = getNumericValue("tcr_4");
  const ntcr = +(tcr_2 + tcr_3 + tcr_4).toFixed(2);

  const td = +(ntcc + ntcr).toFixed(2);

  updateMirrors("tcc_1", tcc_1);
  updateMirrors("tcc_2", tcc_2);
  updateMirrors("ntcc", ntcc);
  updateMirrors("ntcr", ntcr);
  updateMirrors("td", td);

  // Tự động gợi ý Radio xếp loại nếu người dùng chưa chọn KĐG
  if (autoSelectRank) {
    const selectedRadio = document.querySelector(
      'input[name="rank_selection"]:checked',
    );
    if (!selectedRadio || selectedRadio.value !== "is_kdg") {
      const hasAnyScore = [
        "tcc_1_1",
        "tcc_1_2",
        "tcc_1_3",
        "tcc_2",
        "tcr_2",
        "tcr_3",
        "tcr_4",
      ].some((k) => document.querySelector(`[data-key="${k}"]`)?.value !== "");

      if (hasAnyScore) {
        let targetVal = "is_kht";
        if (td >= 90) targetVal = "is_htxs";
        else if (td >= 70) targetVal = "is_htt";
        else if (td >= 50) targetVal = "is_ht";

        const targetRadio = document.querySelector(
          `input[name="rank_selection"][value="${targetVal}"]`,
        );
        if (targetRadio) targetRadio.checked = true;
      }
    }
  }

  return {
    tcc_1_1,
    tcc_1_2,
    tcc_1_3,
    tcc_1,
    tcc_2,
    ntcc,
    tcr_2,
    tcr_3,
    tcr_4,
    ntcr,
    td,
  };
}

/* ==========================================================================
   5. KIỂM TRA TÍNH HỢP LỆ CỦA TOÀN BỘ 3 BIỂU MẪU
   ========================================================================== */
function checkSectionValidity(sectionId, highlightErrors = false) {
  const section = document.getElementById(sectionId);
  if (!section) return true;

  let isValid = true;
  const requiredInputs = section.querySelectorAll("[data-required='true']");

  requiredInputs.forEach((input) => {
    const val = input.value.trim();
    const minLen = parseInt(input.dataset.minLength, 10) || 1;

    if (val === "" || val.length < minLen) {
      isValid = false;
      if (highlightErrors) input.classList.add("input-error");
    } else {
      input.classList.remove("input-error");
    }
  });

  // Kiểm tra Radio B.II trên Mẫu 01
  if (sectionId === "doc-mb01") {
    const selectedRank = document.querySelector(
      'input[name="rank_selection"]:checked',
    );
    if (!selectedRank) {
      isValid = false;
    }
  }

  return isValid;
}

function validateAllSteps(highlightErrors = false) {
  const mb02Ok = checkSectionValidity("doc-mb02", highlightErrors);
  const mb01Ok = checkSectionValidity("doc-mb01", highlightErrors);
  const mb03Ok = checkSectionValidity("doc-mb03", highlightErrors);

  document.getElementById("dot-mb02").className =
    `status-dot ${mb02Ok ? "valid" : "invalid"}`;
  document.getElementById("dot-mb01").className =
    `status-dot ${mb01Ok ? "valid" : "invalid"}`;
  document.getElementById("dot-mb03").className =
    `status-dot ${mb03Ok ? "valid" : "invalid"}`;

  return {
    allValid: mb02Ok && mb01Ok && mb03Ok,
    mb02Ok,
    mb01Ok,
    mb03Ok,
  };
}

/* ==========================================================================
   6. POPUP XÁC NHẬN TUẦN TỰ 6 BƯỚC TRƯỚC KHI XUẤT FILE
   ========================================================================== */
function runSequentialConfirmations() {
  return new Promise((resolve) => {
    const overlay = document.getElementById("confirmModalOverlay");
    const stepIndicator = document.getElementById("modalStepIndicator");
    const msgEl = document.getElementById("modalMessageText");
    const btnConfirm = document.getElementById("btnModalConfirm");
    const btnCancel = document.getElementById("btnModalCancel");

    let currentIndex = 0;
    const total = SEQUENTIAL_CONFIRM_MESSAGES.length;

    const renderStep = () => {
      stepIndicator.textContent = `XÁC NHẬN QUY ĐỊNH (${currentIndex + 1}/${total})`;
      msgEl.textContent = SEQUENTIAL_CONFIRM_MESSAGES[currentIndex];
    };

    const cleanup = (result) => {
      overlay.classList.remove("open");
      btnConfirm.removeEventListener("click", onConfirm);
      btnCancel.removeEventListener("click", onCancel);
      resolve(result);
    };

    const onConfirm = () => {
      currentIndex++;
      if (currentIndex < total) {
        renderStep();
      } else {
        cleanup(true);
      }
    };

    const onCancel = () => {
      cleanup(false);
    };

    btnConfirm.addEventListener("click", onConfirm);
    btnCancel.addEventListener("click", onCancel);

    renderStep();
    overlay.classList.add("open");
  });
}

/* ==========================================================================
   7. XỬ LÝ FILE DOCX & TỰ ĐỘNG XÓA DÒNG CHỨA BIẾN BỊ BỎ TRỐNG
   ========================================================================== */
function buildReplacementPayload() {
  const scores = recalculateScores(false);
  const payload = { ...scores };

  // Thu thập giá trị text/number
  document.querySelectorAll("[data-key]").forEach((el) => {
    const key = el.dataset.key;
    payload[key] = el.value.trim();
  });

  // Xử lý Radio B.II (HTXS, HTT, HT, KHT, KĐG)
  const selectedRank =
    document.querySelector('input[name="rank_selection"]:checked')?.value || "";
  payload.is_htxs = selectedRank === "is_htxs" ? "☒" : "☐";
  payload.is_htt = selectedRank === "is_htt" ? "☒" : "☐";
  payload.is_ht = selectedRank === "is_ht" ? "☒" : "☐";
  payload.is_kht = selectedRank === "is_kht" ? "☒" : "☐";
  payload.is_kdg = selectedRank === "is_kdg" ? "Kết nạp chưa đủ 6 tháng" : "";

  // Đồng bộ biến năm (kn / nam_dg / nk năm)
  if (!payload.kn) payload.kn = "2026";

  // Bổ sung các biến có khoảng trắng trong file KD_MB_01.docx gốc
  if (typeof FIELD_GROUPS !== "undefined") {
    FIELD_GROUPS.forEach((group) => {
      group.fields.forEach((field) => {
        if (field.rawKey && payload[field.key] !== undefined) {
          payload[field.rawKey] = payload[field.key];
        }
      });
    });
  }

  return payload;
}

/**
 * Xóa bỏ hoàn toàn các đoạn (<w:p>) trong word/document.xml nếu đoạn đó chỉ chứa
 * các biến bị bỏ trống, giúp văn bản không có dòng trắng thừa.
 */
function removeEmptyVariableParagraphs(zip, dataPayload) {
  const docXmlFile = zip.file("word/document.xml");
  if (!docXmlFile) return;

  const xmlText = docXmlFile.asText();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "application/xml");

  const paragraphs = Array.from(xmlDoc.getElementsByTagName("w:p"));

  paragraphs.forEach((p) => {
    const rawText = p.textContent || "";
    const matches = rawText.match(/\{([^}]+)\}/g);
    if (!matches || matches.length === 0) return;

    // Loại bỏ tất cả placeholder {key} ra khỏi text của đoạn để xem đoạn có chữ tĩnh nào không
    const staticText = rawText.replace(/\{[^}]+\}/g, "").trim();

    // Kiểm tra xem tất cả các biến trong đoạn này đều rỗng hay không
    const allVarsEmpty = matches.every((token) => {
      const varName = token.slice(1, -1);
      const val =
        dataPayload[varName] !== undefined
          ? dataPayload[varName]
          : dataPayload[varName.trim()];
      return val === undefined || val === null || String(val).trim() === "";
    });

    // Nếu đoạn chỉ chứa các biến rỗng (không có nội dung tĩnh khác) -> xóa luôn thẻ <w:p>
    if (staticText === "" && allVarsEmpty && p.parentNode) {
      // Tránh xóa đoạn duy nhất bên trong một ô bảng <w:tc> (Word yêu cầu mỗi <w:tc> có ít nhất 1 <w:p>)
      const isDirectChildOfTc = p.parentNode.nodeName === "w:tc";
      if (isDirectChildOfTc) {
        const siblingPs = Array.from(p.parentNode.childNodes).filter(
          (n) => n.nodeName === "w:p",
        );
        if (siblingPs.length > 1) {
          p.parentNode.removeChild(p);
        }
      } else {
        p.parentNode.removeChild(p);
      }
    }
  });

  const serializer = new XMLSerializer();
  const updatedXml = serializer.serializeToString(xmlDoc);
  zip.file("word/document.xml", updatedXml);
}

async function fetchDocxTemplate(templateFileName) {
  const response = await fetch(`./${templateFileName}`);
  if (!response.ok) {
    throw new Error(`Không tìm thấy file mẫu "${templateFileName}".`);
  }
  return await response.arrayBuffer();
}

function replaceDocxVariables(contentBuffer, dataPayload) {
  const zip = new PizZip(contentBuffer);

  // Bước 1: Xóa trước các dòng/đoạn chỉ chứa biến rỗng để không để lại khoảng trống thưa
  removeEmptyVariableParagraphs(zip, dataPayload);

  // Bước 2: Thay thế toàn bộ giá trị vào các biến còn lại
  const doc = new window.docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
  });

  doc.render(dataPayload);

  return doc.getZip().generate({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

function initDownloadAllButton() {
  const btn = document.getElementById("btnDownloadAll");
  const summaryEl = document.getElementById("validationSummary");

  btn.addEventListener("click", async () => {
    const status = validateAllSteps(true);

    if (!status.allValid) {
      summaryEl.className = "validation-summary error";
      if (!status.mb02Ok) {
        summaryEl.textContent =
          "❌ Bước 1 (Mẫu 02 - Biểu điểm) chưa điền đủ họ tên hoặc các ô điểm bắt buộc (*).";
        switchStep("doc-mb02");
      } else if (!status.mb01Ok) {
        summaryEl.textContent =
          "❌ Bước 2 (Mẫu 01 - Bản kiểm điểm) còn thiếu thông tin bắt buộc, ý chưa đủ trên 150 ký tự hoặc chưa chọn xếp loại B.II.";
        switchStep("doc-mb01");
      } else {
        summaryEl.textContent =
          "❌ Bước 3 (Mẫu 03 - Phiếu bổ sung) còn thiếu thông tin cá nhân bắt buộc (*).";
        switchStep("doc-mb03");
      }
      return;
    }

    // Hiển thị tuần tự 6 popup xác nhận trước khi tải
    const confirmedAll = await runSequentialConfirmations();
    if (!confirmedAll) {
      summaryEl.className = "validation-summary error";
      summaryEl.textContent = "⚠️ Bạn đã hủy quá trình xác nhận tải hồ sơ.";
      return;
    }

    try {
      btn.disabled = true;
      summaryEl.className = "validation-summary";
      summaryEl.textContent =
        "⏳ Đã xác nhận đủ 6 lưu ý! Đang tạo và tải xuống trọn bộ 3 file DOCX...";

      const payload = buildReplacementPayload();
      const safeName = removeVietnameseTones(
        payload.ho_ten || "Dang_Vien",
      ).replace(/\s+/g, "_");

      const filesToExport = [
        {
          template: "KD_MB_02.docx",
          output: `KD_MB_02_BieuDiem_${safeName}_2026.docx`,
        },
        {
          template: "KD_MB_01.docx",
          output: `KD_MB_01_BanKiemDiem_${safeName}_2026.docx`,
        },
        {
          template: "KD_MB_03.docx",
          output: `KD_MB_03_PhieuBoSung_${safeName}_2026.docx`,
        },
      ];

      for (const item of filesToExport) {
        const buffer = await fetchDocxTemplate(item.template);
        const blob = replaceDocxVariables(buffer, payload);
        saveAs(blob, item.output);
        await new Promise((resolve) => setTimeout(resolve, 350));
      }

      summaryEl.className = "validation-summary success";
      summaryEl.textContent =
        "✅ Đã hoàn tất xác nhận và xuất trọn bộ 3 file DOCX (đã tự động xóa các dòng trống)!";
    } catch (err) {
      console.error(err);
      summaryEl.className = "validation-summary error";
      summaryEl.textContent = `❌ Lỗi khi xuất file: ${err.message} (Cần mở qua Live Server / HTTP Server).`;
    } finally {
      btn.disabled = false;
    }
  });
}

function removeVietnameseTones(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9\s]/g, "");
}
