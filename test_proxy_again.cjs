const proxies = [
  'https://api.allorigins.win/raw?url=https://api.brevo.com/v3/smtp/email',
  'https://corsproxy.io/?https://api.brevo.com/v3/smtp/email',
  'https://proxy.cors.sh/https://api.brevo.com/v3/smtp/email',
  'https://thingproxy.freeboard.io/fetch/https://api.brevo.com/v3/smtp/email'
];

const data = JSON.stringify({
  sender: { email: process.env.BREVO_SENDER_EMAIL || 'karishma.ai@outlook.com' },
  to: [{ email: 'test@example.com' }],
  subject: 'Test',
  htmlContent: 'Test'
});

async function run() {
  for (const proxy of proxies) {
    console.log(`Testing ${proxy}...`);
    try {
      const response = await fetch(proxy, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': process.env.BREVO_API_KEY || '',
          'content-type': 'application/json'
        },
        body: data
      });
      const text = await response.text();
      console.log(`Status: ${response.status}`, text.slice(0, 100));
    } catch (err) {
      console.log(`Error: ${err.message}`);
    }
  }
}
run();
