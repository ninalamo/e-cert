import puppeteer, { type Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium";

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    const isVercel = process.env.VERCEL === "1";

    let executablePath: string;
    let args: string[];

    if (isVercel) {
      executablePath = await chromium.executablePath();
      args = chromium.args;
    } else {
      executablePath = process.env.CHROMIUM_PATH ?? "";
      if (!executablePath) {
        throw new Error(
          "CHROMIUM_PATH is not set. Add it to .env.local, e.g.:\n" +
            'CHROMIUM_PATH="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"'
        );
      }
      args = [];
    }

    browserInstance = await puppeteer.launch({
      headless: isVercel ? "shell" : true,
      executablePath,
      args,
    });
  }
  return browserInstance;
}

export interface PdfOptions {
  format?: "A4" | "Letter";
  landscape?: boolean;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
}

export async function renderHtmlToPdf(
  html: string,
  options: PdfOptions = {}
): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    const {
      format = "A4",
      landscape = false,
      margin = { top: "0", right: "0", bottom: "0", left: "0" },
    } = options;

    await page.setContent(html, { waitUntil: "load" });

    const pdfBuffer = await page.pdf({
      format,
      landscape,
      margin,
      printBackground: true,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
