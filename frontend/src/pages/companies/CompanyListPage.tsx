import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Upload,
  X,
  Type,
  // ChevronDown,  // TODO: Temporarily hidden — templates
  Save,
  RotateCcw,
  // LayoutTemplate,  // TODO: Temporarily hidden — templates
  Briefcase,
  Camera,
  Globe,
} from 'lucide-react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { Pagination } from '../../components/ui/Pagination';
import {
  useCompanies,
  useCreateCompany,
  useUpdateCompany,
  useUploadLogo,
  useDeleteCompany,
  // useCompanyTemplates,  // TODO: Temporarily hidden — templates
  // useUpdateTemplate,  // TODO: Temporarily hidden — templates
} from '../../hooks/useCompanies';
import type { Company } from '../../types';
import { useAuth } from '../../context/AuthContext';

const FONT_OPTIONS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Nunito',
  'Raleway',
  'Playfair Display',
  'Source Sans 3',
  'DM Sans',
  'Work Sans',
];

const LOGO_POSITIONS = [
  { value: 'top_left', label: 'Top Left' },
  { value: 'top_right', label: 'Top Right' },
  { value: 'bottom_left', label: 'Bottom Left' },
  { value: 'bottom_right', label: 'Bottom Right' },
  { value: 'center', label: 'Center' },
];

const PLATFORM_META: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  linkedin: {
    icon: <Briefcase size={18} />,
    color: 'from-blue-600 to-blue-700',
    label: 'LinkedIn',
  },
  instagram: {
    icon: <Camera size={18} />,
    color: 'from-pink-500 to-purple-600',
    label: 'Instagram',
  },
  facebook: {
    icon: <Globe size={18} />,
    color: 'from-blue-500 to-blue-600',
    label: 'Facebook',
  },
};

interface CompanyFormData {
  name: string;
  primary_color: string;
  secondary_color: string;
  font_family: string;
}

const defaultForm: CompanyFormData = {
  name: '',
  primary_color: '#6B21A8',
  secondary_color: '#EC4899',
  font_family: 'Inter',
};

/* ─── Company Create/Edit Modal ──────────────────────────────────── */

