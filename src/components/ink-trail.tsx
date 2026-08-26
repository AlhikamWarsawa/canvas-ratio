"use client";

import { useEffect, useRef } from "react";

type InkPoint = { x: number; y: number; time: number; width: number; alpha: number };

const TRAIL_LIFETIME = 2400;

export function InkTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const drawingCanvas = canvas;
    const drawingContext = context;
    let frame = 0;
    let width = 0;
    let height = 0;
    const points: InkPoint[] = [];

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      drawingCanvas.width = Math.round(width * ratio);
      drawingCanvas.height = Math.round(height * ratio);
      drawingCanvas.style.width = `${width}px`;
      drawingCanvas.style.height = `${height}px`;
      drawingContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function addPoint(event: PointerEvent) {
      if (event.pointerType === "touch") return;
      const previous = points[points.length - 1];
      const distance = previous ? Math.hypot(event.clientX - previous.x, event.clientY - previous.y) : 0;
      if (previous && distance < 2) return;
      points.push({ x: event.clientX, y: event.clientY, time: performance.now(), width: 1.5 + Math.random() * 0.7, alpha: 0.55 + Math.random() * 0.25 });
      if (points.length > 90) points.splice(0, points.length - 90);
    }

    function draw(now: number) {
      drawingContext.clearRect(0, 0, width, height);
      while (points.length && now - points[0].time > TRAIL_LIFETIME) points.shift();
      if (points.length > 1) {
        drawingContext.lineCap = "round";
        drawingContext.lineJoin = "round";
        for (let index = 1; index < points.length; index += 1) {
          const start = points[index - 1];
          const end = points[index];
          const midpointX = (start.x + end.x) / 2;
          const midpointY = (start.y + end.y) / 2;
          const age = Math.min(1, (now - start.time) / TRAIL_LIFETIME);
          drawingContext.globalAlpha = start.alpha * (1 - age) * 0.9;
          drawingContext.strokeStyle = "#24221f";
          drawingContext.lineWidth = start.width;
          drawingContext.beginPath();
          drawingContext.moveTo(start.x, start.y);
          drawingContext.quadraticCurveTo(start.x, start.y, midpointX, midpointY);
          drawingContext.quadraticCurveTo(end.x, end.y, end.x, end.y);
          drawingContext.stroke();
        }
      }
      drawingContext.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", addPoint, { passive: true });
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", addPoint);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 h-full w-full" />;
}
