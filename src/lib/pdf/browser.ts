import type { Browser, LaunchOptions } from "puppeteer-core";

/**
 * Singleton Puppeteer browser, cached on globalThis so Next.js hot-reload
 * doesn't spawn a new Chromium on every edit.
 *
 * Executable resolution (in order):
 *   1. process.env.CHROME_PATH — explicit override (useful for Windows dev)
 *   2. @sparticuz/chromium bundled binary (Linux — production / serverless)
 *   3. Common local Chrome paths (Windows / macOS / Linux dev fallback)
 */

type BrowserHolder = {
  browser: Browser | null;
  launching: Promise<Browser> | null;
};

const globalForPdf = globalThis as unknown as { __pdfBrowser?: BrowserHolder };

if (!globalForPdf.__pdfBrowser) {
  globalForPdf.__pdfBrowser = { browser: null, launching: null };
}
const holder = globalForPdf.__pdfBrowser!;

async function resolveExecutablePath(): Promise<string> {
  const override = process.env.CHROME_PATH;
  if (override) {
    if (await isExecutableFile(override)) return override;
    throw new Error(
      `CHROME_PATH is set to "${override}" but that path is not an executable file.`
    );
  }

  // @sparticuz/chromium is Linux-only (it unpacks a Linux binary). On
  // Windows/macOS it returns a path inside the OS temp dir that cannot
  // actually be spawned — so skip it entirely unless we're on Linux.
  if (process.platform === "linux") {
    try {
      const mod = await import("@sparticuz/chromium");
      const chromium = mod.default ?? mod;
      const p = await chromium.executablePath();
      if (p && (await isExecutableFile(p))) return p;
    } catch {
      // ignore — fall through to local fallback
    }
  }

  // Dev / local fallbacks
  const candidates: string[] = [];
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA;
    candidates.push(
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
    );
    if (localAppData) {
      candidates.push(
        `${localAppData}\\Google\\Chrome\\Application\\chrome.exe`,
        `${localAppData}\\Microsoft\\Edge\\Application\\msedge.exe`
      );
    }
  } else if (process.platform === "darwin") {
    candidates.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
    );
  } else {
    candidates.push(
      "/usr/bin/google-chrome",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser"
    );
  }
  for (const c of candidates) {
    if (await isExecutableFile(c)) return c;
  }
  throw new Error(
    "Could not locate a Chromium/Chrome binary. Set CHROME_PATH in .env.local to the full path of chrome.exe (or install Chrome)."
  );
}

async function isExecutableFile(p: string): Promise<boolean> {
  try {
    const fs = await import("fs/promises");
    const stat = await fs.stat(p);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function launch(): Promise<Browser> {
  const puppeteer = (await import("puppeteer-core")).default;
  const executablePath = await resolveExecutablePath();

  // Default flags — safe on Windows/macOS/Linux dev.
  let args: string[] = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--font-render-hinting=none",
  ];
  const headless: LaunchOptions["headless"] = true;
  // Only pull @sparticuz/chromium's hardened args on Linux; its flags
  // include Linux-only switches (e.g. /dev/shm tweaks) that break Windows.
  if (process.platform === "linux") {
    try {
      const mod = await import("@sparticuz/chromium");
      const chromium = (mod.default ?? mod) as unknown as {
        args?: string[];
      };
      if (Array.isArray(chromium.args)) args = chromium.args;
    } catch {
      // fine, use defaults
    }
  }

  const browser = await puppeteer.launch({
    executablePath,
    args,
    headless,
    defaultViewport: { width: 1240, height: 1754 }, // A4 @ ~150dpi
  });

  browser.on("disconnected", () => {
    if (holder.browser === browser) {
      holder.browser = null;
    }
  });

  return browser;
}

export async function getBrowser(): Promise<Browser> {
  if (holder.browser && holder.browser.connected) return holder.browser;
  if (holder.launching) return holder.launching;
  holder.launching = launch()
    .then((b) => {
      holder.browser = b;
      holder.launching = null;
      return b;
    })
    .catch((err) => {
      holder.launching = null;
      throw err;
    });
  return holder.launching;
}

export async function shutdownBrowser(): Promise<void> {
  if (holder.browser) {
    try {
      await holder.browser.close();
    } catch {
      // ignore
    }
    holder.browser = null;
  }
}
