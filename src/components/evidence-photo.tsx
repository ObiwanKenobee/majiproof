"use client";

import { useEffect, useRef, useState } from "react";
import type { SegmentArtifact } from "@/types/inspection";

export function EvidencePhoto({ blob, label, segmentations = [], showOverlay = false }: {
  blob: Blob;
  label: string;
  segmentations?: SegmentArtifact[];
  showOverlay?: boolean;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [src, setSrc] = useState("");
  const [ratio, setRatio] = useState<number | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  useEffect(() => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas || !ratio || !image.naturalWidth || !image.naturalHeight) return;
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!showOverlay) return;

    for (const item of segmentations) {
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = item.maskWidth;
      maskCanvas.height = item.maskHeight;
      const maskContext = maskCanvas.getContext("2d");
      if (!maskContext || item.maskWidth * item.maskHeight > 4_000_000) continue;
      const imageData = maskContext.createImageData(item.maskWidth, item.maskHeight);
      const binary = atob(item.maskRasterBase64);
      const length = Math.min(binary.length, item.maskWidth * item.maskHeight);
      for (let pixel = 0; pixel < length; pixel += 1) {
        if (binary.charCodeAt(pixel)) {
          const offset = pixel * 4;
          imageData.data[offset] = 52;
          imageData.data[offset + 1] = 156;
          imageData.data[offset + 2] = 113;
          imageData.data[offset + 3] = 108;
        }
      }
      maskContext.putImageData(imageData, 0, 0);
      const width = item.bounds.right - item.bounds.left;
      const height = item.bounds.bottom - item.bounds.top;
      context.drawImage(maskCanvas, 0, 0, item.maskWidth, item.maskHeight, item.bounds.left, item.bounds.top, width, height);
      context.strokeStyle = "#d2b05c";
      context.lineWidth = Math.max(1.5, canvas.width / 450);
      context.strokeRect(item.box.left, item.box.top, item.box.right - item.box.left, item.box.bottom - item.box.top);
      context.font = `${Math.max(12, canvas.width / 46)}px sans-serif`;
      const title = item.prompt.slice(0, 44);
      const textWidth = context.measureText(title).width;
      const labelY = Math.max(20, item.box.top - 7);
      context.fillStyle = "rgba(23, 60, 50, .93)";
      context.fillRect(item.box.left, labelY - 16, textWidth + 14, 21);
      context.fillStyle = "#fffdf5";
      context.fillText(title, item.box.left + 7, labelY - 1);
    }
  }, [src, segmentations, showOverlay, ratio]);

  return <div className="evidence-photo-wrap" style={ratio ? { aspectRatio: ratio } : undefined}>
    {src && <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imageRef} className="evidence-photo" src={src} alt={label} onLoad={() => {
        const image = imageRef.current;
        if (image?.naturalWidth && image.naturalHeight) setRatio(image.naturalWidth / image.naturalHeight);
      }} />
      {segmentations.length > 0 && <canvas ref={canvasRef} className="evidence-overlay" aria-hidden="true" />}
    </>}
  </div>;
}
