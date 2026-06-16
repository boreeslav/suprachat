/**
 * Захват основного экрана Windows в PNG (пример для scripts/actions).
 */
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

export function captureDesktopPng(root, fileName = `desktop-${Date.now()}.png`) {
  const outDir = join(root, "tmp", "actions");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, fileName);

  const ps = `
Add-Type -AssemblyName System.Windows.Forms,System.Drawing
$screen = [System.Windows.Forms.Screen]::PrimaryScreen
$w = [int]$screen.Bounds.Width
$h = [int]$screen.Bounds.Height
$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen([System.Drawing.Point]::Empty, [System.Drawing.Point]::Empty, $bmp.Size)
$bmp.Save('${outPath.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Output 'ok'
`;

  const result = spawnSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps],
    { encoding: "utf8", windowsHide: true },
  );

  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "screenshot failed").trim();
    throw new Error(err);
  }

  return outPath;
}
