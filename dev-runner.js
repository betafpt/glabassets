const { spawn } = require('child_process');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn('cmd.exe', ['/c', 'npm run dev'], {
  env,
  stdio: 'inherit'
});

child.on('close', (code) => {
  process.exit(code);
});
