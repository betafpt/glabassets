const https = require('https');
const url = 'https://tavakxhaptxuttgdalkr.supabase.co/storage/v1/object/public/resolve-assets/Wipp3DCamera.drfx';
https.get(url, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  res.on('data', (c) => console.log('Chunk:', c.length));
  res.on('end', () => console.log('End'));
}).on('error', (e) => console.log('Error:', e));
