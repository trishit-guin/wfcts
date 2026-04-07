module.exports = {
  apps: [
    {
      name: "wfcts-backend",
      script: "server.js",
      cwd: "./backend",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      node_args: "--env-file=.env"
    }
  ]
};
