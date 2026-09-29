import { mkdirSync, renameSync, rmSync } from "node:fs";

mkdirSync("mobile/www", { recursive: true });
renameSync("mobile/www/mobile/index.html", "mobile/www/index.html");
rmSync("mobile/www/mobile", { recursive: true, force: true });
