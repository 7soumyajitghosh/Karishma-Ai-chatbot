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
  family: 4, // Force IPv4
  headers: {
    'accept': 'application/json',
    'api-key': 'xkeysib-test',
    'content-type': 'application/json',
    'content-length': data.length
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  res.on('data', d => process.stdout.write(d));
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
