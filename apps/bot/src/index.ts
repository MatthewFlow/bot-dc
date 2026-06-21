import { connectDb } from "@jurassic-haven/db";

import { createBot } from "./bot";
import { token } from "./config/env";
import { initObservability } from "./observability";

async function main() {
  initObservability("bot");
  await connectDb();

  const client = createBot();
  await client.login(token);
}

main().catch((e) => {
  console.error("Błąd startowy:", e);
  process.exit(1);
});
