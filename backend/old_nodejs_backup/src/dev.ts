import nodemon from 'nodemon';

nodemon({
  script: 'src/server.ts',
  ext: 'ts,js,json',
  watch: ['src'],
  ignore: ['src/**/*.test.ts', 'node_modules'],
  exec: 'ts-node',
  env: {
    NODE_ENV: 'development',
  },
});

nodemon.on('start', () => {
  console.log('🚀 Trustek Backend Server starting...');
});

nodemon.on('restart', (files) => {
  console.log('🔄 Server restarted due to changes in:', files);
});

nodemon.on('quit', () => {
  console.log('👋 Server stopped');
  process.exit();
});

nodemon.on('crash', () => {
  console.error('❌ Server crashed');
});
