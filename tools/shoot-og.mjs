/**
 * 共有時に出る絵（1200×630）を焼く道具。
 *   node tools/shoot-og.mjs [URL]
 *
 * 版下の絵を描くのではなく、実際のゲームをヘッドレスChromeで遊ばせて撮る。
 *   1) ゲームを開始して、案内リング（＝満点の円）の中心と半径を測る
 *   2) その円をマウスで一周描いて、決まった瞬間（焚き火＋虹色の円＋舞うこすくま）を撮る
 *   3) その絵を背景に tools/og.html を重ねて public/og.png に書き出す
 *
 * 既定では本番URLを撮るので、手元の変更を映したいときは
 *   npm run dev の後に node tools/shoot-og.mjs http://localhost:3000
 * 文字や配置を直したいときは tools/og.html を触ってから焼き直す。
 */
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = process.argv[2] ?? "https://moth-flame.kosukuma.com/";

/* 撮影用の窓。実際の画面より大きく撮って、焚き火が右寄りに来るよう切り抜く */
const SHOT = { w: 1800, h: 900 };
/* 1200×630 の中で、円の中心をどこに置くか */
const PLACE = { x: 860, y: 330 };
/* 何点以上の円が撮れたら採用するか（虹色の円になる高得点をねらう） */
const WANT = 90;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ["--headless=new", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const tmp = await mkdtemp(path.join(tmpdir(), "mf-og-"));
const scene = path.join(tmp, "scene.png");

try {
  const page = await browser.newPage();
  await page.setViewport({ width: SHOT.w, height: SHOT.h, deviceScaleFactor: 1 });

  await page.evaluateOnNewDocument(() => {
    // 案内リングの中心と半径をそのまま受け取る（満点の円の位置）
    const arc = CanvasRenderingContext2D.prototype.arc;
    CanvasRenderingContext2D.prototype.arc = function (x, y, r, ...rest) {
      if (r > 60) window.__ring = { x, y, r };
      return arc.call(this, x, y, r, ...rest);
    };
    // 画面の隅に出る文字（BEST など）は絵の邪魔なので消す
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    const DROP = ["DRAG TO DRAW A CIRCLE", "BEST:", "MOTH-FLAME.EXE"];
    CanvasRenderingContext2D.prototype.fillText = function (t, ...rest) {
      if (typeof t === "string" && DROP.some((d) => t.startsWith(d))) return;
      return fillText.call(this, t, ...rest);
    };
  });

  let ring = null;
  let score = 0;
  for (let attempt = 1; attempt <= 3 && score < WANT; attempt++) {
    await page.goto(SITE, { waitUntil: "networkidle0", timeout: 60000 });
    await page.evaluate(() => {
      try { localStorage.removeItem("mf_best"); } catch {}
      document.querySelectorAll("button").forEach((b) => {
        if (b.textContent.trim() === "START") b.click();
      });
    });
    await wait(2600); // 焚き火が育つのを待つ
    await page.addStyleTag({ content: `[data-ui="1"]{opacity:0 !important;}` });

    ring = await page.evaluate(() => window.__ring);
    if (!ring) throw new Error("案内リングが見つからない（ゲームが始まっていない？）");

    // 円を一周なぞる
    const N = 260;
    const from = -Math.PI / 2; // 上から描き始めると蛾が円の頂点で止まる
    await page.mouse.move(ring.x, ring.y - ring.r);
    await wait(120);
    await page.mouse.down();
    for (let i = 1; i <= N; i++) {
      const a = from + (i / N) * Math.PI * 2;
      await page.mouse.move(ring.x + Math.cos(a) * ring.r, ring.y + Math.sin(a) * ring.r);
      await wait(8);
    }
    await page.mouse.up();

    await wait(1500); // 祝いのこすくまが舞い上がるまで
    score = Number(await page.evaluate(() => localStorage.getItem("mf_best"))) || 0;
    console.log(`${attempt}回目: ${score}点`);
    if (score >= WANT || attempt === 3) await page.screenshot({ path: scene });
  }

  /* 版下に敷いて書き出す */
  const og = await browser.newPage();
  await og.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  const q = new URLSearchParams({
    scene: pathToFileURL(scene).href,
    left: String(Math.round(PLACE.x - ring.x)),
    top: String(Math.round(PLACE.y - ring.y)),
  });
  await og.goto(`${pathToFileURL(path.join(ROOT, "tools/og.html")).href}?${q}`, {
    waitUntil: "networkidle0",
    timeout: 60000,
  });
  await og.evaluate(() => document.fonts.ready);
  await og.waitForFunction(() => document.querySelector(".scene")?.complete === true);
  await wait(300);
  const out = path.join(ROOT, "public/og.png");
  await (await og.$("#og")).screenshot({ path: out });
  console.log(out);

  // 絵の中身から版番号を作って書き出す。
  // X などは og:image の URL 単位で画像を覚えているので、
  // ファイル名が同じままだと焼き直しても古い絵が出続ける。
  // ここが変われば URL が変わり、新しい絵を取りに来てくれる。
  const version = createHash("sha256").update(await readFile(out)).digest("hex").slice(0, 8);
  const vfile = path.join(ROOT, "src/app/og-version.ts");
  await writeFile(
    vfile,
    `// tools/shoot-og.mjs が og.png を焼くたびに書き換える。手で触らない。\nexport const OG_VERSION = "${version}";\n`,
    "utf8"
  );
  console.log(`${vfile} (${version})`);
} finally {
  await browser.close();
  await rm(tmp, { recursive: true, force: true });
}
