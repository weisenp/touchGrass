import { Camera, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { PhotoPicker } from "../components/PhotoPicker";
import { supabase } from "../lib/supabase";
import { formatCountdown } from "../lib/time";
import type { CaptureStep, Cooldown } from "../types/app";
import { useObjectUrl } from "../hooks/useObjectUrl";

export function CaptureScreen({
  cooldown,
  readyToPost,
  onPosted,
  onRejected,
}: {
  cooldown: Cooldown | null;
  readyToPost: boolean;
  onPosted: () => Promise<void>;
  onRejected: (message: string) => Promise<void>;
}) {
  const [selfie, setSelfie] = useState<File | null>(null);
  const [outside, setOutside] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [step, setStep] = useState<CaptureStep>("outside");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const outsidePreview = useObjectUrl(outside);
  const selfiePreview = useObjectUrl(selfie);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    if (!selfie || !outside) {
      setError("Add a selfie and an outward photo.");
      return;
    }
    if (!readyToPost) {
      setError(
        `Next post in ${formatCountdown(cooldown?.next_allowed_post_at)}.`,
      );
      return;
    }

    setBusy(true);
    setError("");
    const ext = (file: File) => file.name.split(".").pop() || "jpg";
    const stamp = crypto.randomUUID();
    const selfiePath = `selfies/${stamp}.${ext(selfie)}`;
    const outsidePath = `outside/${stamp}.${ext(outside)}`;

    const [selfieUpload, outsideUpload] = await Promise.all([
      supabase.storage.from("post-photos").upload(selfiePath, selfie),
      supabase.storage.from("post-photos").upload(outsidePath, outside),
    ]);

    if (selfieUpload.error || outsideUpload.error) {
      setBusy(false);
      setError(
        selfieUpload.error?.message ||
          outsideUpload.error?.message ||
          "Upload failed.",
      );
      return;
    }

    const { data, error: invokeError } = await supabase.functions.invoke(
      "verify-outside-post",
      {
        body: { selfiePath, outsidePath, caption: caption.trim() || null },
      },
    );
    setBusy(false);

    if (invokeError) {
      setError(invokeError.message);
      return;
    }

    if (data?.status === "approved") {
      setSelfie(null);
      setOutside(null);
      setCaption("");
      setStep("outside");
      await onPosted();
    } else {
      await onRejected(data?.reason || "Outside check did not pass.");
    }
  }

  return (
    <form className="capture-screen" onSubmit={submit}>
      <div className="step-rail" aria-label="Post steps">
        <span className={step === "outside" ? "active" : outside ? "done" : ""}>
          1
        </span>
        <span className={step === "selfie" ? "active" : selfie ? "done" : ""}>
          2
        </span>
        <span className={step === "caption" ? "active" : ""}>3</span>
      </div>

      {step === "outside" && (
        <>
          <PhotoPicker label="outside" file={outside} onChange={setOutside} />
          <button
            className="primary-action"
            disabled={!outside}
            onClick={() => setStep("selfie")}
            type="button"
          >
            Next
          </button>
        </>
      )}

      {step === "selfie" && (
        <>
          <PhotoPicker label="selfie" file={selfie} onChange={setSelfie} />
          <div className="split-actions">
            <button
              className="secondary-action"
              onClick={() => setStep("outside")}
              type="button"
            >
              Back
            </button>
            <button
              className="primary-action"
              disabled={!selfie}
              onClick={() => setStep("caption")}
              type="button"
            >
              Next
            </button>
          </div>
        </>
      )}

      {step === "caption" && (
        <>
          <div className="review-strip">
            {outsidePreview ? <img alt="" src={outsidePreview} /> : null}
            {selfiePreview ? <img alt="" src={selfiePreview} /> : null}
          </div>
          <textarea
            maxLength={140}
            placeholder="short description"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
          />
          <span className="caption-count">{caption.length}/140</span>
        </>
      )}

      {!readyToPost ? (
        <p className="form-error">
          Cooldown: {formatCountdown(cooldown?.next_allowed_post_at)}
        </p>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
      {step === "caption" ? (
        <div className="split-actions">
          <button
            className="secondary-action"
            onClick={() => setStep("selfie")}
            type="button"
          >
            Back
          </button>
          <button
            className="primary-action"
            disabled={busy || !readyToPost}
            type="submit"
          >
            {busy ? (
              <Loader2 className="spin" size={18} />
            ) : (
              <Camera size={18} />
            )}
            Verify post
          </button>
        </div>
      ) : null}
    </form>
  );
}
