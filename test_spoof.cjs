const https = require('https');

const data = JSON.stringify({
  sender: { email: 'karishma.ai@outlook.com' },
  to: [{ email: 'test@example.com' }],
  subject: 'Test',
  htmlContent: 'Test'
});

const options = {
  hostname: 'api.brevo.com',
  port: 443,
  path: '/v3/smtp/email',
  method: 'POST',
  headers: {
    'accept': 'application/json',
    'api-key': process.env.BREVO_API_KEY || '',
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(data),
    'X-Forwarded-For': '8.8.8.8',
    'X-Real-IP': '8.8.8.8'
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log(`Status: ${res.statusCode}`, body));
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
