import * as dotenv from "dotenv";
import { createApp } from "./app";
import { APP_CONFIG } from "./config/constants";

const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";

dotenv.config({ path: envFile });

const app = createApp();
const port = APP_CONFIG.PORT;
app.listen(port, () => {
  console.log(`🚀 Server started at http://localhost:${port}`);
});
