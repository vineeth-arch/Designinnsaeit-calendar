"use client";

import { useRef, useState } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { showToast } from "@calcom/ui/components/toast";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_WIDTH = 800;
const MAX_HEIGHT = 300;
const SAMPLE_TITLE = "Discovery Call · 45 min";

// Downscale but never crop: the avatar ImageUploader crops to a square, which would slice a wide wordmark.
async function fileToPngDataUrl(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read image"));
      el.src = objectUrl;
    });
    const scale = Math.min(1, MAX_WIDTH / img.width, MAX_HEIGHT / img.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

type BrandLogoSettingProps = {
  user: Pick<RouterOutputs["viewer"]["me"]["get"], "name" | "username" | "darkBrandColor" | "brandLogoUrl">;
};

export function BrandLogoSetting({ user }: BrandLogoSettingProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const inputRef = useRef<HTMLInputElement>(null);
  const [logo, setLogo] = useState<string | null>(user.brandLogoUrl ?? null);
  const [isProcessing, setIsProcessing] = useState(false);

  const mutation = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: async (data) => {
      setLogo(data.brandLogoUrl ?? null);
      await utils.viewer.me.invalidate();
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: (error) => {
      showToast(error.message || t("error_updating_settings"), "error");
    },
  });

  const onFileChosen = async (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g)$/.test(file.type) || file.size > MAX_FILE_BYTES) {
      showToast(t("brand_logo_invalid_file"), "error");
      return;
    }
    setIsProcessing(true);
    try {
      mutation.mutate({ brandLogoUrl: await fileToPngDataUrl(file) });
    } catch {
      showToast(t("brand_logo_invalid_file"), "error");
    } finally {
      setIsProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const previewParams = new URLSearchParams({
    type: "meeting",
    title: SAMPLE_TITLE,
    meetingProfileName: user.name ?? user.username ?? "",
  });
  if (logo) previewParams.set("brandLogoUrl", `${WEBAPP_URL}${logo}`);
  if (user.darkBrandColor) previewParams.set("brandColor", user.darkBrandColor);
  const previewSrc = `${WEBAPP_URL}/api/social/og/image?${previewParams.toString()}`;

  return (
    <>
      <div className="border-subtle mt-6 flex items-center rounded-t-lg border p-6 text-sm">
        <div>
          <p className="text-default text-base font-semibold">{t("brand_logo")}</p>
          <p className="text-default">{t("brand_logo_description")}</p>
        </div>
      </div>
      <div className="border-subtle rounded-b-lg border-x border-b px-6 py-6">
        <div className="flex flex-wrap items-center gap-3">
          {logo ? (
            <img
              src={`${WEBAPP_URL}${logo}`}
              alt={t("brand_logo")}
              className="h-12 max-w-[220px] rounded bg-[#2C0098] object-contain object-left p-2"
            />
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            id="brand-logo-upload"
            data-testid="brand-logo-upload"
            onChange={(e) => onFileChosen(e.target.files?.[0])}
          />
          <Button
            color="secondary"
            type="button"
            loading={isProcessing || mutation.isPending}
            onClick={() => inputRef.current?.click()}>
            {t("upload_logo")}
          </Button>
          {logo ? (
            <Button
              color="minimal"
              type="button"
              disabled={isProcessing || mutation.isPending}
              onClick={() => mutation.mutate({ brandLogoUrl: null })}>
              {t("remove_brand_logo")}
            </Button>
          ) : null}
        </div>

        <p className="text-emphasis mt-6 text-sm font-semibold">{t("share_preview")}</p>
        <p className="text-default text-sm">{t("share_preview_description")}</p>
        <img
          src={previewSrc}
          alt={t("share_preview")}
          className="border-subtle mt-3 aspect-[1200/630] w-full max-w-xl rounded-lg border"
        />
      </div>
    </>
  );
}
