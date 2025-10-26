"use strict";
(() => {
  // src/lib/crop-image.ts
  function cropImage(image, xmin, ymin, xmax, ymax, mimeType = "image/webp") {
    return new Promise(async (resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject("Failed to get 2d context");
        return;
      }
      const ratio = window.devicePixelRatio;
      const img = new Image();
      img.onload = async () => {
        canvas.width = xmax - xmin;
        canvas.height = ymax - ymin;
        ctx.drawImage(
          img,
          xmin * ratio,
          ymin * ratio,
          (xmax - xmin) * ratio,
          (ymax - ymin) * ratio,
          0,
          0,
          xmax - xmin,
          ymax - ymin
        );

        // Apply manga processing if enabled
        try {
          const mangaOptions = await getMangaOptions();
          if (mangaOptions.enabled) {
            applyMangaPreprocessing(canvas, mangaOptions);
          }
        } catch (error) {
          console.warn('Failed to apply manga processing:', error);
          // Continue without manga processing
        }

        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              reject("Failed to create blob");
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              resolve(reader.result);
              canvas.remove();
            };
            reader.readAsDataURL(blob);
          },
          mimeType,
          0.5
        );
      };
      img.src = image;
    });
  }

  // Manga processing functions for use in background script
  function applyMangaPreprocessing(canvas, options) {
    if (!options.enabled || options.imagePreprocessing === 'standard') {
      return canvas;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let processedData = imageData;

    // Apply contrast enhancement for manga
    if (options.textContrastEnhancement) {
      processedData = enhanceTextContrast(processedData, options.imagePreprocessing === 'manga');
    }

    // Apply font optimization preprocessing
    if (options.fontOptimization) {
      processedData = optimizeForMangaFonts(processedData);
    }

    ctx.putImageData(processedData, 0, 0);
    return canvas;
  }

  function enhanceTextContrast(imageData, isMangaMode) {
    const data = imageData.data;
    const contrast = isMangaMode ? 1.5 : 1.2;
    const brightness = isMangaMode ? 10 : 5;

    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      
      let adjusted = ((gray - 128) * contrast + 128) + brightness;
      adjusted = Math.max(0, Math.min(255, adjusted));
      
      if (isMangaMode) {
        if (adjusted < 128) {
          adjusted = adjusted * 0.7;
        } else {
          adjusted = Math.min(255, adjusted * 1.2);
        }
      }
      
      data[i] = adjusted;
      data[i + 1] = adjusted;
      data[i + 2] = adjusted;
    }

    return imageData;
  }

  function optimizeForMangaFonts(imageData) {
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const intensity = (data[i] + data[i + 1] + data[i + 2]) / 3;
      
      if (intensity < 100) {
        const factor = 0.8;
        data[i] = Math.max(0, data[i] * factor);
        data[i + 1] = Math.max(0, data[i + 1] * factor);
        data[i + 2] = Math.max(0, data[i + 2] * factor);
      } else if (intensity > 180) {
        const factor = 1.1;
        data[i] = Math.min(255, data[i] * factor);
        data[i + 1] = Math.min(255, data[i + 1] * factor);
        data[i + 2] = Math.min(255, data[i + 2] * factor);
      }
    }
    
    return imageData;
  }

  async function getMangaOptions() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['mangaOptions'], (result) => {
        const defaultOptions = {
          enabled: false,
          readingDirection: 'right-to-left',
          textContrastEnhancement: true,
          speechBubbleDetection: true,
          panelBoundaryDetection: true,
          fontOptimization: true,
          imagePreprocessing: 'auto'
        };
        
        resolve(result.mangaOptions ? { ...defaultOptions, ...result.mangaOptions } : defaultOptions);
      });
    });
  }

  // node_modules/jotai/esm/vanilla.mjs
  var import_meta = {};
  var keyCount = 0;
  function atom(read, write) {
    const key = `atom${++keyCount}`;
    const config = {
      toString() {
        return (import_meta.env ? import_meta.env.MODE : void 0) !== "production" && this.debugLabel ? key + ":" + this.debugLabel : key;
      }
    };
    if (typeof read === "function") {
      config.read = read;
    } else {
      config.init = read;
      config.read = defaultRead;
      config.write = defaultWrite;
    }
    if (write) {
      config.write = write;
    }
    return config;
  }
  function defaultRead(get) {
    return get(this);
  }
  function defaultWrite(get, set, arg) {
    return set(
      this,
      typeof arg === "function" ? arg(get(this)) : arg
    );
  }

  // src/lib/states/overlay.ts
  var overlayStateAtom = atom("onSelection");
  var selectedLanguageAtom = atom("English" /* English */);
  var FloatyAtoms = atom([]);

  // src/background.ts
  chrome.runtime.onInstalled.addListener(() => {
    console.log("Chrome OCR Translation extension installed");
  });
  chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.id) {
      console.error("No tab ID available");
      return;
    }
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["./overlay.js"]
      });
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ["./global.css"]
      });
      await chrome.tabs.sendMessage(tab.id, {
        type: "beginSelection"
      });
    } catch (error) {
      console.error("Error initializing extension:", error);
    }
  });
  chrome.runtime.onMessage.addListener(async (message, sender) => {
    if (!sender.tab?.id) {
      console.error("No tab ID in sender");
      return;
    }
    try {
      switch (message.type) {
        case "takeScreenshotRequest":
          await handleScreenshotRequest(
            sender.tab.windowId,
            sender.tab.id,
            message
          );
          break;
        default:
          console.log("Unhandled message type:", message.type);
          break;
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  });
  async function handleScreenshotRequest(windowId, tabId, request) {
    const { xmin, ymin, xmax, ymax } = request.area;
    let dataURL;
    if (request.dataUrl) {
      dataURL = request.dataUrl;
    } else {
      const viewport = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => ({
          width: window.innerWidth,
          height: window.innerHeight
        })
      });
      if (!viewport?.[0]?.result) {
        throw new Error("Failed to get viewport dimensions");
      }
      if (ymax <= viewport[0].result.height && ymin >= 0) {
        dataURL = await takeScreenshot(windowId, tabId, {
          xmin,
          ymin,
          xmax,
          ymax
        });
      } else {
        dataURL = await captureWithScroll(windowId, tabId, {
          xmin,
          ymin,
          xmax,
          ymax
        });
      }
    }
    await chrome.tabs.sendMessage(tabId, {
      type: "takeScreenshotResponse",
      dataUrl: dataURL,
      area: request.area
    });
  }
  async function getViewportHeight(tabId) {
    const viewport = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.innerHeight
    });
    if (!viewport?.[0]?.result) {
      throw new Error("Failed to get viewport height");
    }
    return viewport[0].result;
  }
  async function captureWithScroll(windowId, tabId, area) {
    const originalScrollY = (await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.scrollY
    }))[0].result;
    if (originalScrollY === void 0)
      throw new Error("Failed to get original scroll position");
    const viewportHeight = await getViewportHeight(tabId);
    const scrollSteps = Math.ceil(
      (area.ymax - area.ymin) / (viewportHeight - 200)
    );
    const croppedParts = [];
    for (let i = 0; i < scrollSteps; i++) {
      const originY = originalScrollY + area.ymin;
      const targetY = originY + i * (viewportHeight - 200) - 100;
      const actualY = (await chrome.scripting.executeScript({
        target: { tabId },
        func: (y) => {
          window.scrollTo(0, y);
          return window.scrollY;
        },
        args: [targetY]
      }))[0].result;
      if (actualY === void 0)
        throw new Error(`Failed to scroll to position ${targetY}`);
      if (scrollSteps <= 2) await new Promise((r) => setTimeout(r, 200));
      else await new Promise((r) => setTimeout(r, 500));
      const sectionCrop = {
        xmin: area.xmin,
        ymin: Math.max(100, originY - actualY),
        xmax: area.xmax,
        ymax: Math.min(
          viewportHeight - 100,
          originY + (area.ymax - area.ymin) - actualY
        )
      };
      const cropped = await takeScreenshot(windowId, tabId, sectionCrop);
      const sectionHeight = sectionCrop.ymax - sectionCrop.ymin;
      const destinationY = actualY - originY + 100;
      croppedParts.push({
        dataUrl: cropped,
        height: sectionHeight,
        destinationY
      });
    }
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (y) => window.scrollTo(0, y),
      args: [originalScrollY]
    });
    return mergeCroppedParts(
      tabId,
      croppedParts,
      area.xmax - area.xmin,
      area.ymax - area.ymin
    );
  }
  async function mergeCroppedParts(tabId, parts, width, totalHeight) {
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      args: [parts, width, totalHeight],
      func: async (images, w, h) => {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Failed to get canvas context");
        }
        for (const part of images) {
          await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, 0, part.destinationY, w, part.height);
              resolve();
            };
            img.onerror = reject;
            img.src = part.dataUrl;
          });
        }
        return canvas.toDataURL("image/webp");
      }
    });
    if (!result?.[0]?.result) {
      throw new Error("Failed to merge cropped parts");
    }
    return result[0].result;
  }
  async function takeScreenshot(windowId, tabId, area) {
    const data = await chrome.tabs.captureVisibleTab(windowId, {
      format: "png"
    });
    const cropped = await chrome.scripting.executeScript({
      target: { tabId },
      args: [data, area.xmin, area.ymin, area.xmax, area.ymax, "image/webp"],
      func: cropImage
    });
    if (cropped.length !== 1 && !cropped[0].result) {
      throw new Error("Failed to get crop image");
    }
    if (!cropped[0].result) throw new Error("There is no crop image data");
    return cropped[0].result;
  }
})();
