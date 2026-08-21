const https = require('https');

const data = JSON.stringify({});

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
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log(`IPv4 Status: ${res.statusCode}`, body));
});

req.on('error', error => console.error(error));
req.write(data);
req.end();

const options6 = { ...options, family: 6 };
const req6 = https.request(options6, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log(`IPv6 Status: ${res.statusCode}`, body));
});
req6.on('error', error => console.error('IPv6 Error:', error.message));
req6.write(data);
req6.end();

