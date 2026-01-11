import { BrowserMultiFormatReader } from "@zxing/browser";

const reader = new BrowserMultiFormatReader();

export async function startContinuousDecodeFromVideo(
  videoElement,
  onResult,
  onError
) {
  await reader.decodeFromVideoDevice(null, videoElement, (result, err) => {
    if (result) {
      onResult(result);
    } else if (err && err.name !== "NotFoundException") {
      if (onError) {
        onError(err);
      }
    }
  });
}

export function stopDecoding() {
  reader.reset();
}
