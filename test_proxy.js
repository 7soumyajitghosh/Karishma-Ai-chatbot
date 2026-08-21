fetch("https://corsproxy.io/?https://api.brevo.com/v3/smtp/email", {
  method: "POST",
  headers: {
    "api-key": "xkeysib-test",
    "content-type": "application/json",
    "accept": "application/json"
  },
  body: JSON.stringify({
    sender: {email: 'test@test.com'},
    to: [{email: 'test@test.com'}],
    subject: 'test',
    htmlContent: 'test'
  })
}).then(r => r.json()).then(console.log).catch(console.error)
