import { Camera } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useObjectUrl } from "../hooks/useObjectUrl";

export function PhotoPicker({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const savedPreview = useObjectUrl(file);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mode = label === "selfie" ? "user" : "environment";

  const visiblePreview = preview || savedPreview;

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    return () => stopStream(stream);
  }, [stream]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function openCamera() {
    setError("");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("Use localhost here, or HTTPS on your phone.");
      return;
    }

    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 1600 },
        },
        audio: false,
      });
      setStream(nextStream);
    } catch {
      try {
        const fallback = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        setStream(fallback);
      } catch (cameraError) {
        setError(
          cameraError instanceof DOMException &&
            cameraError.name === "NotAllowedError"
            ? "Camera permission blocked."
            : "No camera found.",
        );
      }
    }
  }

  async function snap() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1440;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    if (!blob) return;
    const next = new File([blob], `${label}-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    onChange(next);
    const nextPreview = URL.createObjectURL(next);
    setPreview(nextPreview);
    stopStream(stream);
    setStream(null);
  }

  function retake() {
    onChange(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    void openCamera();
  }

  return (
    <div className={mode === "user" ? "photo-picker selfie" : "photo-picker"}>
      {stream ? (
        <video ref={videoRef} autoPlay muted playsInline />
      ) : visiblePreview ? (
        <img alt="" src={visiblePreview} />
      ) : (
        <Camera size={28} />
      )}
      <span>{label}</span>
      {error ? <small>{error}</small> : null}
      <div className="camera-controls">
        {stream ? (
          <button onClick={snap} type="button">
            Capture
          </button>
        ) : visiblePreview ? (
          <button onClick={retake} type="button">
            Retake
          </button>
        ) : (
          <button onClick={openCamera} type="button">
            Open
          </button>
        )}
      </div>
    </div>
  );
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}
