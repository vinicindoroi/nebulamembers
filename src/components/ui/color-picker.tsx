import { useState, useRef, useCallback, useEffect } from 'react';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ color, onChange }: ColorPickerProps) {
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);
  const [hexInput, setHexInput] = useState(color);
  const satLightRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const isDraggingSL = useRef(false);
  const isDraggingHue = useRef(false);

  // Parse hex to HSL on mount / color change from outside
  useEffect(() => {
    const hsl = hexToHsl(color);
    if (hsl) {
      setHue(hsl.h);
      setSaturation(hsl.s);
      setLightness(hsl.l);
      setHexInput(color);
    }
  }, [color]);

  const updateColor = useCallback((h: number, s: number, l: number) => {
    const hex = hslToHex(h, s, l);
    setHexInput(hex);
    onChange(hex);
  }, [onChange]);

  const handleSLMouseDown = (e: React.MouseEvent) => {
    isDraggingSL.current = true;
    handleSLMove(e);
  };

  const handleSLMove = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!satLightRef.current) return;
    const rect = satLightRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const s = Math.round(x * 100);
    const l = Math.round((1 - y) * 50 + (1 - x) * (1 - y) * 50);
    // Convert to proper HSL: x = saturation, y inverted = value (HSV-like)
    // Use HSV to HSL conversion for more intuitive picker
    const v = 1 - y;
    const sl = v * x;
    const newL = v - sl / 2;
    const newS = newL === 0 || newL === 1 ? 0 : (v - newL) / Math.min(newL, 1 - newL);
    const finalS = Math.round(newS * 100);
    const finalL = Math.round(newL * 100);
    setSaturation(finalS);
    setLightness(finalL);
    updateColor(hue, finalS, finalL);
  }, [hue, updateColor]);

  const handleHueMouseDown = (e: React.MouseEvent) => {
    isDraggingHue.current = true;
    handleHueMove(e);
  };

  const handleHueMove = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const h = Math.round(x * 360);
    setHue(h);
    updateColor(h, saturation, lightness);
  }, [saturation, lightness, updateColor]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSL.current) handleSLMove(e);
      if (isDraggingHue.current) handleHueMove(e);
    };
    const handleMouseUp = () => {
      isDraggingSL.current = false;
      isDraggingHue.current = false;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleSLMove, handleHueMove]);

  // Calculate picker position from current color
  const hsl = hexToHsl(hexInput || color);
  const pickerHue = hsl?.h ?? hue;
  // Convert HSL back to SV for picker position
  const l2 = (hsl?.l ?? lightness) / 100;
  const s2 = (hsl?.s ?? saturation) / 100;
  const v = l2 + s2 * Math.min(l2, 1 - l2);
  const sv = v === 0 ? 0 : 2 * (1 - l2 / v);
  const posX = sv; // saturation position (0-1)
  const posY = 1 - v; // value position inverted (0-1)

  const handleHexChange = (val: string) => {
    setHexInput(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      const hsl = hexToHsl(val);
      if (hsl) {
        setHue(hsl.h);
        setSaturation(hsl.s);
        setLightness(hsl.l);
        onChange(val);
      }
    }
  };

  return (
    <div
      className="rounded-2xl p-3 w-64"
      style={{
        background: 'rgba(20, 20, 28, 0.85)',
        backdropFilter: 'blur(40px) saturate(1.8)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      }}
    >
      {/* Saturation/Lightness area */}
      <div
        ref={satLightRef}
        className="relative w-full h-36 rounded-xl cursor-crosshair overflow-hidden mb-3"
        onMouseDown={handleSLMouseDown}
        style={{
          background: `linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #fff, hsl(${pickerHue}, 100%, 50%))`,
        }}
      >
        {/* Picker indicator */}
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white shadow-[0_0_4px_rgba(0,0,0,0.5)] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            left: `${posX * 100}%`,
            top: `${posY * 100}%`,
            backgroundColor: hexInput || color,
          }}
        />
      </div>

      {/* Hue slider */}
      <div
        ref={hueRef}
        className="relative w-full h-3 rounded-full cursor-pointer mb-3"
        onMouseDown={handleHueMouseDown}
        style={{
          background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
        }}
      >
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white shadow-[0_0_4px_rgba(0,0,0,0.5)] -translate-x-1/2 -translate-y-1/2 top-1/2 pointer-events-none"
          style={{
            left: `${(pickerHue / 360) * 100}%`,
            backgroundColor: `hsl(${pickerHue}, 100%, 50%)`,
          }}
        />
      </div>

      {/* Hex input + preview */}
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg border border-white/10 shrink-0"
          style={{ backgroundColor: hexInput || color }}
        />
        <input
          type="text"
          value={hexInput}
          onChange={(e) => handleHexChange(e.target.value)}
          className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono outline-none focus:border-primary/50 transition-colors"
          placeholder="#8b5cf6"
          maxLength={7}
        />
      </div>
    </div>
  );
}

// Utility functions
function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return null;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
