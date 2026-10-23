import { useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Rect, Text, Group, Transformer, Image as KonvaImage, Ellipse, Line, Path } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import QRCode from 'qrcode';
import {
  Download, Loader2, Plus, Type, AlignLeft, List as ListIcon,
  MousePointerSquareDashed, Trash2, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown, Image as ImageIcon, Upload, Building2, RotateCcw,
  Square, Sparkles, QrCode, LayoutGrid, Undo2, Redo2, Save, FolderOpen, FilePlus, Send,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { creativeService } from '../../services/creativeService';
import { motion } from 'framer-motion';
import { GradientButton } from '../../components/ui/GradientButton';
import { useUploadCreative } from '../../hooks/useCreatives';

const CANVAS = 1080;
const PREVIEW = 480;
const SCALE = PREVIEW / CANVAS;

const FONT_OPTIONS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
  'Nunito', 'Raleway', 'Playfair Display', 'Source Sans 3', 'DM Sans', 'Work Sans',
];

type BlockType = 'heading' | 'text' | 'list' | 'button' | 'image' | 'logo' | 'logo-preset' | 'shape' | 'icon' | 'qr';
type LogoPosition = 'tl' | 'tc' | 'tr' | 'bl' | 'bc' | 'br';
type ShapeVariant = 'rectangle' | 'circle' | 'line';
type ShapeFill =
  | { mode: 'solid'; color: string }
  | { mode: 'gradient'; color1: string; color2: string; angle: number }
  | { mode: 'image'; src: string | null; fit: 'cover' | 'contain' | 'fill'; offsetX: number; offsetY: number; rotation: number; zoom: number };
type IconName = 'check' | 'star' | 'heart' | 'arrow-right' | 'play' | 'zap' | 'circle' | 'bell' | 'sparkle' | 'thumbs-up';
type Align = 'left' | 'center' | 'right';

interface BlockBase {
  id: string;
  type: BlockType;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface HeadingBlock extends BlockBase {
  type: 'heading';
  text: string;
  fontSize: number;
  color: string;
  align: Align;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  fontFamily: string;
  letterSpacing: number;
}

interface TextBlock extends BlockBase {
  type: 'text';
  text: string;
  fontSize: number;
  color: string;
  align: Align;
  lineHeight: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  fontFamily: string;
  letterSpacing: number;
}

interface ListBlock extends BlockBase {
  type: 'list';
  items: string;
  fontSize: number;
  color: string;
  bulletColor: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  fontFamily: string;
  letterSpacing: number;
}

interface ButtonBlock extends BlockBase {
  type: 'button';
  text: string;
  bgColor: string;
  textColor: string;
  fontSize: number;
  radius: number;
}

interface ImageBlock extends BlockBase {
  type: 'image';
  src: string | null;
  fit: 'cover' | 'contain';
  radius: number;
}

interface LogoBlock extends BlockBase {
  type: 'logo';
  src: string | null;
  fit: 'cover' | 'contain';
  radius: number;
}

interface LogoPresetBlock extends BlockBase {
  type: 'logo-preset';
  src: string | null;
  fit: 'cover' | 'contain';
  radius: number;
  position: LogoPosition;
}

interface ShapeBlock extends BlockBase {
  type: 'shape';
  variant: ShapeVariant;
  fill: ShapeFill;
  strokeColor: string;
  strokeWidth: number;
  radius: number;
}

interface IconBlock extends BlockBase {
  type: 'icon';
  icon: IconName;
  color: string;
  strokeWidth: number;
}

interface QRBlock extends BlockBase {
  type: 'qr';
  url: string;
  fgColor: string;
  bgColor: string;
  dataUrl: string | null;
}

type Block =
  | HeadingBlock | TextBlock | ListBlock | ButtonBlock
  | ImageBlock | LogoBlock | LogoPresetBlock | ShapeBlock | IconBlock | QRBlock;

const LOGO_PRESET_MARGIN = 60;

function logoPresetCoords(pos: LogoPosition, w: number, h: number) {
  const m = LOGO_PRESET_MARGIN;
  const cx = (CANVAS - w) / 2;
  const right = CANVAS - m - w;
  const bottom = CANVAS - m - h;
  switch (pos) {
    case 'tl': return { x: m, y: m };
    case 'tc': return { x: cx, y: m };
    case 'tr': return { x: right, y: m };
    case 'bl': return { x: m, y: bottom };
    case 'bc': return { x: cx, y: bottom };
    case 'br': return { x: right, y: bottom };
  }
}

type CanvasBg =
  | { type: 'solid'; color: string }
  | { type: 'gradient'; color1: string; color2: string; angle: number };

const ICON_PATHS: Record<IconName, string> = {
  'check': 'M20 6 9 17l-5-5',
  'star': 'm12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  'heart': 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z',
  'arrow-right': 'M5 12h14M12 5l7 7-7 7',
  'play': 'M6 3 20 12 6 21Z',
  'zap': 'M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z',
  'circle': 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z',
  'bell': 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
  'sparkle': 'M9.94 12.94a1 1 0 0 1-.94.65h-.06a1 1 0 0 1-.93-.7L7 9.5 3.6 8.06a1 1 0 0 1-.7-.92 1 1 0 0 1 .67-1l3.45-1.21 1.16-3.35a1 1 0 0 1 .92-.7h.06a1 1 0 0 1 .94.65l1.21 3.45 3.4 1.16a1 1 0 0 1 .69.94 1 1 0 0 1-.68.94l-3.4 1.21z',
  'thumbs-up': 'M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88z',
};

const uid = () => Math.random().toString(36).slice(2, 9);

const newBlock = (type: BlockType): Block => {
  const base = { id: uid(), x: 80, y: 80, width: 500, height: 100 };
  switch (type) {
    case 'heading':
      return {
        ...base, type, text: 'Your Headline Here', fontSize: 72,
        color: '#FFFFFF', align: 'left', bold: true,
        italic: false, underline: false, fontFamily: 'Inter', letterSpacing: 0, height: 120,
      };
    case 'text':
      return {
        ...base, type, text: 'Body copy goes here. Tell the story behind your post.',
        fontSize: 32, color: '#E5E7EB', align: 'left', lineHeight: 1.4,
        bold: false, italic: false, underline: false, fontFamily: 'Inter', letterSpacing: 0, height: 140,
      };
    case 'list':
      return {
        ...base, type, items: 'First point\nSecond point\nThird point',
        fontSize: 28, color: '#FFFFFF', bulletColor: '#A78BFA',
        bold: false, italic: false, underline: false, fontFamily: 'Inter', letterSpacing: 0, height: 180,
      };
    case 'button':
      return {
        ...base, type, text: 'Learn More', bgColor: '#7C3AED', textColor: '#FFFFFF',
        fontSize: 28, radius: 999, width: 260, height: 72,
      };
    case 'image':
      return {
        ...base, type, src: null, fit: 'cover', radius: 0,
        width: 400, height: 400,
      };
    case 'logo':
      return {
        ...base, type, src: null, fit: 'contain', radius: 0,
        width: 280, height: 80,
      };
    case 'logo-preset': {
      const w = 280, h = 80;
      const { x, y } = logoPresetCoords('tl', w, h);
      return {
        ...base, type, src: null, fit: 'contain', radius: 0,
        position: 'tl', x, y, width: w, height: h,
      };
    }
    case 'shape':
      return {
        ...base, type, variant: 'rectangle',
        fill: { mode: 'solid', color: '#7C3AED' },
        strokeColor: '#FFFFFF', strokeWidth: 0, radius: 12,
        width: 300, height: 180,
      };
    case 'icon':
      return {
        ...base, type, icon: 'star', color: '#FACC15', strokeWidth: 2,
        width: 120, height: 120,
      };
    case 'qr':
      return {
        ...base, type, url: 'https://example.com', fgColor: '#000000', bgColor: '#FFFFFF',
        dataUrl: null, width: 240, height: 240,
      };
  }
};

const ADD_BUTTONS: { type: BlockType; label: string; Icon: typeof Type }[] = [
  { type: 'heading', label: 'Heading', Icon: Type },
  { type: 'text', label: 'Text', Icon: AlignLeft },
  { type: 'list', label: 'List', Icon: ListIcon },
  { type: 'button', label: 'Button', Icon: MousePointerSquareDashed },
  { type: 'image', label: 'Image', Icon: ImageIcon },
  { type: 'logo', label: 'Company Logo', Icon: Building2 },
  { type: 'logo-preset', label: 'Logo (preset)', Icon: LayoutGrid },
  { type: 'shape', label: 'Shape', Icon: Square },
  { type: 'icon', label: 'Icon', Icon: Sparkles },
  { type: 'qr', label: 'QR Code', Icon: QrCode },
];

async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function useImageFromUrl(url: string | null): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!url) { setImg(null); return; }
    const i = new window.Image();
    i.crossOrigin = 'anonymous';
    i.src = url;
    i.onload = () => setImg(i);
    i.onerror = () => setImg(null);
  }, [url]);
  return img;
}

