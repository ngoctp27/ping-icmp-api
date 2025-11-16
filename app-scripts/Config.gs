const CONFIG = {
  PING_SERVER: {
    URL: "https://ping-icmp.example.com/ping",
    USERNAME: "admin",
    PASSWORD: "Secr3t@123"
  },

  VPS_ACCOUNTS: [
    { sheetName: "Hostinger-VPS-dev", ipColumn: "F", statusColumn: "J", startRow: 4 }
  ],

  // TỐI ƯU: 10 IP/batch, delay 1s giữa batch
  BATCH_SIZE: 10,
  DELAY_BETWEEN_BATCH: 1000,
};