import {useZxing} from "react-zxing";
import {useRef} from "react";
import { Camera } from "lucide-react";

export function BarcodeScannerPreview({ isActive, onScan, onCameraError }) {
  const lastScanRef = useRef({
    code: "",
    time: 0,
  });

  const { ref } = useZxing({
    paused: !isActive,
    constraints: {
      video: {
        facingMode: "user",
      },
    },
    onDecodeResult(result) {
      const code = result.getText();

      if (!/^\d{13}$/.test(code)) return;

      const now = Date.now();
      const isSameCodeTooSoon =
        lastScanRef.current.code === code && now - lastScanRef.current.time < 1500;

      if (isSameCodeTooSoon) return;

      lastScanRef.current = {
        code,
        time: now,
      };

      onScan(code);
    },
    onError(error) {
      console.error("Erreur caméra scanner :", error);
      onCameraError?.();
    },
  });

  if (!isActive) {
    return (
      <div className="flex h-full w-full items-center justify-center text-center">
        <div>
          <Camera className="mx-auto mb-1 h-5 w-5 text-slate-400" />
          <p className="text-xs text-slate-500">Caméra inactive</p>
        </div>
      </div>
    );
  }

  return (
    <video
      ref={ref}
      className="h-full w-full rounded-xl bg-black object-cover"
      muted
      playsInline
    />
  );
}