interface ManualImageEditorProps {
  creativeId: number;
  defaultHeadline?: string | null;
  companyLogoUrl?: string | null;
  onSubmitted?: () => void;
}

const SAVE_KEY = (id: number) => `manual-design-v1-${id}`;

function loadSavedDesign(id: number): { blocks: Block[]; bg: CanvasBg; savedAt: string } | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY(id));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function ManualImageEditor({ creativeId, defaultHeadline, companyLogoUrl, onSubmitted }: ManualImageEditorProps) {
  const saved = loadSavedDesign(creativeId);
  const [bg, setBg] = useState<CanvasBg>(saved?.bg ?? { type: 'solid', color: '#0F172A' });
  const [blocks, setBlocks] = useState<Block[]>(() => {
    if (saved?.blocks?.length) return saved.blocks;
    const h = newBlock('heading') as HeadingBlock;
    if (defaultHeadline) h.text = defaultHeadline;
    return [h];
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(saved?.savedAt ?? null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [past, setPast] = useState<{ blocks: Block[]; bg: CanvasBg }[]>([]);
  const [future, setFuture] = useState<{ blocks: Block[]; bg: CanvasBg }[]>([]);
  const lastSnapshot = useRef<{ blocks: Block[]; bg: CanvasBg }>({ blocks, bg });
  const restoring = useRef(false);

  useEffect(() => {
    if (restoring.current) {
      restoring.current = false;
      lastSnapshot.current = { blocks, bg };
      return;
    }
    const t = setTimeout(() => {
      const snap = { blocks, bg };
      const prev = lastSnapshot.current;
      if (snap.blocks === prev.blocks && snap.bg === prev.bg) return;
      lastSnapshot.current = snap;
      setPast((p) => [...p.slice(-49), prev]);
      setFuture([]);
    }, 350);
    return () => clearTimeout(t);
  }, [blocks, bg]);

  const undo = () => {
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    restoring.current = true;
    setBlocks(prev.blocks);
    setBg(prev.bg);
    setPast(past.slice(0, -1));
    setFuture([...future, { blocks, bg }]);
  };
  const redo = () => {
    if (future.length === 0) return;
    const next = future[future.length - 1];
    restoring.current = true;
    setBlocks(next.blocks);
    setBg(next.bg);
    setFuture(future.slice(0, -1));
    setPast([...past, { blocks, bg }]);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const editing = target && (
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      );
      if (editing) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [past, future, blocks, bg]);
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const uploadMutation = useUploadCreative();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submitComment, setSubmitComment] = useState('');
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const qc = useQueryClient();
  const submitMutation = useMutation({
    mutationFn: ({ id, status, comments }: { id: number; status: string; comments: string }) =>
      creativeService.updateStatus(id, status, comments),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['creatives'] });
      qc.invalidateQueries({ queryKey: ['creative', creativeId] });
      qc.invalidateQueries({ queryKey: ['approval-history'] });
      // Clear saved local design — it's now submitted and locked
      localStorage.removeItem(SAVE_KEY(creativeId));
      setSubmitMsg('Submitted for approval!');
      setShowSubmitForm(false);
      setSubmitComment('');
      // Hand off to parent — typically switches to Auto tab so the next-level
      // approval UI takes over without asking the designer again.
      onSubmitted?.();
      setTimeout(() => setSubmitMsg(null), 3000);
    },
    onError: (e: { response?: { data?: { detail?: string } }; message?: string }) => {
      setSubmitMsg(e.response?.data?.detail || e.message || 'Submission failed');
      setTimeout(() => setSubmitMsg(null), 4000);
    },
  });

  const selected = useMemo(
    () => blocks.find((b) => b.id === selectedId) ?? null,
    [blocks, selectedId]
  );

  useEffect(() => {
    if (!trRef.current || !layerRef.current) return;
    if (!selectedId) {
      trRef.current.nodes([]);
      trRef.current.getLayer()?.batchDraw();
      return;
    }
    const node = layerRef.current.findOne(`#${selectedId}`);
    if (node) {
      trRef.current.nodes([node]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId, blocks]);

  const updateBlock = (id: string, patch: Partial<Block>) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b))
    );
  };

  const addBlock = (type: BlockType) => {
    const b = newBlock(type);
    setBlocks((prev) => [...prev, b]);
    setSelectedId(b.id);
    if (type === 'logo' && companyLogoUrl) {
      urlToDataUrl(companyLogoUrl)
        .then((dataUrl) => updateBlock(b.id, { src: dataUrl } as Partial<Block>))
        .catch(() => { /* leave src null */ });
    }
    if (type === 'qr') {
      const q = b as QRBlock;
      QRCode.toDataURL(q.url, { color: { dark: q.fgColor, light: q.bgColor }, margin: 1, width: 512 })
        .then((d) => updateBlock(q.id, { dataUrl: d } as Partial<Block>))
        .catch(() => { /* leave dataUrl null */ });
    }
  };

  const qrSignature = blocks
    .filter((b): b is QRBlock => b.type === 'qr')
    .map((b) => `${b.id}:${b.url}:${b.fgColor}:${b.bgColor}`)
    .join('|');

  useEffect(() => {
    blocks.forEach((b) => {
      if (b.type === 'qr') {
        QRCode.toDataURL(b.url, { color: { dark: b.fgColor, light: b.bgColor }, margin: 1, width: 512 })
          .then((d) => updateBlock(b.id, { dataUrl: d } as Partial<Block>))
          .catch(() => { /* noop */ });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrSignature]);

  const deleteBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setSelectedId(null);
  };

  const moveLayer = (id: string, dir: 'top' | 'up' | 'down' | 'bottom') => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      if (dir === 'top') next.push(item);
      else if (dir === 'bottom') next.unshift(item);
      else if (dir === 'up') next.splice(Math.min(idx + 1, next.length), 0, item);
      else next.splice(Math.max(idx - 1, 0), 0, item);
      return next;
    });
  };

  const handleDownload = async () => {
    if (!stageRef.current) return;
    setExporting(true);
    setExportError(null);
    setSelectedId(null);
    await new Promise((r) => requestAnimationFrame(r));
    try {
      const dataUrl = stageRef.current.toDataURL({
        pixelRatio: CANVAS / PREVIEW,
        mimeType: 'image/png',
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `creative-${creativeId}-manual.png`;
      a.click();
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `creative-${creativeId}-manual.png`, { type: 'image/png' });
      await uploadMutation.mutateAsync({ id: creativeId, file });
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!stageRef.current || !submitComment.trim()) return;
    setExporting(true);
    setExportError(null);
    setSelectedId(null);
    await new Promise((r) => requestAnimationFrame(r));
    try {
      const dataUrl = stageRef.current.toDataURL({
        pixelRatio: CANVAS / PREVIEW,
        mimeType: 'image/png',
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `creative-${creativeId}-manual.png`, { type: 'image/png' });
      // Upload first, then transition status
      await uploadMutation.mutateAsync({ id: creativeId, file });
      await submitMutation.mutateAsync({
        id: creativeId,
        status: 'submitted',
        comments: submitComment,
      });
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setExporting(false);
    }
  };

  const handleSave = () => {
    try {
      const savedAt = new Date().toISOString();
      localStorage.setItem(SAVE_KEY(creativeId), JSON.stringify({ blocks, bg, savedAt }));
      setLastSaved(savedAt);
      setSaveMsg('Design saved!');
      setTimeout(() => setSaveMsg(null), 2000);
    } catch {
      setSaveMsg('Save failed — design may be too large');
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  const handleNewDesign = () => {
    if (!window.confirm('Start a new design? Your saved design will be cleared.')) return;
    localStorage.removeItem(SAVE_KEY(creativeId));
    setLastSaved(null);
    const h = newBlock('heading') as HeadingBlock;
    if (defaultHeadline) h.text = defaultHeadline;
    setBlocks([h]);
    setBg({ type: 'solid', color: '#0F172A' });
    setSelectedId(null);
    setPast([]);
    setFuture([]);
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Manual Image Builder</h2>
          <p className="text-xs text-gray-500">
            {lastSaved
              ? `Last saved: ${new Date(lastSaved).toLocaleTimeString()}`
              : 'Add blocks, drag to position, edit on the right.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saveMsg && (
            <span className={`text-xs font-medium px-2 py-1 rounded ${saveMsg.includes('failed') ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>
              {saveMsg}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 transition"
          >
            <Save className="w-3.5 h-3.5" /> Save Design
          </button>
          <button
            type="button"
            onClick={handleNewDesign}
            title="Start a new design"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition"
          >
            <FilePlus className="w-3.5 h-3.5" /> New
          </button>
        </div>
      </div>

      {/* Three-column layout */}
      <div className="grid grid-cols-[25%_50%_25%] gap-4 min-h-[520px]">

        {/* LEFT — Blocks + Undo/Redo + Canvas bg */}
        <div className="flex flex-col gap-1 border-r border-gray-100 pr-3 overflow-y-auto max-h-[640px]">
          {/* Undo / Redo */}
          <div className="flex gap-1 mb-2">
            <button type="button" onClick={undo} disabled={past.length === 0} title="Undo (Ctrl+Z)"
              className="flex-1 p-1.5 rounded border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition flex items-center justify-center">
              <Undo2 className="w-4 h-4" />
            </button>
            <button type="button" onClick={redo} disabled={future.length === 0} title="Redo (Ctrl+Shift+Z)"
              className="flex-1 p-1.5 rounded border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition flex items-center justify-center">
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Block buttons */}
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Blocks</p>
          {ADD_BUTTONS.map(({ type, label, Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => addBlock(type)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 text-gray-700 text-xs font-medium hover:bg-purple-50 hover:text-purple-700 transition text-left w-full"
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              {label}
            </button>
          ))}

          {/* Canvas background */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Background</p>
            <CanvasBgControlVertical bg={bg} onChange={setBg} />
          </div>
        </div>

        {/* CENTER — Canvas + actions */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="rounded-2xl overflow-hidden shadow-lg ring-1 ring-gray-200 bg-gray-100"
            style={{ width: PREVIEW, height: PREVIEW }}
          >
            <Stage
              ref={stageRef}
              width={PREVIEW}
              height={PREVIEW}
              scale={{ x: SCALE, y: SCALE }}
              onMouseDown={(e) => {
                if (e.target === e.target.getStage()) setSelectedId(null);
              }}
            >
              <Layer ref={layerRef}>
                {bg.type === 'solid' ? (
                  <Rect x={0} y={0} width={CANVAS} height={CANVAS} fill={bg.color} />
                ) : (
                  <Rect
                    x={0} y={0} width={CANVAS} height={CANVAS}
                    fillLinearGradientStartPoint={gradientStart(bg.angle)}
                    fillLinearGradientEndPoint={gradientEnd(bg.angle)}
                    fillLinearGradientColorStops={[0, bg.color1, 1, bg.color2]}
                  />
                )}
                {blocks.map((b) => (
                  <BlockRenderer
                    key={b.id}
                    block={b}
                    isSelected={b.id === selectedId}
                    onSelect={() => setSelectedId(b.id)}
                    onChange={(patch) => updateBlock(b.id, patch)}
                  />
                ))}
                <Transformer
                  ref={trRef}
                  rotateEnabled={false}
                  flipEnabled={false}
                  boundBoxFunc={(_oldBox, newBox) => {
                    if (newBox.width < 40 || newBox.height < 30) return _oldBox;
                    return newBox;
                  }}
                />
              </Layer>
            </Stage>
          </div>

          {exportError && <div className="text-xs text-red-600 text-center">{exportError}</div>}

          <div className="flex flex-wrap gap-2 justify-center">
            <GradientButton onClick={handleDownload} disabled={exporting || submitMutation.isPending}>
              {exporting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin inline" /> : <Download className="w-4 h-4 mr-1.5 inline" />}
              {exporting ? 'Exporting…' : 'Download PNG'}
            </GradientButton>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button"
              onClick={() => setShowSubmitForm((s) => !s)}
              disabled={exporting || submitMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50">
              <Send className="w-4 h-4" /> Submit for Approval
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button"
              onClick={() => { setBlocks([]); setSelectedId(null); }}
              className="px-3 py-2 rounded-full text-sm font-medium text-gray-700 border-2 border-gray-200 hover:bg-gray-50">
              Clear All
            </motion.button>
          </div>

          {/* Submit-for-approval form */}
          {showSubmitForm && (
            <div className="w-full max-w-md bg-gradient-to-b from-purple-50 to-indigo-50 border border-purple-200/60 rounded-xl p-3 space-y-2">
              <p className="text-xs font-medium text-purple-700">Submit design for approval</p>
              <textarea
                value={submitComment}
                onChange={(e) => setSubmitComment(e.target.value)}
                placeholder="Add a submission comment (required)…"
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:border-purple-500 outline-none resize-none min-h-[60px] bg-white"
              />
              <div className="flex gap-2">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button"
                  onClick={handleSubmitForApproval}
                  disabled={!submitComment.trim() || exporting || submitMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg disabled:opacity-50">
                  {(exporting || submitMutation.isPending) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {(exporting || submitMutation.isPending) ? 'Submitting…' : 'Submit'}
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button"
                  onClick={() => { setShowSubmitForm(false); setSubmitComment(''); }}
                  className="px-3 py-2 text-sm font-medium text-gray-600 bg-white rounded-lg hover:bg-gray-50 border border-gray-200">
                  Cancel
                </motion.button>
              </div>
            </div>
          )}

          {submitMsg && (
            <p className={`text-xs font-medium ${submitMsg.includes('failed') || submitMsg.includes('Cannot') ? 'text-red-600' : 'text-green-600'}`}>
              {submitMsg}
            </p>
          )}

          {uploadMutation.isSuccess && !exporting && !submitMutation.isSuccess && !showSubmitForm && (
            <p className="text-xs text-green-600">Uploaded as designer replacement.</p>
          )}
        </div>

        {/* RIGHT — Properties + Layers */}
        <div className="space-y-3 max-h-[640px] overflow-y-auto pl-3 border-l border-gray-100">
          {selected ? (
            <PropertiesPanel
              block={selected}
              onChange={(patch) => updateBlock(selected.id, patch)}
              onDelete={() => deleteBlock(selected.id)}
              onLayerTop={() => moveLayer(selected.id, 'top')}
              onLayerUp={() => moveLayer(selected.id, 'up')}
              onLayerDown={() => moveLayer(selected.id, 'down')}
              onLayerBottom={() => moveLayer(selected.id, 'bottom')}
              companyLogoUrl={companyLogoUrl ?? null}
            />
          ) : (
            <div className="text-xs text-gray-500 p-4 rounded-lg border border-dashed border-gray-200">
              Click a block on the canvas or add one from the left panel.
            </div>
          )}

          {blocks.length > 0 && (
            <div className="pt-3 border-t border-gray-100">
              <div className="text-xs font-semibold text-gray-700 mb-2">Layers ({blocks.length})</div>
              <ul className="space-y-1">
                {[...blocks].reverse().map((b) => (
                  <li key={b.id}>
                    <button type="button" onClick={() => setSelectedId(b.id)}
                      className={`w-full text-left text-xs px-2 py-1.5 rounded transition ${
                        selectedId === b.id ? 'bg-purple-100 text-purple-800' : 'hover:bg-gray-50 text-gray-600'
                      }`}>
                      <span className="capitalize">{b.type.replace('-', ' ')}</span>
                      <span className="ml-2 text-gray-400 truncate">{layerLabel(b)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface BlockRendererProps {
  block: Block;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<Block>) => void;
}

function BlockRenderer({ block, isSelected, onSelect, onChange }: BlockRendererProps) {
  const groupRef = useRef<Konva.Group>(null);

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    onChange({ x: e.target.x(), y: e.target.y() } as Partial<Block>);
  };

  const handleTransformEnd = () => {
    const node = groupRef.current;
    if (!node) return;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    onChange({
      x: node.x(),
      y: node.y(),
      width: Math.max(40, block.width * scaleX),
      height: Math.max(30, block.height * scaleY),
    } as Partial<Block>);
  };

  return (
    <Group
      id={block.id}
      ref={groupRef}
      x={block.x}
      y={block.y}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    >
      {isSelected && (
        <Rect
          width={block.width}
          height={block.height}
          stroke="#A78BFA"
          strokeWidth={2}
          dash={[8, 4]}
          listening={false}
        />
      )}
      <BlockContent block={block} />
    </Group>
  );
}

function BlockContent({ block }: { block: Block }) {
  switch (block.type) {
    case 'heading': {
      const fs = [block.bold ? 'bold' : '', block.italic ? 'italic' : ''].filter(Boolean).join(' ') || 'normal';
      return (
        <Text
          text={block.text}
          width={block.width}
          height={block.height}
          fontSize={block.fontSize}
          fontStyle={fs}
          textDecoration={block.underline ? 'underline' : ''}
          fill={block.color}
          align={block.align}
          fontFamily={`${block.fontFamily ?? 'Inter'}, system-ui, sans-serif`}
          letterSpacing={block.letterSpacing ?? 0}
        />
      );
    }
    case 'text': {
      const fs = [block.bold ? 'bold' : '', block.italic ? 'italic' : ''].filter(Boolean).join(' ') || 'normal';
      return (
        <Text
          text={block.text}
          width={block.width}
          height={block.height}
          fontSize={block.fontSize}
          fontStyle={fs}
          textDecoration={block.underline ? 'underline' : ''}
          fill={block.color}
          align={block.align}
          lineHeight={block.lineHeight}
          fontFamily={`${block.fontFamily ?? 'Inter'}, system-ui, sans-serif`}
          letterSpacing={block.letterSpacing ?? 0}
        />
      );
    }
    case 'list': {
      const items = block.items.split('\n').filter(Boolean);
      const lineH = block.fontSize * 1.5;
      const fs = [block.bold ? 'bold' : '', block.italic ? 'italic' : ''].filter(Boolean).join(' ') || 'normal';
      const ff = `${block.fontFamily ?? 'Inter'}, system-ui, sans-serif`;
      return (
        <>
          {items.map((item, i) => (
            <Group key={i} y={i * lineH}>
              <Text
                text="•"
                x={0}
                width={block.fontSize}
                fontSize={block.fontSize}
                fill={block.bulletColor}
                fontFamily={ff}
              />
              <Text
                text={item}
                x={block.fontSize * 1.2}
                width={block.width - block.fontSize * 1.2}
                fontSize={block.fontSize}
                fontStyle={fs}
                textDecoration={block.underline ? 'underline' : ''}
                fill={block.color}
                fontFamily={ff}
                letterSpacing={block.letterSpacing ?? 0}
              />
            </Group>
          ))}
        </>
      );
    }
    case 'button':
      return (
        <>
          <Rect
            width={block.width}
            height={block.height}
            fill={block.bgColor}
            cornerRadius={Math.min(block.radius, block.height / 2)}
          />
          <Text
            text={block.text}
            width={block.width}
            height={block.height}
            fontSize={block.fontSize}
            fontStyle="bold"
            fill={block.textColor}
            align="center"
            verticalAlign="middle"
            fontFamily="Inter, system-ui, sans-serif"
          />
        </>
      );
    case 'image':
    case 'logo':
    case 'logo-preset':
      return (
        <ImageBlockContent
          block={block}
          placeholder={
            block.type === 'logo'
              ? 'Company logo'
              : block.type === 'logo-preset'
              ? 'Logo — upload in panel →'
              : 'No image — upload in panel →'
          }
        />
      );
    case 'shape':
      return <ShapeBlockContent block={block} />;
    case 'icon':
      return <IconBlockContent block={block} />;
    case 'qr':
      return <QRBlockContent block={block} />;
  }
}

function calcImageFillProps(
  imgEl: HTMLImageElement,
  fit: 'cover' | 'contain' | 'fill' | undefined,
  w: number, h: number,
  offsetX: number | undefined, offsetY: number | undefined,
  forEllipse = false,
  rotation: number | undefined = 0,
  zoom: number | undefined = 1,
) {
  const iw = imgEl.naturalWidth || imgEl.width || 1;
  const ih = imgEl.naturalHeight || imgEl.height || 1;
  const safeFit = fit ?? 'cover';
  const safeOX = offsetX ?? 0;
  const safeOY = offsetY ?? 0;
  const safeZoom = (zoom ?? 1) > 0 ? (zoom ?? 1) : 1;
  let scaleX: number, scaleY: number;
  if (safeFit === 'fill') {
    scaleX = (w / iw) * safeZoom;
    scaleY = (h / ih) * safeZoom;
  } else {
    const base = safeFit === 'cover'
      ? Math.max(w / iw, h / ih)
      : Math.min(w / iw, h / ih);
    scaleX = base * safeZoom;
    scaleY = base * safeZoom;
  }
  // Konva fillPatternOffset is in PRE-scale (original image) pixel coordinates.
  // Set to image center so rotation pivots around the image center.
  const pivotX = iw / 2;
  const pivotY = ih / 2;
  // For Rect: fillPatternX/Y is relative to shape top-left → center = w/2, h/2
  // For Ellipse: fillPatternX/Y is relative to shape center → center = 0, 0
  const originX = forEllipse ? 0 : w / 2;
  const originY = forEllipse ? 0 : h / 2;
  return {
    fillPatternImage: imgEl,
    fillPatternRepeat: 'no-repeat' as const,
    fillPatternScaleX: scaleX,
    fillPatternScaleY: scaleY,
    fillPatternX: originX + safeOX,
    fillPatternY: originY + safeOY,
    fillPatternOffsetX: pivotX,
    fillPatternOffsetY: pivotY,
    fillPatternRotation: rotation ?? 0,
  };
}

function shapeFillProps(fill: ShapeFill, w: number, h: number, imgEl: HTMLImageElement | null) {
  if (fill.mode === 'solid') return { fill: fill.color };
  if (fill.mode === 'gradient') {
    const rad = (fill.angle * Math.PI) / 180;
    return {
      fillLinearGradientStartPoint: { x: w / 2 - Math.cos(rad) * w / 2, y: h / 2 - Math.sin(rad) * h / 2 },
      fillLinearGradientEndPoint:   { x: w / 2 + Math.cos(rad) * w / 2, y: h / 2 + Math.sin(rad) * h / 2 },
      fillLinearGradientColorStops: [0, fill.color1, 1, fill.color2] as (number | string)[],
    };
  }
  if (fill.mode === 'image' && imgEl) {
    return calcImageFillProps(imgEl, fill.fit, w, h, fill.offsetX, fill.offsetY, false, fill.rotation, fill.zoom);
  }
  return { fill: '#7C3AED' };
}

function ShapeBlockContent({ block }: { block: ShapeBlock }) {
  const imgSrc = block.fill.mode === 'image' ? block.fill.src : null;
  const imgEl = useImageFromUrl(imgSrc);
  const fp = shapeFillProps(block.fill, block.width, block.height, imgEl);
  const stroke = block.strokeWidth > 0 ? block.strokeColor : undefined;

  if (block.variant === 'rectangle') {
    return (
      <Rect
        width={block.width}
        height={block.height}
        {...fp}
        stroke={stroke}
        strokeWidth={block.strokeWidth}
        cornerRadius={Math.min(block.radius, Math.min(block.width, block.height) / 2)}
      />
    );
  }
  if (block.variant === 'circle') {
    const fp2 = block.fill.mode === 'image' && imgEl
      ? calcImageFillProps(imgEl, block.fill.fit, block.width, block.height, block.fill.offsetX, block.fill.offsetY, true, block.fill.rotation, block.fill.zoom)
      : fp;
    return (
      <Ellipse
        x={block.width / 2}
        y={block.height / 2}
        radiusX={block.width / 2}
        radiusY={block.height / 2}
        {...fp2}
        stroke={stroke}
        strokeWidth={block.strokeWidth}
      />
    );
  }
  const lineColor = block.fill.mode === 'solid' ? block.fill.color : block.strokeColor;
  return (
    <Line
      points={[0, block.height / 2, block.width, block.height / 2]}
      stroke={lineColor}
      strokeWidth={Math.max(2, block.strokeWidth || 4)}
      lineCap="round"
    />
  );
}

function IconBlockContent({ block }: { block: IconBlock }) {
  const size = Math.min(block.width, block.height);
  const scale = size / 24;
  const offX = (block.width - size) / 2;
  const offY = (block.height - size) / 2;
  const filled = block.icon === 'play' || block.icon === 'circle';
  return (
    <Path
      data={ICON_PATHS[block.icon]}
      x={offX}
      y={offY}
      scaleX={scale}
      scaleY={scale}
      stroke={block.color}
      strokeWidth={block.strokeWidth}
      fill={filled ? block.color : undefined}
      lineCap="round"
      lineJoin="round"
    />
  );
}

function QRBlockContent({ block }: { block: QRBlock }) {
  const img = useImageFromUrl(block.dataUrl);
  if (!img) {
    return (
      <Rect
        width={block.width}
        height={block.height}
        fill={block.bgColor}
        stroke="#9CA3AF"
        strokeWidth={1}
        dash={[4, 4]}
      />
    );
  }
  return <KonvaImage image={img} width={block.width} height={block.height} />;
}

function gradientStart(angle: number): { x: number; y: number } {
  const rad = (angle * Math.PI) / 180;
  const cx = CANVAS / 2;
  const cy = CANVAS / 2;
  return { x: cx - Math.cos(rad) * cx, y: cy - Math.sin(rad) * cy };
}

function gradientEnd(angle: number): { x: number; y: number } {
  const rad = (angle * Math.PI) / 180;
  const cx = CANVAS / 2;
  const cy = CANVAS / 2;
  return { x: cx + Math.cos(rad) * cx, y: cy + Math.sin(rad) * cy };
}

function ImageBlockContent({ block, placeholder = 'No image — upload in panel →' }: { block: ImageBlock | LogoBlock | LogoPresetBlock; placeholder?: string }) {
  const img = useImageFromUrl(block.src);
  const radius = Math.min(block.radius, Math.min(block.width, block.height) / 2);
  if (!img) {
    return (
      <>
        <Rect
          width={block.width}
          height={block.height}
          fill="#1F2937"
          cornerRadius={radius}
          stroke="#374151"
          strokeWidth={2}
          dash={[6, 4]}
        />
        <Text
          text={placeholder}
          width={block.width}
          height={block.height}
          fontSize={Math.max(14, block.width / 24)}
          fill="#9CA3AF"
          align="center"
          verticalAlign="middle"
          fontFamily="Inter, system-ui, sans-serif"
        />
      </>
    );
  }
  let drawW = block.width;
  let drawH = block.height;
  let offX = 0;
  let offY = 0;
  const boxRatio = block.width / block.height;
  const imgRatio = img.width / img.height;
  if (block.fit === 'cover') {
    if (imgRatio > boxRatio) {
      drawH = block.height;
      drawW = drawH * imgRatio;
      offX = (block.width - drawW) / 2;
    } else {
      drawW = block.width;
      drawH = drawW / imgRatio;
      offY = (block.height - drawH) / 2;
    }
  } else {
    if (imgRatio > boxRatio) {
      drawW = block.width;
      drawH = drawW / imgRatio;
      offY = (block.height - drawH) / 2;
    } else {
      drawH = block.height;
      drawW = drawH * imgRatio;
      offX = (block.width - drawW) / 2;
    }
  }
  return (
    <Group
      clipFunc={(ctx) => {
        if (radius > 0) {
          const w = block.width, h = block.height, r = radius;
          ctx.beginPath();
          ctx.moveTo(r, 0);
          ctx.arcTo(w, 0, w, h, r);
          ctx.arcTo(w, h, 0, h, r);
          ctx.arcTo(0, h, 0, 0, r);
          ctx.arcTo(0, 0, w, 0, r);
          ctx.closePath();
        } else {
          ctx.rect(0, 0, block.width, block.height);
        }
      }}
    >
      <KonvaImage image={img} x={offX} y={offY} width={drawW} height={drawH} />
    </Group>
  );
}

interface PropertiesPanelProps {
  block: Block;
  onChange: (patch: Partial<Block>) => void;
  onDelete: () => void;
  onLayerTop: () => void;
  onLayerUp: () => void;
  onLayerDown: () => void;
  onLayerBottom: () => void;
  companyLogoUrl: string | null;
}

function PropertiesPanel({ block, onChange, onDelete, onLayerTop, onLayerUp, onLayerDown, onLayerBottom, companyLogoUrl }: PropertiesPanelProps) {
  return (
    <div className="space-y-3 p-3 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-gray-700 capitalize">{block.type} block</div>
        <div className="flex items-center gap-1">
          <IconBtn onClick={onLayerTop} title="Bring to front">
            <ChevronsUp className="w-3 h-3" />
          </IconBtn>
          <IconBtn onClick={onLayerUp} title="Bring forward">
            <ChevronUp className="w-3 h-3" />
          </IconBtn>
          <IconBtn onClick={onLayerDown} title="Send backward">
            <ChevronDown className="w-3 h-3" />
          </IconBtn>
          <IconBtn onClick={onLayerBottom} title="Send to back">
            <ChevronsDown className="w-3 h-3" />
          </IconBtn>
          <IconBtn onClick={onDelete} title="Delete" danger>
            <Trash2 className="w-3 h-3" />
          </IconBtn>
        </div>
      </div>

      {(block.type === 'heading' || block.type === 'text' || block.type === 'button') && (
        <Field label="Text">
          <textarea
            value={(block as HeadingBlock | TextBlock | ButtonBlock).text}
            onChange={(e) => onChange({ text: e.target.value } as Partial<Block>)}
            rows={block.type === 'text' ? 4 : 2}
            className="w-full px-2 py-1.5 text-xs rounded border border-gray-200 focus:border-purple-500 outline-none resize-y"
          />
        </Field>
      )}

      {block.type === 'list' && (
        <Field label="Items (one per line)">
          <textarea
            value={block.items}
            onChange={(e) => onChange({ items: e.target.value } as Partial<Block>)}
            rows={5}
            className="w-full px-2 py-1.5 text-xs rounded border border-gray-200 focus:border-purple-500 outline-none resize-y"
          />
        </Field>
      )}

      {(block.type === 'heading' || block.type === 'text' || block.type === 'list') && (
        <FontFields block={block as HeadingBlock | TextBlock | ListBlock} onChange={onChange} />
      )}

      {block.type === 'text' && (
        <NumField
          label="Line height"
          value={block.lineHeight}
          min={1}
          max={3}
          step={0.05}
          onChange={(v) => onChange({ lineHeight: v } as Partial<Block>)}
        />
      )}

      {block.type === 'list' && (
        <ColorField
          label="Bullet color"
          value={block.bulletColor}
          onChange={(v) => onChange({ bulletColor: v } as Partial<Block>)}
        />
      )}

      {block.type === 'button' && (
        <>
          <NumField
            label="Font size"
            value={block.fontSize}
            min={12}
            max={80}
            onChange={(v) => onChange({ fontSize: v } as Partial<Block>)}
          />
          <ColorField label="Background" value={block.bgColor} onChange={(v) => onChange({ bgColor: v } as Partial<Block>)} />
          <ColorField label="Text color" value={block.textColor} onChange={(v) => onChange({ textColor: v } as Partial<Block>)} />
          <NumField
            label="Corner radius"
            value={block.radius}
            min={0}
            max={999}
            onChange={(v) => onChange({ radius: v } as Partial<Block>)}
          />
        </>
      )}

      {(block.type === 'image' || block.type === 'logo' || block.type === 'logo-preset') && (
        <ImageBlockFields
          block={block}
          onChange={onChange}
          companyLogoUrl={block.type === 'logo' ? companyLogoUrl : null}
        />
      )}
      {block.type === 'logo-preset' && (
        <LogoPresetFields block={block} onChange={onChange} />
      )}

      {block.type === 'shape' && <ShapeBlockFields block={block} onChange={onChange} />}
      {block.type === 'icon' && <IconBlockFields block={block} onChange={onChange} />}
      {block.type === 'qr' && <QRBlockFields block={block} onChange={onChange} />}

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
        <NumField label="X" value={Math.round(block.x)} min={-2000} max={2000} onChange={(v) => onChange({ x: v } as Partial<Block>)} />
        <NumField label="Y" value={Math.round(block.y)} min={-2000} max={2000} onChange={(v) => onChange({ y: v } as Partial<Block>)} />
        <NumField label="W" value={Math.round(block.width)} min={20} max={CANVAS} onChange={(v) => onChange({ width: v } as Partial<Block>)} />
        <NumField label="H" value={Math.round(block.height)} min={20} max={CANVAS} onChange={(v) => onChange({ height: v } as Partial<Block>)} />
      </div>
    </div>
  );
}

function FontFields({
  block, onChange,
}: { block: HeadingBlock | TextBlock | ListBlock; onChange: (patch: Partial<Block>) => void }) {
  return (
    <>
      {/* Font family */}
      <Field label="Font">
        <select
          value={block.fontFamily ?? 'Inter'}
          onChange={(e) => onChange({ fontFamily: e.target.value } as Partial<Block>)}
          className="w-full px-2 py-1.5 text-xs rounded border border-gray-200 focus:border-purple-500 outline-none"
          style={{ fontFamily: block.fontFamily }}
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
          ))}
        </select>
      </Field>

      {/* Size + align */}
      <div className="grid grid-cols-2 gap-2">
        <NumField
          label="Size"
          value={block.fontSize}
          min={12}
          max={200}
          onChange={(v) => onChange({ fontSize: v } as Partial<Block>)}
        />
        {'align' in block && (
          <Field label="Align">
            <div className="flex gap-1">
              {(['left', 'center', 'right'] as Align[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => onChange({ align: a } as Partial<Block>)}
                  title={a}
                  className={`flex-1 py-1 text-xs rounded ${
                    (block as HeadingBlock | TextBlock).align === a
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {a === 'left' ? '≡' : a === 'center' ? '≡' : '≡'}
                  {a[0].toUpperCase()}
                </button>
              ))}
            </div>
          </Field>
        )}
      </div>

      {/* Style toggles: Bold / Italic / Underline */}
      <Field label="Style">
        <div className="flex gap-1">
          {([
            { key: 'bold', label: 'B', style: 'font-bold' },
            { key: 'italic', label: 'I', style: 'italic' },
            { key: 'underline', label: 'U', style: 'underline' },
          ] as { key: 'bold' | 'italic' | 'underline'; label: string; style: string }[]).map(({ key, label, style }) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ [key]: !block[key] } as Partial<Block>)}
              className={`flex-1 py-1 text-xs rounded ${style} ${
                block[key]
                  ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-400'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      {/* Text color */}
      <ColorField
        label="Color"
        value={block.color}
        onChange={(v) => onChange({ color: v } as Partial<Block>)}
      />

      {/* Letter spacing */}
      <div>
        <div className="text-[11px] text-gray-500 mb-1">Letter spacing ({block.letterSpacing ?? 0}px)</div>
        <input
          type="range"
          min={-5} max={30} step={0.5}
          value={block.letterSpacing ?? 0}
          onChange={(e) => onChange({ letterSpacing: parseFloat(e.target.value) } as Partial<Block>)}
          className="w-full accent-purple-600"
        />
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] text-gray-500 mb-1">{label}</div>
      {children}
    </div>
  );
}

function NumField({
  label, value, min, max, step = 1, onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-2 py-1 text-xs rounded border border-gray-200 focus:border-purple-500 outline-none"
      />
    </Field>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-7 rounded border border-gray-200 cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-1 text-xs font-mono rounded border border-gray-200 focus:border-purple-500 outline-none"
        />
      </div>
    </Field>
  );
}

function ImageBlockFields({
  block, onChange, companyLogoUrl,
}: {
  block: ImageBlock | LogoBlock | LogoPresetBlock;
  onChange: (patch: Partial<Block>) => void;
  companyLogoUrl?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ src: reader.result as string } as Partial<Block>);
    reader.readAsDataURL(file);
  };
  const useCompanyLogo = async () => {
    if (!companyLogoUrl) return;
    try {
      const dataUrl = await urlToDataUrl(companyLogoUrl);
      onChange({ src: dataUrl } as Partial<Block>);
    } catch {
      /* ignore */
    }
  };
  return (
    <>
      {companyLogoUrl && (
        <button
          type="button"
          onClick={useCompanyLogo}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-purple-50 text-purple-700 text-xs font-medium hover:bg-purple-100 transition"
        >
          <RotateCcw className="w-3 h-3" />
          Use company logo
        </button>
      )}
      <Field label={block.type === 'logo' || block.type === 'logo-preset' ? 'Logo image' : 'Image'}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50 text-xs text-gray-600 transition"
          >
            <Upload className="w-3.5 h-3.5" />
            {block.src ? 'Replace' : 'Upload'}
          </button>
          {block.src && (
            <button
              type="button"
              onClick={() => onChange({ src: null } as Partial<Block>)}
              className="px-2 py-2 text-xs text-red-500 hover:bg-red-50 rounded-lg"
            >
              Clear
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
        {block.src && (
          <div className="mt-1 w-full h-16 rounded bg-gray-100 overflow-hidden">
            <img src={block.src} alt="preview" className="w-full h-full object-cover" />
          </div>
        )}
      </Field>
      <Field label="Fit">
        <div className="flex gap-1">
          {(['cover', 'contain'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onChange({ fit: f } as Partial<Block>)}
              className={`flex-1 px-2 py-1 text-xs rounded capitalize ${
                block.fit === f
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </Field>
      <NumField
        label="Corner radius"
        value={block.radius}
        min={0}
        max={500}
        onChange={(v) => onChange({ radius: v } as Partial<Block>)}
      />
    </>
  );
}

function LogoPresetFields({
  block, onChange,
}: { block: LogoPresetBlock; onChange: (patch: Partial<Block>) => void }) {
  const apply = (pos: LogoPosition) => {
    const { x, y } = logoPresetCoords(pos, block.width, block.height);
    onChange({ position: pos, x, y } as Partial<Block>);
  };
  const cells: { pos: LogoPosition; label: string }[] = [
    { pos: 'tl', label: '↖' }, { pos: 'tc', label: '↑' }, { pos: 'tr', label: '↗' },
    { pos: 'bl', label: '↙' }, { pos: 'bc', label: '↓' }, { pos: 'br', label: '↘' },
  ];
  return (
    <Field label="Position preset">
      <div className="grid grid-cols-3 gap-1">
        {cells.map(({ pos, label }) => (
          <button
            key={pos}
            type="button"
            onClick={() => apply(pos)}
            className={`aspect-square flex items-center justify-center rounded text-base ${
              block.position === pos
                ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-400'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={pos.toUpperCase()}
          >
            {label}
          </button>
        ))}
      </div>
    </Field>
  );
}

function ShapeBlockFields({
  block, onChange,
}: { block: ShapeBlock; onChange: (patch: Partial<Block>) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const setFill = (f: ShapeFill) => onChange({ fill: f } as Partial<Block>);

  const handleImageFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const prev = block.fill.mode === 'image' ? block.fill : null;
      setFill({ mode: 'image', src: reader.result as string, fit: prev?.fit ?? 'cover', offsetX: prev?.offsetX ?? 0, offsetY: prev?.offsetY ?? 0, rotation: prev?.rotation ?? 0, zoom: prev?.zoom ?? 1 });
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <Field label="Shape">
        <div className="flex gap-1">
          {(['rectangle', 'circle', 'line'] as ShapeVariant[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange({ variant: v } as Partial<Block>)}
              className={`flex-1 px-2 py-1 text-xs rounded capitalize ${
                block.variant === v
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </Field>

      {block.variant !== 'line' && (
        <Field label="Fill">
          {/* Fill mode selector */}
          <div className="flex gap-1 mb-2">
            {(['solid', 'gradient', 'image'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  if (m === 'solid') setFill({ mode: 'solid', color: block.fill.mode === 'solid' ? block.fill.color : '#7C3AED' });
                  else if (m === 'gradient') setFill({ mode: 'gradient', color1: '#7C3AED', color2: '#EC4899', angle: 135 });
                  else setFill({ mode: 'image', src: null, fit: 'cover', offsetX: 0, offsetY: 0, rotation: 0, zoom: 1 });
                }}
                className={`flex-1 px-2 py-1 text-xs rounded capitalize ${
                  block.fill.mode === m
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {m === 'image' ? 'Upload' : m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

          {/* Solid controls */}
          {block.fill.mode === 'solid' && (
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={block.fill.color}
                onChange={(e) => setFill({ mode: 'solid', color: e.target.value })}
                className="w-8 h-7 rounded border border-gray-200 cursor-pointer"
              />
              <input
                type="text"
                value={block.fill.color}
                onChange={(e) => setFill({ mode: 'solid', color: e.target.value })}
                className="flex-1 px-2 py-1 text-xs font-mono rounded border border-gray-200 focus:border-purple-500 outline-none"
              />
            </div>
          )}

          {/* Gradient controls */}
          {block.fill.mode === 'gradient' && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-10">From</span>
                <input
                  type="color"
                  value={block.fill.color1}
                  onChange={(e) => setFill({ ...block.fill, mode: 'gradient', color1: e.target.value })}
                  className="w-8 h-7 rounded border border-gray-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={block.fill.color1}
                  onChange={(e) => setFill({ ...block.fill, mode: 'gradient', color1: e.target.value })}
                  className="flex-1 px-2 py-1 text-xs font-mono rounded border border-gray-200 focus:border-purple-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-10">To</span>
                <input
                  type="color"
                  value={block.fill.color2}
                  onChange={(e) => setFill({ ...block.fill, mode: 'gradient', color2: e.target.value })}
                  className="w-8 h-7 rounded border border-gray-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={block.fill.color2}
                  onChange={(e) => setFill({ ...block.fill, mode: 'gradient', color2: e.target.value })}
                  className="flex-1 px-2 py-1 text-xs font-mono rounded border border-gray-200 focus:border-purple-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-10">{block.fill.angle}°</span>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={block.fill.angle}
                  onChange={(e) => setFill({ ...block.fill, mode: 'gradient', angle: parseInt(e.target.value) })}
                  className="flex-1 accent-purple-600"
                />
              </div>
              <div
                className="h-5 rounded"
                style={{
                  background: `linear-gradient(${block.fill.angle}deg, ${block.fill.color1}, ${block.fill.color2})`,
                }}
              />
            </div>
          )}

          {/* Image upload controls */}
          {block.fill.mode === 'image' && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50 text-xs text-gray-600 transition"
              >
                <Upload className="w-3.5 h-3.5" />
                {block.fill.src ? 'Replace image' : 'Upload image'}
              </button>
              {block.fill.src && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-12 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                      <img src={block.fill.src} alt="fill preview" className="w-full h-full object-cover" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setFill({ mode: 'image', src: null, fit: block.fill.mode === 'image' ? block.fill.fit : 'cover', offsetX: 0, offsetY: 0, rotation: 0, zoom: 1 })}
                      className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded"
                    >
                      Clear
                    </button>
                  </div>
                  {/* Fit mode */}
                  <div>
                    <div className="text-[11px] text-gray-500 mb-1">Fit</div>
                    <div className="flex gap-1">
                      {(['cover', 'contain', 'fill'] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setFill({ ...block.fill, mode: 'image', fit: f })}
                          className={`flex-1 px-2 py-1 text-xs rounded capitalize ${
                            block.fill.fit === f
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Position offset */}
                  <div>
                    <div className="text-[11px] text-gray-500 mb-1">Position X ({block.fill.offsetX}px)</div>
                    <input
                      type="range"
                      min={-500} max={500}
                      value={block.fill.offsetX}
                      onChange={(e) => setFill({ ...block.fill, mode: 'image', offsetX: parseInt(e.target.value) })}
                      className="w-full accent-purple-600"
                    />
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500 mb-1">Position Y ({block.fill.offsetY}px)</div>
                    <input
                      type="range"
                      min={-500} max={500}
                      value={block.fill.offsetY}
                      onChange={(e) => setFill({ ...block.fill, mode: 'image', offsetY: parseInt(e.target.value) })}
                      className="w-full accent-purple-600"
                    />
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500 mb-1">Rotation ({block.fill.rotation ?? 0}°)</div>
                    <input
                      type="range"
                      min={0} max={360}
                      value={block.fill.rotation ?? 0}
                      onChange={(e) => setFill({ ...block.fill, mode: 'image', rotation: parseInt(e.target.value) })}
                      className="w-full accent-purple-600"
                    />
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500 mb-1">
                      Zoom ({Math.round((block.fill.zoom ?? 1) * 100)}%)
                    </div>
                    <input
                      type="range"
                      min={20} max={400} step={5}
                      value={Math.round((block.fill.zoom ?? 1) * 100)}
                      onChange={(e) => setFill({ ...block.fill, mode: 'image', zoom: parseInt(e.target.value) / 100 })}
                      className="w-full accent-purple-600"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                      <span>20%</span><span>100%</span><span>400%</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFill({ ...block.fill, mode: 'image', offsetX: 0, offsetY: 0, rotation: 0, zoom: 1 })}
                    className="w-full text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 py-1 rounded border border-gray-200"
                  >
                    Reset all
                  </button>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageFile(e.target.files?.[0])}
              />
            </div>
          )}
        </Field>
      )}

      {block.variant === 'line' && (
        <ColorField label="Line color" value={block.fill.mode === 'solid' ? block.fill.color : '#7C3AED'} onChange={(v) => setFill({ mode: 'solid', color: v })} />
      )}

      {block.variant !== 'line' && (
        <ColorField label="Stroke" value={block.strokeColor} onChange={(v) => onChange({ strokeColor: v } as Partial<Block>)} />
      )}
      <NumField label="Stroke width" value={block.strokeWidth} min={0} max={40} onChange={(v) => onChange({ strokeWidth: v } as Partial<Block>)} />
      {block.variant === 'rectangle' && (
        <NumField label="Corner radius" value={block.radius} min={0} max={500} onChange={(v) => onChange({ radius: v } as Partial<Block>)} />
      )}
    </>
  );
}

function IconBlockFields({
  block, onChange,
}: { block: IconBlock; onChange: (patch: Partial<Block>) => void }) {
  const names = Object.keys(ICON_PATHS) as IconName[];
  return (
    <>
      <Field label="Icon">
        <div className="grid grid-cols-5 gap-1">
          {names.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ icon: n } as Partial<Block>)}
              className={`aspect-square flex items-center justify-center rounded ${
                block.icon === n
                  ? 'bg-purple-100 ring-2 ring-purple-400'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              title={n}
            >
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4"
                fill={n === 'play' || n === 'circle' ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={ICON_PATHS[n]} />
              </svg>
            </button>
          ))}
        </div>
      </Field>
      <ColorField label="Color" value={block.color} onChange={(v) => onChange({ color: v } as Partial<Block>)} />
      <NumField label="Stroke width" value={block.strokeWidth} min={1} max={6} step={0.5} onChange={(v) => onChange({ strokeWidth: v } as Partial<Block>)} />
    </>
  );
}

function QRBlockFields({
  block, onChange,
}: { block: QRBlock; onChange: (patch: Partial<Block>) => void }) {
  return (
    <>
      <Field label="URL or text">
        <input
          type="text"
          value={block.url}
          onChange={(e) => onChange({ url: e.target.value } as Partial<Block>)}
          className="w-full px-2 py-1.5 text-xs rounded border border-gray-200 focus:border-purple-500 outline-none font-mono"
        />
      </Field>
      <ColorField label="Foreground" value={block.fgColor} onChange={(v) => onChange({ fgColor: v } as Partial<Block>)} />
      <ColorField label="Background" value={block.bgColor} onChange={(v) => onChange({ bgColor: v } as Partial<Block>)} />
    </>
  );
}

function layerLabel(b: Block): string {
  switch (b.type) {
    case 'list': return b.items.split('\n')[0];
    case 'image':
    case 'logo':
    case 'logo-preset': return b.src ? 'image' : '(no image)';
    case 'shape': return b.variant;
    case 'icon': return b.icon;
    case 'qr': return b.url;
    default: return b.text;
  }
}

function CanvasBgControl({ bg, onChange }: { bg: CanvasBg; onChange: (b: CanvasBg) => void }) {
  return (
    <div className="ml-auto flex items-center gap-2 flex-wrap">
      <label className="text-xs text-gray-600">Canvas</label>
      <div className="flex rounded-lg overflow-hidden border border-gray-200">
        <button
          type="button"
          onClick={() => onChange({ type: 'solid', color: bg.type === 'solid' ? bg.color : bg.color1 })}
          className={`px-2 py-1 text-xs ${bg.type === 'solid' ? 'bg-purple-100 text-purple-700' : 'bg-white text-gray-600'}`}
        >
          Solid
        </button>
        <button
          type="button"
          onClick={() => onChange(
            bg.type === 'gradient'
              ? bg
              : { type: 'gradient', color1: bg.color, color2: '#EC4899', angle: 135 }
          )}
          className={`px-2 py-1 text-xs ${bg.type === 'gradient' ? 'bg-purple-100 text-purple-700' : 'bg-white text-gray-600'}`}
        >
          Gradient
        </button>
      </div>
      {bg.type === 'solid' ? (
        <input
          type="color"
          value={bg.color}
          onChange={(e) => onChange({ type: 'solid', color: e.target.value })}
          className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
        />
      ) : (
        <>
          <input
            type="color"
            value={bg.color1}
            onChange={(e) => onChange({ ...bg, color1: e.target.value })}
            className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
          />
          <input
            type="color"
            value={bg.color2}
            onChange={(e) => onChange({ ...bg, color2: e.target.value })}
            className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
          />
          <input
            type="range"
            min={0}
            max={360}
            value={bg.angle}
            onChange={(e) => onChange({ ...bg, angle: parseInt(e.target.value) })}
            className="w-20 accent-purple-600"
            title={`${bg.angle}°`}
          />
        </>
      )}
    </div>
  );
}

function CanvasBgControlVertical({ bg, onChange }: { bg: CanvasBg; onChange: (b: CanvasBg) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex rounded-lg overflow-hidden border border-gray-200">
        <button type="button"
          onClick={() => onChange({ type: 'solid', color: bg.type === 'solid' ? bg.color : bg.color1 })}
          className={`flex-1 py-1 text-xs ${bg.type === 'solid' ? 'bg-purple-100 text-purple-700' : 'bg-white text-gray-600'}`}>
          Solid
        </button>
        <button type="button"
          onClick={() => onChange(bg.type === 'gradient' ? bg : { type: 'gradient', color1: bg.color, color2: '#EC4899', angle: 135 })}
          className={`flex-1 py-1 text-xs ${bg.type === 'gradient' ? 'bg-purple-100 text-purple-700' : 'bg-white text-gray-600'}`}>
          Gradient
        </button>
      </div>
      {bg.type === 'solid' ? (
        <div className="flex items-center gap-2">
          <input type="color" value={bg.color}
            onChange={(e) => onChange({ type: 'solid', color: e.target.value })}
            className="w-8 h-7 rounded border border-gray-200 cursor-pointer" />
          <input type="text" value={bg.color}
            onChange={(e) => onChange({ type: 'solid', color: e.target.value })}
            className="flex-1 px-2 py-1 text-xs font-mono rounded border border-gray-200 focus:border-purple-500 outline-none" />
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 w-6">From</span>
            <input type="color" value={bg.color1}
              onChange={(e) => onChange({ ...bg, color1: e.target.value })}
              className="w-7 h-6 rounded border border-gray-200 cursor-pointer" />
            <input type="text" value={bg.color1}
              onChange={(e) => onChange({ ...bg, color1: e.target.value })}
              className="flex-1 px-2 py-1 text-xs font-mono rounded border border-gray-200 focus:border-purple-500 outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 w-6">To</span>
            <input type="color" value={bg.color2}
              onChange={(e) => onChange({ ...bg, color2: e.target.value })}
              className="w-7 h-6 rounded border border-gray-200 cursor-pointer" />
            <input type="text" value={bg.color2}
              onChange={(e) => onChange({ ...bg, color2: e.target.value })}
              className="flex-1 px-2 py-1 text-xs font-mono rounded border border-gray-200 focus:border-purple-500 outline-none" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500 w-6">{bg.angle}°</span>
            <input type="range" min={0} max={360} value={bg.angle}
              onChange={(e) => onChange({ ...bg, angle: parseInt(e.target.value) })}
              className="flex-1 accent-purple-600" />
          </div>
        </div>
      )}
    </div>
  );
}

function IconBtn({
  children, onClick, title, danger,
}: {
  children: React.ReactNode; onClick: () => void; title: string; danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition ${
        danger
          ? 'text-red-600 hover:bg-red-50'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}
