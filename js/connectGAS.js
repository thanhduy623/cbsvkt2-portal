/**
 * Gửi dữ liệu đến Google Apps Script (GAS) Web App.
 *
 * @param {string} action - Hành động bạn muốn GAS thực hiện (ví dụ: 'saveData', 'getData').
 * @param {object} data - Dữ liệu chính bạn muốn gửi đến GAS.
 * @returns {Promise<object>} - Một Promise giải quyết bằng phản hồi JSON từ GAS.
 * @throws {Error} - Ném lỗi nếu yêu cầu không thành công hoặc phản hồi không hợp lệ.
 */
export async function connectGAS(action, data) {
    // URL của Google Apps Script Web App đã triển khai
    // Được đặt cứng ở đây để tập trung cấu hình
    console.clear()
    const gasUrl = "https://script.google.com/macros/s/AKfycbz_CehchsDWVrlfU9K41V-gFMEl9n2m3h4UMTDzSGW1OkEReYRURA5BRrSLhLFtOCTH/exec";

    const dataToSend = {
        action: action,
        data: data, // Dữ liệu chính của bạn
        timestamp: new Date().toISOString() // Thêm timestamp tự động
    };

    try {
        const response = await fetch(gasUrl, {
            method: 'POST',
            // Sử dụng 'text/plain' để tránh lỗi CORS do yêu cầu preflight OPTIONS
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            // Chuyển đổi toàn bộ đối tượng dataToSend thành chuỗi JSON
            body: JSON.stringify(dataToSend),
            redirect: 'follow', // Theo dõi các chuyển hướng nếu có
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(response.message);
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log(result)

        return result;
    } catch (error) {
        console.error('Lỗi khi kết nối GAS:', error);
        throw new Error(`Không thể kết nối GAS: ${error.message}`);
    }
}