function CompanyModal({
  company,
  onClose,
}: {
  company: Company | null;
  onClose: () => void;
}) {
  const isEditing = !!company;
  const [form, setForm] = useState<CompanyFormData>(
    company
      ? {
          name: company.name,
          primary_color: company.primary_color,
          secondary_color: company.secondary_color,
          font_family: company.font_family,
        }
      : defaultForm
  );
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    company?.logo_url || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createMutation = useCreateCompany();
  const updateMutation = useUpdateCompany();
  const uploadLogoMutation = useUploadLogo();

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    uploadLogoMutation.isPending;

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    let companyId: number;

    if (isEditing) {
      await updateMutation.mutateAsync({ id: company.id, data: form });
      companyId = company.id;
    } else {
      const res = await createMutation.mutateAsync(form);
      companyId = res.data.id;
    }

    if (logoFile) {
      await uploadLogoMutation.mutateAsync({ id: companyId, file: logoFile });
    }

    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Company' : 'Add New Company'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Logo Upload */}
          <div className="flex flex-col items-center gap-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 hover:border-purple-400 flex items-center justify-center cursor-pointer transition-colors overflow-hidden group"
            >
              {logoPreview ? (
                <>
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload size={20} className="text-white" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 text-gray-400">
                  <Upload size={24} />
                  <span className="text-xs">Logo</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleLogoChange}
              className="hidden"
            />
            <p className="text-xs text-gray-400">PNG, JPG, WebP. Max 50MB.</p>
          </div>

          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter company name"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all text-sm"
            />
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Primary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={form.primary_color}
                  onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                  pattern="^#[0-9A-Fa-f]{6}$"
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none text-sm font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Secondary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.secondary_color}
                  onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={form.secondary_color}
                  onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
                  pattern="^#[0-9A-Fa-f]{6}$"
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* Brand Preview */}
          <div className="rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-2">Brand Preview</p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: form.primary_color }} />
              <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: form.secondary_color }} />
              <div
                className="h-8 rounded-lg px-4 flex items-center text-white text-sm font-medium"
                style={{
                  background: `linear-gradient(135deg, ${form.primary_color}, ${form.secondary_color})`,
                  fontFamily: form.font_family,
                }}
              >
                {form.name || 'Company Name'}
              </div>
            </div>
          </div>

          {/* Font Family */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Type size={14} className="inline mr-1" />
              Font Family
            </label>
            <select
              value={form.font_family}
              onChange={(e) => setForm({ ...form, font_family: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all text-sm"
              style={{ fontFamily: form.font_family }}
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-gray-500" style={{ fontFamily: form.font_family }}>
              The quick brown fox jumps over the lazy dog
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <GradientButton variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </GradientButton>
            <GradientButton type="submit" size="sm" isLoading={isPending} disabled={!form.name.trim()}>
              {isEditing ? 'Save Changes' : 'Create Company'}
            </GradientButton>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ─── Template Card with Canvas Preview ──────────────────────────── */

function TemplatePreview({ template, company }: { template: CompanyTemplate; company: Company }) {
  const scale = 160 / template.width;
  const previewH = template.height * scale;
  const meta = PLATFORM_META[template.platform];
  const bgColor = template.bg_color || company.primary_color;

  const logoPos: Record<string, string> = {
    top_left: 'top-2 left-2',
    top_right: 'top-2 right-2',
    bottom_left: 'bottom-2 left-2',
    bottom_right: 'bottom-2 right-2',
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  };

  return (
    <div
      className="relative rounded-lg overflow-hidden border border-gray-200"
      style={{ width: 160, height: previewH }}
    >
      {/* Background */}
      <div className="absolute inset-0" style={{ backgroundColor: bgColor, opacity: template.overlay_opacity }} />
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${bgColor}dd, ${company.secondary_color}aa)`,
        }}
      />

      {/* Logo placeholder */}
      <div className={`absolute ${logoPos[template.logo_position]} w-6 h-6 rounded bg-white/30 flex items-center justify-center`}>
        {company.logo_url ? (
          <img src={company.logo_url} alt="" className="w-5 h-5 object-contain" />
        ) : (
          <Building2 size={12} className="text-white/70" />
        )}
      </div>

      {/* Text preview */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
        <div
          className="text-white font-bold leading-tight"
          style={{
            fontSize: `${Math.max(8, template.heading_font_size * scale)}px`,
            fontFamily: company.font_family,
          }}
        >
          Heading
        </div>
        <div
          className="text-white/80 mt-1"
          style={{
            fontSize: `${Math.max(6, template.body_font_size * scale)}px`,
            fontFamily: company.font_family,
          }}
        >
          Body text here
        </div>
        {template.default_cta && (
          <div
            className="mt-2 px-2 py-0.5 rounded-full text-white bg-white/20"
            style={{ fontSize: '7px' }}
          >
            {template.default_cta}
          </div>
        )}
      </div>

      {/* Platform badge */}
      <div
        className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-gradient-to-r ${meta.color} flex items-center justify-center`}
      >
        <span className="text-white" style={{ fontSize: 10 }}>
          {template.platform[0].toUpperCase()}
        </span>
      </div>

      {/* Size label */}
      <div className="absolute bottom-1 left-1 text-[8px] text-white/50 font-mono">
        {template.width}x{template.height}
      </div>
    </div>
  );
}

/* ─── Template Editor ────────────────────────────────────────────── */

function TemplateEditor({
  template,
  company,
  onSaved,
}: {
  template: CompanyTemplate;
  company: Company;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: template.name,
    width: template.width,
    height: template.height,
    bg_color: template.bg_color || company.primary_color,
    text_color: template.text_color,
    heading_font_size: template.heading_font_size,
    body_font_size: template.body_font_size,
    logo_position: template.logo_position,
    overlay_opacity: template.overlay_opacity,
    default_cta: template.default_cta || '',
    default_hashtags: template.default_hashtags || '',
  });

  const updateMutation = useUpdateTemplate();

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      templateId: template.id,
      data: {
        ...form,
        default_cta: form.default_cta || null,
        default_hashtags: form.default_hashtags || null,
      },
    });
    onSaved();
  };

  const handleReset = () => {
    setForm({
      name: template.name,
      width: template.width,
      height: template.height,
      bg_color: template.bg_color || company.primary_color,
      text_color: template.text_color,
      heading_font_size: template.heading_font_size,
      body_font_size: template.body_font_size,
      logo_position: template.logo_position,
      overlay_opacity: template.overlay_opacity,
      default_cta: template.default_cta || '',
      default_hashtags: template.default_hashtags || '',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Settings */}
          <div className="space-y-3">
            {/* Template Name */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Template Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-purple-400 focus:ring-1 focus:ring-purple-100 outline-none"
              />
            </div>

            {/* Canvas Size */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Width (px)</label>
                <input
                  type="number"
                  value={form.width}
                  onChange={(e) => setForm({ ...form, width: Number(e.target.value) })}
                  min={100}
                  max={4096}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-purple-400 focus:ring-1 focus:ring-purple-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Height (px)</label>
                <input
                  type="number"
                  value={form.height}
                  onChange={(e) => setForm({ ...form, height: Number(e.target.value) })}
                  min={100}
                  max={4096}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-purple-400 focus:ring-1 focus:ring-purple-100 outline-none"
                />
              </div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Background</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={form.bg_color}
                    onChange={(e) => setForm({ ...form, bg_color: e.target.value })}
                    className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={form.bg_color}
                    onChange={(e) => setForm({ ...form, bg_color: e.target.value })}
                    className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-mono focus:border-purple-400 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Text Color</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={form.text_color}
                    onChange={(e) => setForm({ ...form, text_color: e.target.value })}
                    className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={form.text_color}
                    onChange={(e) => setForm({ ...form, text_color: e.target.value })}
                    className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-mono focus:border-purple-400 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Font Sizes */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Heading Size</label>
                <input
                  type="number"
                  value={form.heading_font_size}
                  onChange={(e) => setForm({ ...form, heading_font_size: Number(e.target.value) })}
                  min={10}
                  max={200}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-purple-400 focus:ring-1 focus:ring-purple-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Body Size</label>
                <input
                  type="number"
                  value={form.body_font_size}
                  onChange={(e) => setForm({ ...form, body_font_size: Number(e.target.value) })}
                  min={8}
                  max={120}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-purple-400 focus:ring-1 focus:ring-purple-100 outline-none"
                />
              </div>
            </div>

            {/* Logo Position & Overlay */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Logo Position</label>
                <select
                  value={form.logo_position}
                  onChange={(e) => setForm({ ...form, logo_position: e.target.value as CompanyTemplate['logo_position'] })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-purple-400 outline-none"
                >
                  {LOGO_POSITIONS.map((pos) => (
                    <option key={pos.value} value={pos.value}>
                      {pos.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Overlay: {Math.round(form.overlay_opacity * 100)}%
                </label>
                <input
                  type="range"
                  value={form.overlay_opacity}
                  onChange={(e) => setForm({ ...form, overlay_opacity: Number(e.target.value) })}
                  min={0}
                  max={1}
                  step={0.05}
                  className="w-full mt-2 accent-purple-600"
                />
              </div>
            </div>

            {/* CTA & Hashtags */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Default CTA</label>
              <input
                type="text"
                value={form.default_cta}
                onChange={(e) => setForm({ ...form, default_cta: e.target.value })}
                placeholder="e.g., Learn More, Shop Now"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-purple-400 focus:ring-1 focus:ring-purple-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Default Hashtags</label>
              <input
                type="text"
                value={form.default_hashtags}
                onChange={(e) => setForm({ ...form, default_hashtags: e.target.value })}
                placeholder="#brand #marketing"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-purple-400 focus:ring-1 focus:ring-purple-100 outline-none"
              />
            </div>
          </div>

          {/* Right: Live Preview */}
          <div className="flex flex-col items-center justify-center">
            <p className="text-xs text-gray-400 mb-3">Live Preview</p>
            <TemplatePreview
              template={{ ...template, ...form, bg_color: form.bg_color } as CompanyTemplate}
              company={company}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-gray-600 bg-white border border-gray-200 hover:bg-gray-50"
          >
            <RotateCcw size={12} />
            Reset
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50"
          >
            <Save size={12} />
            {updateMutation.isPending ? 'Saving...' : 'Save Template'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Templates Panel (per company) ──────────────────────────────── */

function TemplatesPanel({ company }: { company: Company }) {
  const { data: templates, isLoading } = useCompanyTemplates(company.id);
  const [editingId, setEditingId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-4">No templates found</p>
    );
  }

  return (
    <div className="space-y-3">
      {templates.map((tpl) => {
        const meta = PLATFORM_META[tpl.platform] || PLATFORM_META.facebook;
        return (
          <div key={tpl.id}>
            <div
              className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-xl p-3 transition-colors"
              onClick={() => setEditingId(editingId === tpl.id ? null : tpl.id)}
            >
              {/* Platform icon */}
              <div
                className={`w-9 h-9 rounded-lg bg-gradient-to-r ${meta.color} flex items-center justify-center text-white shrink-0`}
              >
                {meta.icon}
              </div>

              {/* Preview thumbnail */}
              <TemplatePreview template={tpl} company={company} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900">{tpl.name}</h4>
                <p className="text-xs text-gray-400">
                  {tpl.width}x{tpl.height} &middot; {company.font_family} &middot;{' '}
                  Logo: {LOGO_POSITIONS.find((p) => p.value === tpl.logo_position)?.label}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <div
                    className="w-4 h-4 rounded border border-gray-200"
                    style={{ backgroundColor: tpl.bg_color || company.primary_color }}
                  />
                  <div
                    className="w-4 h-4 rounded border border-gray-200"
                    style={{ backgroundColor: tpl.text_color }}
                  />
                  {tpl.default_cta && (
                    <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full">
                      {tpl.default_cta}
                    </span>
                  )}
                </div>
              </div>

              {/* Edit toggle */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 shrink-0"
              >
                {editingId === tpl.id ? <ChevronDown size={16} className="rotate-180" /> : <Pencil size={14} />}
              </motion.button>
            </div>

            {/* Editor */}
            <AnimatePresence>
              {editingId === tpl.id && (
                <TemplateEditor
                  template={tpl}
                  company={company}
                  onSaved={() => setEditingId(null)}
                />
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Company Card ───────────────────────────────────────────────── */

function CompanyCard({
  company,
  onEdit,
  onDelete,
  isExpanded,
  onToggleExpand,
  canManage,
}: {
  company: Company;
  onEdit: () => void;
  onDelete: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  canManage: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="group"
    >
      <GlassCard className="!p-0 overflow-hidden hover:shadow-2xl transition-shadow">
        {/* Gradient header */}
        <div
          className="h-20 relative"
          style={{
            background: `linear-gradient(135deg, ${company.primary_color}, ${company.secondary_color})`,
          }}
        >
          {/* Logo */}
          <div className="absolute -bottom-8 left-5">
            <div className="w-16 h-16 rounded-xl bg-white shadow-lg border-2 border-white overflow-hidden flex items-center justify-center">
              {company.logo_url ? (
                <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
              ) : (
                <Building2 size={28} style={{ color: company.primary_color }} />
              )}
            </div>
          </div>

          {/* Actions */}
          {canManage && (
            <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onEdit}
                className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur-sm flex items-center justify-center text-gray-600 hover:text-purple-600 shadow-sm"
              >
                <Pencil size={14} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onDelete}
                className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur-sm flex items-center justify-center text-gray-600 hover:text-red-600 shadow-sm"
              >
                <Trash2 size={14} />
              </motion.button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="pt-10 pb-4 px-5">
          <h3
            className="text-lg font-semibold text-gray-900 mb-3"
            style={{ fontFamily: company.font_family }}
          >
            {company.name}
          </h3>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-20">Colors</span>
              <div className="flex gap-1.5">
                <div className="w-6 h-6 rounded-md border border-gray-200" style={{ backgroundColor: company.primary_color }} />
                <div className="w-6 h-6 rounded-md border border-gray-200" style={{ backgroundColor: company.secondary_color }} />
              </div>
              <span className="text-xs text-gray-400 font-mono">
                {company.primary_color} / {company.secondary_color}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-20">Font</span>
              <span className="text-sm text-gray-700" style={{ fontFamily: company.font_family }}>
                {company.font_family}
              </span>
            </div>
          </div>

          {/* TODO: Temporarily hidden — Platform Templates UI */}
        </div>
      </GlassCard>
    </motion.div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────── */

export function CompanyListPage() {
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { user } = useAuth();
  const canManage = user?.role === 'admin';
  const { data, isLoading } = useCompanies({ page, per_page: 12 });
  const deleteMutation = useDeleteCompany();

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    await deleteMutation.mutateAsync(id);
    setDeletingId(null);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingCompany(null);
  };

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">Companies</h1>
            <p className="text-gray-500 mt-1">
              Manage company brand settings and platform templates
            </p>
          </div>
          {canManage && (
            <GradientButton
              size="sm"
              onClick={() => {
                setEditingCompany(null);
                setModalOpen(true);
              }}
            >
              <span className="flex items-center gap-2">
                <Plus size={16} />
                Add Company
              </span>
            </GradientButton>
          )}
        </div>

        {/* Company Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
          </div>
        ) : data?.items.length === 0 ? (
          <GlassCard className="flex flex-col items-center justify-center py-16">
            <Building2 size={48} className="text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-1">No companies yet</h3>
            <p className="text-sm text-gray-400 mb-4">
              {canManage
                ? 'Create your first company to get started'
                : 'No companies have been added yet.'}
            </p>
            {canManage && (
              <GradientButton
                size="sm"
                onClick={() => {
                  setEditingCompany(null);
                  setModalOpen(true);
                }}
              >
                <span className="flex items-center gap-2">
                  <Plus size={16} />
                  Add Company
                </span>
              </GradientButton>
            )}
          </GlassCard>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnimatePresence mode="popLayout">
                {data?.items.map((company) => (
                  <CompanyCard
                    key={company.id}
                    company={company}
                    onEdit={() => handleEdit(company)}
                    onDelete={() => handleDelete(company.id)}
                    isExpanded={expandedId === company.id}
                    onToggleExpand={() =>
                      setExpandedId(expandedId === company.id ? null : company.id)
                    }
                    canManage={canManage}
                  />
                ))}
              </AnimatePresence>
            </div>

            {data && data.total > data.per_page && (
              <Pagination
                page={page}
                totalPages={Math.ceil(data.total / data.per_page)}
                onPageChange={setPage}
              />
            )}
          </>
        )}

        {/* Delete snackbar */}
        <AnimatePresence>
          {deletingId !== null && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-2xl text-sm"
            >
              Deleting company...
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal */}
        <AnimatePresence>
          {modalOpen && (
            <CompanyModal company={editingCompany} onClose={handleCloseModal} />
          )}
        </AnimatePresence>
      </div>
    </PageWrapper>
  );
}
