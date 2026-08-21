fetch("https://proxy.cors.sh/https://api.brevo.com/v3/smtp/email", {
  method: "POST",
  headers: {
    "api-key": process.env.BREVO_API_KEY || "invalid",
    "content-type": "application/json",
    "accept": "application/json"
  },
  body: JSON.stringify({
    sender: {email: process.env.BREVO_SENDER_EMAIL || 'test@test.com'},
    to: [{email: 'test@test.com'}],
    subject: 'test',
    htmlContent: 'test'
  })
}).then(r => r.text()).then(console.log).catch(console.error)
