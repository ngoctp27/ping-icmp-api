/**
 * UTILS: Validate IP, Ping batch (fetchAll)
 * Chỉ đọc HTTP Status Code → không đọc body
 */

function isValidIPv4(ip) {
  if (!ip || typeof ip !== "string") return false;
  ip = ip.trim();
  if (ip === "") return false;
  const regex = /^(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
  return regex.test(ip);
}

function createPingRequest(ip) {
  const { URL, USERNAME, PASSWORD } = CONFIG.PING_SERVER;
  return {
    url: `${URL}?host=${encodeURIComponent(ip)}`,
    method: "get",
    headers: {
      "Authorization": "Basic " + Utilities.base64Encode(`${USERNAME}:${PASSWORD}`)
    },
    muteHttpExceptions: true
    // Không cần timeout riêng → fetchAll xử lý
  };
}

function pingBatchSync(ipList) {
  if (ipList.length === 0) return [];

  const requests = ipList.map(ip => createPingRequest(ip));
  const responses = UrlFetchApp.fetchAll(requests);

  return responses.map((resp, idx) => {
    const ip = ipList[idx];
    const status = resp.getResponseCode();
    return {
      ip,
      statusCode: status,
      isOnline: status === 200
    };
  });
}

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function sleep(ms) {
  Utilities.sleep(ms);
}

function getCurrentICTTime() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ict = new Date(utc + 7 * 3600000); // UTC+7

  const pad = (n) => (n < 10 ? "0" + n : n);
  return `${pad(ict.getDate())}/${pad(ict.getMonth() + 1)}/${ict.getFullYear()} ${pad(ict.getHours())}:${pad(ict.getMinutes())}:${pad(ict.getSeconds())}`;
}