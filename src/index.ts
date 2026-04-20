import "dotenv/config";
import { createApp } from "./app";
import { APP_CONFIG } from "./config/constants";

const app = createApp();
const port = APP_CONFIG.PORT;
app.listen(port, () => {
  console.log(`🚀 Server started at http://localhost:${port}`);
});
