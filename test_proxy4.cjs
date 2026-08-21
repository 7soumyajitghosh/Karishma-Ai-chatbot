const https = require('https');

const data = JSON.stringify({
  sender: { email: 'karishma.ai@outlook.com' },
  to: [{ email: 'test@example.com' }],
  subject: 'Test',
  htmlContent: 'Test'
});

const options = {
  hostname: 'corsproxy.io',
  port: 443,
  path: '/?https://api.brevo.com/v3/smtp/email',
  method: 'POST',
  headers: {
    'accept': 'application/json',
    'api-key': process.env.BREVO_API_KEY || 'invalid',
    'content-type': 'application/json',
    'content-length': data.length
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log(body));
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
