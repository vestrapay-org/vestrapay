/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

interface Props {
  html: string;
  onSuccess: () => void;
  onFailed: (errorMsg?: string) => void;
}
import { useEffect, useRef, useState } from "react";

function extractThreeDsFromHtml(html: string): { threeDsUrl: string; formData: string } | null {
  if (!html?.trim()) return null;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const form = doc.querySelector("form");
    if (!form) return null;
    const action = form.getAttribute("action");
    const creqInput = form.querySelector<HTMLInputElement>('input[name="creq"]');
    const formData = creqInput?.value ?? creqInput?.getAttribute("value") ?? "";
    if (!action?.trim() || !formData) return null;
    return { threeDsUrl: action.trim(), formData };
  } catch {
    return null;
  }
}

export function ThreeDsChallenge({ html, onSuccess, onFailed }: Props) {
  const [_isProcessing, setIsProcessing] = useState(false);
  const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);

  const cleanupExistingElements = () => {
    const existingForm = document.querySelector('form[name="echoForm"]');
    const existingWrapper = document.getElementById("strayIframeWrapper");

    existingForm?.remove();
    existingWrapper?.remove();
  };

  const cleanupIframeElements = () => {
    const wrapper = document.getElementById("strayIframeWrapper");
    const iframe = document.getElementById("strayIframe");

    if (iframe && wrapper) {
      wrapper.removeChild(iframe);
    }

    wrapper?.remove();
  };

  const removeMessageListener = () => {
    if (messageHandlerRef.current) {
      window.removeEventListener("message", messageHandlerRef.current);
      messageHandlerRef.current = null;
    }
  };

  const handleSuccessfulPayment = (_response: any) => {
    cleanupExistingElements();
    cleanupIframeElements();
    removeMessageListener();
    onSuccess();
  };

  const handleFailedPayment = (response: any) => {
    cleanupExistingElements();
    cleanupIframeElements();
    removeMessageListener();
    onFailed(response?.debugMessage ?? response?.message);
  };

  const setupMessageHandler = () => {
    removeMessageListener();

    messageHandlerRef.current = (event: MessageEvent) => {
      try {
        const raw = event.data;
        if (raw == null || raw?.status == null) return;
        if (raw?.status?.toLowerCase() === "success") {
          handleSuccessfulPayment(raw as { status: "success" });
        } else {
          handleFailedPayment(raw as { debugMessage?: string; message?: string });
        }
      } catch (error) {
        removeMessageListener();
        onFailed(error instanceof Error ? error.message : "Error processing 3DS response");
      }
    };

    window.addEventListener("message", messageHandlerRef.current);
  };

  const initiateMpgsProcess = (val: { threeDsUrl: string; formData: string }) => {
    if (!val?.threeDsUrl || !val?.formData) return;

    setIsProcessing(true);
    cleanupExistingElements();
    overrideMpgsWindowOpen(val);
  };

  const overrideMpgsWindowOpen = (val: { threeDsUrl: string; formData: string }) => {
    const iframeWrapper = document.createElement("div");
    iframeWrapper.setAttribute("id", "strayIframeWrapper");
    iframeWrapper.setAttribute(
      "style",
      "width:100%;height:100%;position:fixed;top:0;left:0;bottom:0;right:0;display:flex;justify-content:center;align-items:center;background:#fff;z-index:999999",
    );
    const iframeElement = document.createElement("iframe");
    iframeElement.setAttribute("id", "strayIframe");
    iframeElement.setAttribute("name", "strayIframe");
    iframeElement.setAttribute("style", "width:100%;height:100%;");

    const iform = document.createElement("form");
    iform.setAttribute("name", "echoForm");
    iform.setAttribute("method", "Post");
    iform.setAttribute("target", "strayIframe");
    iform.setAttribute("action", val.threeDsUrl);

    const iformInput = document.createElement("input");
    iformInput.setAttribute("type", "hidden");
    iformInput.setAttribute("name", "creq");
    iformInput.setAttribute("value", val.formData);

    iform.appendChild(iformInput);
    iframeWrapper.appendChild(iframeElement);
    document.body.appendChild(iform);
    document.body.appendChild(iframeWrapper);

    setupMessageHandler();

    // Submit the form
    iform.submit();
  };

  useEffect(() => {
    if (!html) return;
    const extracted = extractThreeDsFromHtml(html);
    if (extracted) {
      initiateMpgsProcess(extracted);
    } else {
      onFailed("Invalid 3DS challenge HTML: could not extract form URL or creq");
    }
    return removeMessageListener;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html]);

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-white/80 backdrop-blur-sm"></div>
  );
}
