/**
 * MAIN: Ghi status ngay sau mỗi batch của từng sheet
 * Không chờ toàn bộ → an toàn nếu có lỗi
 */
function monitorAllVPS() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  CONFIG.VPS_ACCOUNTS.forEach(account => {
    const sheet = ss.getSheetByName(account.sheetName);
    if (!sheet) {
      console.warn(`Sheet không tồn tại: ${account.sheetName}`);
      return;
    }

    const { ipColumn, statusColumn, startRow } = account;
    const lastRow = sheet.getLastRow();
    if (lastRow < startRow) {
      console.info(`Không có dữ liệu: ${account.sheetName}`);
      return;
    }

    try {
      // === LẤY + VALIDATE IP ===
      const ipRange = sheet.getRange(`${ipColumn}${startRow}:${ipColumn}${lastRow}`);
      const ipValues = ipRange.getValues().flat();

      const validItems = ipValues
        .map((ip, idx) => ({
          ip: ip.toString().trim(),
          row: startRow + idx
        }))
        .filter(item => isValidIPv4(item.ip));

      if (validItems.length === 0) {
        console.info(`Không có IP hợp lệ: ${account.sheetName}`);
        return;
      }

      const validIPs = validItems.map(item => item.ip);
      const batches = chunkArray(validIPs, CONFIG.BATCH_SIZE);

      // === GHI STATUS THEO BATCH ===
      let updatedCount = 0;

      batches.forEach((batch, batchIdx) => {
        console.info(`Ping batch ${batchIdx + 1}/${batches.length} - ${account.sheetName}`);

        const results = pingBatchSync(batch);

        // Tạo mảng status để ghi
        const statusUpdates = new Array(ipValues.length).fill([""]);
        results.forEach(r => {
          const item = validItems.find(v => v.ip === r.ip);
          if (item) {
            const idx = item.row - startRow;
            statusUpdates[idx] = [r.isOnline ? "ONLINE" : "OFFLINE"];
            updatedCount++;
          }
        });

        // GHI NGAY SAU MỖI BATCH
        const statusRange = sheet.getRange(`${statusColumn}${startRow}:${statusColumn}${lastRow}`);
        const currentValues = statusRange.getValues();
        const merged = currentValues.map((row, idx) => 
          statusUpdates[idx][0] !== "" ? statusUpdates[idx] : row
        );
        statusRange.setValues(merged);

        // Delay giữa các batch
        if (batchIdx < batches.length - 1) {
          sleep(CONFIG.DELAY_BETWEEN_BATCH);
        }
      });

      // === GHI THỜI GIAN CẬP NHẬT VÀO J1 (sau khi xong sheet này) ===
      const nowICT = getCurrentICTTime();
      sheet.getRange("J1").setValue(`Updated at: ${nowICT} ICT`);

      console.info(`Hoàn tất ${account.sheetName}: ${updatedCount} VPS`);

    } catch (error) {
      console.error(`Lỗi khi xử lý ${account.sheetName}:`, error.toString());
      // Ghi lỗi vào J1 để debug
      sheet.getRange("J1").setValue(`Lỗi: ${error.toString().substring(0, 50)}...`);
      // Không throw → tiếp tục các sheet khác
    }
  });

  console.info("Hoàn tất toàn bộ kiểm tra!");
}