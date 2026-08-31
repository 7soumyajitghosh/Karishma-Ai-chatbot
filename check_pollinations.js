const fetch = require('node-fetch'); // or use native fetch if Node 18+
async function test() {
  const res = await fetch('https://text.pollinations.ai/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Hello' }],
      model: 'openai'
    })
  });
  console.log('Status:', res.status);
  console.log('Text:', await res.text());
}
test().catch(console.error);
