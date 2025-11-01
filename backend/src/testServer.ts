// testServer.ts
import express from 'express';

const app = express();
const PORT = 5000;

app.get('/', (_, res) => res.send('Hello world!'));

app.listen(PORT, () => {
  console.log(`🌍 Server is live at http://localhost:${PORT}`);
});
