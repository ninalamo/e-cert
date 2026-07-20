import puppeteer, { type Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium";

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    const executablePath = await chromium.executablePath();
    browserInstance = await puppeteer.launch({
      headless: true,
      executablePath,
      args: chromium.args,
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
