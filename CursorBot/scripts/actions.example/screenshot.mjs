/**
 * Пример действия «Скриншот рабочего стола».
 * Скопируйте scripts/actions.example → scripts/actions и добавьте запись в data/actions.json.
 */
import { captureDesktopPng } from "./lib/desktop-capture.mjs";

const root = process.env.CURSOR_BOT_ROOT || process.cwd();
const outPath = captureDesktopPng(root);

console.log(
  JSON.stringify({
    photo: outPath,
    caption: "Скриншот рабочего стола",
  }),
);
