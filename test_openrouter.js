const OpenAI = require("openai");
const ai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1"
});

async function run() {
    try {
        const response = await ai.chat.completions.create({
            model: "google/gemini-3.1-flash-image",
            messages: [{ role: "user", content: "generate an image of a cat" }]
        });
        console.log(JSON.stringify(response, null, 2));
    } catch (e) {
        console.error(e);
    }
}
run();
