import re

with open('server.ts', 'r') as f:
    content = f.read()

old_error_handling = """  if (!response.ok) {
    let errBody = await response.text().catch(() => "Unknown error");
    try {
      const errJson = JSON.parse(errBody);
      throw new Error(`Brevo API Error (${response.status}): ${JSON.stringify(errJson)}`);
    } catch {
      throw new Error(`Brevo API Error (${response.status}): ${errBody}`);
    }
  }"""

new_error_handling = """  if (!response.ok) {
    let errBody = await response.text().catch(() => "Unknown error");
    try {
      const errJson = JSON.parse(errBody);
      if (response.status === 401 && errJson.message && errJson.message.includes("unrecognised IP address")) {
        throw new Error("BREVO_IP_RESTRICTION: Brevo is blocking the dynamic IP of this serverless environment. Please go to https://app.brevo.com/security/authorised_ips and DISABLE the IP authorization feature entirely to allow serverless dynamic IPs.");
      }
      throw new Error(`Brevo API Error (${response.status}): ${JSON.stringify(errJson)}`);
    } catch (e: any) {
      if (e.message.includes("BREVO_IP_RESTRICTION")) throw e;
      throw new Error(`Brevo API Error (${response.status}): ${errBody}`);
    }
  }"""

content = content.replace(old_error_handling, new_error_handling)

with open('server.ts', 'w') as f:
    f.write(content)

print("Patched error handling")
