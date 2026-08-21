async function testProxy(url) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
        "accept": "application/json"
      },
      body: JSON.stringify({
        sender: {email: process.env.BREVO_SENDER_EMAIL || 'test@test.com'},
        to: [{email: 'test@test.com'}],
        subject: 'test',
        htmlContent: 'test'
      })
    });
    console.log(url, res.status, await res.text());
  } catch (e) {
    console.log(url, 'Error:', e.message);
  }
}
testProxy("https://api.allorigins.win/raw?url=https://api.brevo.com/v3/smtp/email");
testProxy("https://corsproxy.io/?https://api.brevo.com/v3/smtp/email");
testProxy("https://api.codetabs.com/v1/proxy?quest=https://api.brevo.com/v3/smtp/email");
