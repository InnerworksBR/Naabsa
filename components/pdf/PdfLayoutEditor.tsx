'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { PdfTemplate } from './PdfTemplate'
import type { PageBreakKey } from './PdfTemplate'
import { generatePdfFromElement } from './PdfGenerator'
import { useToast } from '@/components/ui/ToastProvider'
import type { BunkerReport } from '@/lib/types'
import {
  ArrowLeft, Image as ImageIcon, Maximize, Type, Palette, Edit2, Download,
  ChevronDown, ChevronUp, Table2, Scissors, Ruler, ZoomIn, LayoutTemplate, Eye, EyeOff,
} from 'lucide-react'

// ─── Collapsible section ─────────────────────────────────────────────────────

interface SectionProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}

function Section({ title, icon, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--navy-100)', fontSize: 'var(--text-xs)', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{icon}{title}</span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && <div style={{ padding: '0 20px 16px' }}>{children}</div>}
    </div>
  )
}

// ─── Slider ──────────────────────────────────────────────────────────────────

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  decimals?: number
  onChange: (v: number) => void
}

function Slider({ label, value, min, max, step = 1, unit = 'px', decimals = 0, onChange }: SliderProps) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'var(--text-xs)' }}>{label}</span>
        <span style={{ color: '#fff', fontSize: 'var(--text-xs)', fontWeight: 600, background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 3 }}>
          {decimals > 0 ? value.toFixed(decimals) : value}{unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--red-600)', height: 4, cursor: 'pointer' }}
      />
    </div>
  )
}

// ─── Checkbox toggle ──────────────────────────────────────────────────────────

interface CheckboxToggleProps {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}

function CheckboxToggle({ label, checked, onChange }: CheckboxToggleProps) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
      marginBottom: 10, color: 'rgba(255,255,255,0.7)', fontSize: 'var(--text-xs)',
    }}>
      <input
        type="checkbox" checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ accentColor: 'var(--red-600)', width: 13, height: 13, cursor: 'pointer' }}
      />
      {label}
    </label>
  )
}

// ─── Main editor ──────────────────────────────────────────────────────────────

const ALL_BREAKS = new Set<PageBreakKey>([
  'after-cover', 'after-toc', 'after-page3', 'after-page4', 'after-page5', 'after-page6',
])

const PAGE_BREAK_OPTIONS: [PageBreakKey, string][] = [
  ['after-cover',  'Após capa'],
  ['after-toc',    'Após índice'],
  ['after-page3',  'Após seções 1 – 4.1'],
  ['after-page4',  'Após seções 4.2 – 4.5'],
  ['after-page5',  'Após seções 4.6 – 5.2'],
  ['after-page6',  'Após figuras finais'],
]

