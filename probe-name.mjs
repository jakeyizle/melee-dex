import { _electron as electron } from "playwright";
const app = await electron.launch({
  args: [".", "--no-sandbox"],
  cwd: process.cwd(),
  env: { ...process.env, NODE_ENV: "development" },
});
const info = await app.evaluate(({ app }) => ({
  name: app.getName(),
  userData: app.getPath("userData"),
  version: app.getVersion(),
}));
console.log(JSON.stringify(info, null, 2));
await app.close();
