module.exports = {
  apps: [
    {
      name: "dubdub-suppressor",
      script: "dist/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "/var/log/dubdub-suppressor/error.log",
      out_file: "/var/log/dubdub-suppressor/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
    },
  ],
};
