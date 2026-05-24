import { createBot } from "./bot";
import { token } from "./config/env";
import { connectDb } from "./db/client";

async function main() {
  await connectDb();

  const client = createBot();
  await client.login(token);
}

main().catch((e) => {
  console.error("Błąd startowy:", e);
  process.exit(1);
});
