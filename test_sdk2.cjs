const { Brevo } = require('@getbrevo/brevo');
const brevo = new Brevo({ apiKey: process.env.BREVO_API_KEY });
async function test() {
  try {
    const res = await brevo.transactionalEmails.sendTransacEmail({
      sender: { email: process.env.BREVO_SENDER_EMAIL, name: 'Karishma AI' },
      to: [{ email: 'test@example.com' }],
      subject: 'Test',
      htmlContent: 'Test'
    });
    console.log("Success:", res);
  } catch (err) {
    console.log("Error:", err);
  }
}
test();
