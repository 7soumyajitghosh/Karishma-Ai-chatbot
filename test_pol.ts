import { generateChatWithPollinations } from "./server.ts";

async function test() {
  const result = await generateChatWithPollinations("You are a helpful assistant", [{ role: "user", content: "Hello" }]);
  console.log("Result:", result);
}
test().catch(console.error);