export function PdfLayoutEditor({ report }: { report: BunkerReport }) {
  const router = useRouter()
  const toast = useToast()

  // ── Existing state ──
  const [logoHeight, setLogoHeight] = useState(24)
  const [pageMargin, setPageMargin] = useState(64)
  const [fontSize, setFontSize] = useState(12)
  const [primaryColor, setPrimaryColor] = useState('#003366')
  const [editMode, setEditMode] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // ── Typography extras ──
  const [lineHeight, setLineHeight] = useState(1.6)
  const [paraSpacing, setParaSpacing] = useState(16)
  const [titleSize, setTitleSize] = useState(15)
  const [titleMarginTop, setTitleMarginTop] = useState(24)
  const [titleMarginBottom, setTitleMarginBottom] = useState(8)

  // ── Cover page ──
  const [coverPhotoWidth, setCoverPhotoWidth] = useState(100)
  const [coverPhotoHeight, setCoverPhotoHeight] = useState(350)
  const [coverPhotoMb, setCoverPhotoMb] = useState(28)
  const [coverTitleMt, setCoverTitleMt] = useState(16)
  const [coverTitleMb, setCoverTitleMb] = useState(24)
  const [coverContactsMt, setCoverContactsMt] = useState(40)

  // ── Tables ──
  const [tableFontSize, setTableFontSize] = useState(9)
  const [cellPadding, setCellPadding] = useState(2)

  // ── Page breaks ──
  const [activeBreaks, setActiveBreaks] = useState<Set<PageBreakKey>>(new Set(ALL_BREAKS))

  function toggleBreak(key: PageBreakKey, on: boolean) {
    setActiveBreaks(prev => {
      const next = new Set(prev)
      if (on) next.add(key)
      else next.delete(key)
      return next
    })
  }

  // ── PDF export margins (mm) — html2pdf order: top, left, bottom, right ──
  const [pdfMarginTop, setPdfMarginTop] = useState(10)
  const [pdfMarginLeft, setPdfMarginLeft] = useState(10)
  const [pdfMarginBottom, setPdfMarginBottom] = useState(15)
  const [pdfMarginRight, setPdfMarginRight] = useState(10)

  // ── Preview zoom ──
  const [previewZoom, setPreviewZoom] = useState(100)

  // ── Page rulers ──
  const [showRulers, setShowRulers] = useState(true)
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(1123 * 10)

  useEffect(() => {
    const element = contentRef.current
    if (!element) return

    const syncHeight = () => setContentHeight(element.scrollHeight)
    syncHeight()

    const observer = new ResizeObserver(() => syncHeight())
    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  // ── Toggle contentEditable on edit mode ──
  useEffect(() => {
    const container = document.getElementById('pdf-content')
    if (!container) return
    container.querySelectorAll<HTMLElement>('.editable-block').forEach(el => {
      el.contentEditable = editMode ? 'true' : 'false'
      el.style.outline = editMode ? '1.5px dashed #3B82F6' : ''
      el.style.cursor = editMode ? 'text' : ''
      el.style.minHeight = editMode ? '1em' : ''
      el.style.backgroundColor = editMode ? 'rgba(59,130,246,0.04)' : ''
    })
  }, [editMode])

  async function handleExport() {
    setIsGenerating(true)
    setEditMode(false)
    try {
      await new Promise(r => setTimeout(r, 200))
      const filename = `NAABSA_BunkerSurvey_${report.vessel_name.replace(/\s+/g, '_')}_${report.ref_number}`
      await generatePdfFromElement('pdf-content', filename, [
        pdfMarginTop, pdfMarginLeft, pdfMarginBottom, pdfMarginRight,
      ])
      toast('success', 'PDF gerado — download iniciado')
    } catch {
      toast('error', 'Falha ao gerar PDF. Tente novamente.')
    } finally {
      setIsGenerating(false)
    }
  }

  const cssVars = {
    '--pdf-logo-h': `${logoHeight}px`,
    '--pdf-margin': `${pageMargin}px`,
    '--pdf-font-size': `${fontSize}px`,
    '--pdf-primary': primaryColor,
    '--pdf-line-h': String(lineHeight),
    '--pdf-para-sp': `${paraSpacing}px`,
    '--pdf-title-size': `${titleSize}px`,
    '--pdf-table-font': `${tableFontSize}px`,
    '--pdf-cell-pad': `${cellPadding}px`,
    '--pdf-title-mt': `${titleMarginTop}px`,
    '--pdf-title-mb': `${titleMarginBottom}px`,
    '--pdf-cover-photo-w': `${coverPhotoWidth}%`,
    '--pdf-cover-photo-h': `${coverPhotoHeight}px`,
    '--pdf-cover-photo-mb': `${coverPhotoMb}px`,
    '--pdf-cover-title-mt': `${coverTitleMt}px`,
    '--pdf-cover-title-mb': `${coverTitleMb}px`,
    '--pdf-cover-contacts-mt': `${coverContactsMt}px`,
  } as React.CSSProperties

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* Top bar */}
      <div className="no-print" style={{
        height: 52, background: 'var(--navy-900)', borderBottom: '2px solid var(--red-600)',
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16, flexShrink: 0,
      }}>
        <button
          onClick={() => router.back()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--navy-300)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 600 }}
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.15)' }} />
        <span style={{ color: 'var(--navy-100)', fontFamily: "'Barlow Semi Condensed', sans-serif", fontWeight: 700, fontSize: 'var(--text-md)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {report.vessel_name} — PDF Preview
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setShowRulers(r => !r)}
            title={showRulers ? 'Ocultar réguas de página' : 'Mostrar réguas de página'}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 4,
              border: `1px solid ${showRulers ? 'rgba(220,38,38,0.5)' : 'rgba(255,255,255,0.2)'}`,
              background: showRulers ? 'rgba(220,38,38,0.15)' : 'transparent',
              color: showRulers ? '#fca5a5' : 'rgba(255,255,255,0.6)', cursor: 'pointer',
              fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.06em',
            }}
          >
            {showRulers ? <Eye size={12} /> : <EyeOff size={12} />} Régua
          </button>
          <button
            onClick={() => setEditMode(e => !e)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 4,
              border: `1px solid ${editMode ? 'var(--red-600)' : 'rgba(255,255,255,0.2)'}`,
              background: editMode ? 'var(--red-600)' : 'transparent',
              color: '#fff', cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}
          >
            <Edit2 size={12} /> {editMode ? 'Edição Ativa' : 'Edição Direta'}
          </button>
          <button
            onClick={handleExport}
            disabled={isGenerating}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 4,
              background: 'var(--red-600)', color: '#fff', border: 'none', cursor: isGenerating ? 'not-allowed' : 'pointer',
              fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
              opacity: isGenerating ? 0.7 : 1,
            }}
          >
            {isGenerating
              ? <><span className="spinner" style={{ width: 12, height: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Gerando...</>
              : <><Download size={12} /> Gerar PDF</>
            }
          </button>
        </div>
      </div>

      {/* Body: sidebar + content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar */}
        <aside className="no-print" style={{
          width: 260, flexShrink: 0, background: 'var(--navy-900)',
          overflowY: 'auto', borderRight: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{ padding: '16px 20px 8px', color: 'rgba(255,255,255,0.35)', fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Controles de Layout
          </div>

          {/* Logo */}
          <Section title="Logo" icon={<ImageIcon size={12} />}>
            <Slider label="Altura da logo" value={logoHeight} min={12} max={80} onChange={setLogoHeight} />
          </Section>

          {/* Capa */}
          <Section title="Capa" icon={<LayoutTemplate size={12} />} defaultOpen={false}>
            <Slider label="Largura da foto" value={coverPhotoWidth} min={50} max={100} unit="%" onChange={setCoverPhotoWidth} />
            <Slider label="Altura da foto" value={coverPhotoHeight} min={150} max={550} onChange={setCoverPhotoHeight} />
            <Slider label="Espaço após foto" value={coverPhotoMb} min={4} max={80} onChange={setCoverPhotoMb} />
            <Slider label="Espaço acima do título" value={coverTitleMt} min={4} max={80} onChange={setCoverTitleMt} />
            <Slider label="Espaço abaixo do título" value={coverTitleMb} min={4} max={80} onChange={setCoverTitleMb} />
            <Slider label="Espaço antes dos contatos" value={coverContactsMt} min={4} max={300} onChange={setCoverContactsMt} />
          </Section>

          {/* Página */}
          <Section title="Página" icon={<Maximize size={12} />}>
            <Slider label="Margem interna" value={pageMargin} min={10} max={80} onChange={setPageMargin} />
          </Section>

          {/* Tipografia */}
          <Section title="Tipografia" icon={<Type size={12} />}>
            <Slider label="Tamanho base" value={fontSize} min={8} max={16} onChange={setFontSize} />
            <Slider label="Tamanho títulos" value={titleSize} min={11} max={24} onChange={setTitleSize} />
            <Slider label="Espaço acima do título" value={titleMarginTop} min={4} max={60} onChange={setTitleMarginTop} />
            <Slider label="Espaço abaixo do título" value={titleMarginBottom} min={2} max={24} onChange={setTitleMarginBottom} />
            <Slider label="Altura da linha" value={lineHeight} min={1.0} max={2.0} step={0.05} unit="" decimals={2} onChange={setLineHeight} />
            <Slider label="Espaço parágrafo" value={paraSpacing} min={0} max={40} onChange={setParaSpacing} />
          </Section>

          {/* Cor dos títulos */}
          <Section title="Cor dos títulos" icon={<Palette size={12} />}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <input
                type="color" value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                style={{ width: 36, height: 28, border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, cursor: 'pointer', background: 'none', padding: 2 }}
              />
              <span style={{ color: '#fff', fontSize: 'var(--text-xs)', fontFamily: 'monospace' }}>{primaryColor.toUpperCase()}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {['#003366', '#0A1628', '#1A3A5C', '#C8102E', '#1a1a1a'].map(c => (
                <button key={c} onClick={() => setPrimaryColor(c)} title={c} style={{
                  width: 22, height: 22, borderRadius: 3, background: c, cursor: 'pointer',
                  border: primaryColor === c ? '2px solid #fff' : '2px solid transparent',
                }} />
              ))}
            </div>
          </Section>

          {/* Tabelas */}
          <Section title="Tabelas" icon={<Table2 size={12} />} defaultOpen={false}>
            <Slider label="Fonte da tabela" value={tableFontSize} min={6} max={12} onChange={setTableFontSize} />
            <Slider label="Padding das células" value={cellPadding} min={1} max={6} onChange={setCellPadding} />
          </Section>

          {/* Quebras de página */}
          <Section title="Quebras de Página" icon={<Scissors size={12} />} defaultOpen={false}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'var(--text-xs)', lineHeight: 1.5, marginBottom: 12 }}>
              Desmarque para remover a quebra de página antes de cada seção.
            </p>
            {PAGE_BREAK_OPTIONS.map(([key, label]) => (
              <CheckboxToggle
                key={key}
                label={label}
                checked={activeBreaks.has(key)}
                onChange={on => toggleBreak(key, on)}
              />
            ))}
          </Section>

          {/* Margens do PDF */}
          <Section title="Margens do PDF" icon={<Ruler size={12} />} defaultOpen={false}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'var(--text-xs)', lineHeight: 1.5, marginBottom: 12 }}>
              Em milímetros. Afetam apenas o PDF exportado.
            </p>
            <Slider label="Superior" value={pdfMarginTop} min={0} max={30} unit="mm" onChange={setPdfMarginTop} />
            <Slider label="Inferior" value={pdfMarginBottom} min={0} max={30} unit="mm" onChange={setPdfMarginBottom} />
            <Slider label="Esquerda" value={pdfMarginLeft} min={0} max={30} unit="mm" onChange={setPdfMarginLeft} />
            <Slider label="Direita" value={pdfMarginRight} min={0} max={30} unit="mm" onChange={setPdfMarginRight} />
          </Section>

          {/* Zoom do preview */}
          <Section title="Zoom do Preview" icon={<ZoomIn size={12} />} defaultOpen={false}>
            <Slider label="Zoom" value={previewZoom} min={50} max={150} unit="%" onChange={setPreviewZoom} />
            <button
              onClick={() => setPreviewZoom(100)}
              style={{
                width: '100%', marginTop: 2, padding: '5px 0', borderRadius: 3, cursor: 'pointer',
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.6)', fontSize: 'var(--text-xs)',
              }}
            >
              Resetar 100%
            </button>
          </Section>

          {/* Edição de texto */}
          <Section title="Edição de Texto" icon={<Edit2 size={12} />} defaultOpen={false}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'var(--text-xs)', lineHeight: 1.6, marginBottom: 10 }}>
              Ative a edição direta para clicar e editar qualquer texto, tabela ou título do PDF antes de exportar.
            </p>
            <button
              onClick={() => setEditMode(e => !e)}
              style={{
                width: '100%', padding: '8px 0', borderRadius: 4, cursor: 'pointer',
                background: editMode ? 'var(--red-600)' : 'rgba(255,255,255,0.08)',
                border: `1px solid ${editMode ? 'var(--red-600)' : 'rgba(255,255,255,0.15)'}`,
                color: '#fff', fontSize: 'var(--text-xs)', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Edit2 size={11} /> {editMode ? 'Desativar edição' : 'Ativar edição'}
            </button>
          </Section>

          {/* Export button */}
          <div style={{ padding: '20px' }}>
            <button
              onClick={handleExport}
              disabled={isGenerating}
              style={{
                width: '100%', padding: '10px 0', borderRadius: 4,
                background: 'var(--red-600)', color: '#fff', border: 'none',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                fontSize: 'var(--text-sm)', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: isGenerating ? 0.7 : 1,
              }}
            >
              {isGenerating
                ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Gerando PDF...</>
                : <><Download size={14} /> Gerar PDF ▶</>
              }
            </button>
          </div>
        </aside>

        {/* PDF preview area with zoom support */}
        <main style={{ flex: 1, overflowY: 'auto', background: '#CBD5E1', padding: '40px' }}>
          <div style={{
            width: 794,
            margin: '0 auto',
            position: 'relative',
            height: `${Math.round(contentHeight * previewZoom / 100)}px`,
          }}>
            {/* Scaled PDF content — captured by html2pdf via #pdf-content inside */}
            <div
              ref={contentRef}
              style={{
                ...cssVars,
                width: 794,
                background: '#fff',
                boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
                transform: `scale(${previewZoom / 100})`,
                transformOrigin: 'top left',
                position: 'absolute',
                top: 0,
                left: 0,
              }}
            >
              <PdfTemplate report={report} activeBreaks={activeBreaks} />
            </div>

            {/* Page break rulers — outside #pdf-content, never captured by html2pdf */}
            {showRulers && Array.from({ length: 20 }, (_, i) => i + 1).map(n => {
              const yPx = Math.round(n * 1123 * previewZoom / 100)
              if (yPx > Math.round(contentHeight * previewZoom / 100)) return null
              return (
                <div key={n} style={{
                  position: 'absolute',
                  top: yPx,
                  left: 0,
                  right: 0,
                  pointerEvents: 'none',
                  zIndex: 20,
                }}>
                  {/* Dashed line */}
                  <div style={{
                    borderTop: '2px dashed rgba(220,38,38,0.7)',
                    width: '100%',
                  }} />
                  {/* Label — left side */}
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: -18,
                    background: 'rgba(220,38,38,0.85)',
                    color: '#fff',
                    fontSize: 9,
                    fontFamily: 'sans-serif',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '3px 3px 0 0',
                    letterSpacing: '0.04em',
                    whiteSpace: 'nowrap',
                  }}>
                    ✂ pág. {n + 1}
                  </div>
                  {/* Faint red band showing the danger zone (±20px around cut) */}
                  <div style={{
                    position: 'absolute',
                    top: -12,
                    left: 0,
                    right: 0,
                    height: 24,
                    background: 'rgba(220,38,38,0.06)',
                    pointerEvents: 'none',
                  }} />
                </div>
              )
            })}
          </div>
        </main>

      </div>
    </div>
  )
}
