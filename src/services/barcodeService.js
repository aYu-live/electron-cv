import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

let reader = null;
let currentControls = null;
let isEnabled = true; // 标志位：控制是否处理识别结果

export async function startContinuousDecodeFromVideo(
  videoElement,
  onResult,
  onError
) {
  // 如果已有 reader 在运行，先停止
  if (currentControls) {
    try {
      currentControls.stop();
    } catch (e) {
      // ignore
    }
  }

  // 配置解码提示，提高识别速度
  const hints = new Map();

  // 指定需要识别的条码格式（可以根据需要调整）
  // 💡 性能优化提示：
  // - 如果只需要二维码，只保留 QR_CODE 可以大幅提升速度
  // - 如果只需要一维码，删除 QR_CODE
  // - 格式越少，识别速度越快
  const formats = [
    BarcodeFormat.QR_CODE, // 二维码
    BarcodeFormat.CODE_128, // Code 128（常见一维码）
    BarcodeFormat.CODE_39, // Code 39
    BarcodeFormat.EAN_13, // EAN-13（商品条码）
    BarcodeFormat.EAN_8, // EAN-8
    BarcodeFormat.UPC_A, // UPC-A
    BarcodeFormat.UPC_E, // UPC-E
  ];
  hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);

  // TRY_HARDER: 提高识别准确率，但会稍微降低速度
  // 如果识别准确率已经足够，可以注释掉这行以提升速度
  hints.set(DecodeHintType.TRY_HARDER, true);

  // 创建新的 reader 实例，使用配置
  reader = new BrowserMultiFormatReader(hints);
  isEnabled = true; // 启动时设置为启用状态

  currentControls = await reader.decodeFromVideoDevice(
    null,
    videoElement,
    (result, err) => {
      if (result && isEnabled) {
        // 只在启用状态下处理结果
        onResult(result);
      } else if (err) {
        // 忽略 NotFoundException 类型的错误（这是正常的扫描未找到条码）
        const errName = err.name || "";
        const errMessage = err.message || "";
        const isNotFound =
          errName.includes("NotFoundException") ||
          errMessage.includes("No MultiFormat Readers");

        if (!isNotFound && onError && isEnabled) {
          onError(err);
        }
      }
    }
  );

  return currentControls;
}

// 暂停识别：不关闭摄像头，只是不处理识别结果
export function pauseDecoding() {
  isEnabled = false;
  console.log("识别已暂停（摄像头保持开启）");
}

// 恢复识别：重新开始处理识别结果
export function resumeDecoding() {
  isEnabled = true;
  console.log("识别已恢复");
}

// 完全停止识别并关闭摄像头（仅在清理时使用）
export function stopDecoding() {
  // 只停止解码循环，不关闭视频设备（摄像头保持开启）
  if (currentControls) {
    try {
      // 注意：currentControls.stop() 会关闭视频流
      // 这里我们只是标记停止，但不关闭摄像头
      // ZXing 的 stop() 会停止解码并关闭摄像头，所以我们需要换个策略
      currentControls.stop();
      currentControls = null;
    } catch (e) {
      console.warn("停止解码失败", e);
    }
  }

  // 不要清空 reader，以便可以继续使用
  // reader 实例可以复用
}
