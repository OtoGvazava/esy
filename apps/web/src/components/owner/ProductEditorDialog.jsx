// Adding or editing a product (the design's P2): a page of its own in the back
// office, drawn in place of the product list.
//
// Left, what the product is: its photos (the first is the one the store
// shows), name, description and category. Right, what it sells for: the base
// price with esy's fee and what is left per piece, the variants with their
// stock, and deleting it. One Save at the foot sends everything — the fields,
// the new photos, and stock typed into the variant matrix.
//
// The board also has a "visible in the store" switch. Products have no such
// flag (every saved product is on sale), so it is not offered. Its "New"
// badge switch is drawn as what it really is: automatic, for 14 days after a
// product is added.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTK } from '../../core/useTK';
import { useDevice } from '../../contexts/DeviceContext';
import { money, feeOf, FEE_PERCENT } from '../../core/money';
import { productApi, handleApiError } from '../../utils/api';
import VariantEditor from './VariantEditor';
import MarkdownField from './MarkdownField';
import CategoryField from './CategoryField';
import DeleteProductDialog from './DeleteProductDialog';
import {
  Alert, Chip, G, Glyph, PageHead, btn, card, fld, input, kv, type, useFocusRing,
} from '../../manager/officeKit';

const EMPTY = { title: '', description: '', price: '', quantity: '', category: '' };
const NEW_DAYS = 14;
const LARI = '₾';

/** "95.5" → "95,50" in Georgian, "95.50" in English: how the field shows a price. */
const showPrice = (v, lang) => {
  if (v === '' || v == null || Number.isNaN(Number(v))) return '';
  const s = Number(v).toFixed(2);
  return lang === 'ka' ? s.replace('.', ',') : s;
};
const readPrice = (s) => {
  const v = String(s || '').trim().replace(/\s/g, '').replace(',', '.');
  return /^\d+(\.\d{1,2})?$/.test(v) ? Number(v) : NaN;
};

export default function ProductEditorDialog({ open, product, onClose, onSaved }) {
  const { t, i18n } = useTranslation(['owner', 'common']);
  const lang = i18n.language;
  const { T } = useTK();
  const { isMobile, isDesktop } = useDevice();
  const isEdit = Boolean(product);

  const initial = useMemo(() => (product ? {
    title: product.title || '',
    description: product.description || '',
    price: showPrice(product.price, lang),
    quantity: String(product.quantity ?? product.stock ?? ''),
    category: product.category || '',
  } : EMPTY), [product, lang]);

  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');
  const [existing, setExisting] = useState(product?.imageList || []);
  const [staged, setStaged] = useState([]);
  const [imgBusy, setImgBusy] = useState(false);
  const [variants, setVariants] = useState(null);
  const [variantsDirty, setVariantsDirty] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef(null);
  const saveVariants = useRef(null);
  const [priceFocus, priceRing] = useFocusRing();
  const [titleFocus, titleRing] = useFocusRing();
  const [qtyFocus, qtyRing] = useFocusRing();

  useEffect(() => {
    if (!open) return;
    setForm(initial);
    setErrors({});
    setApiError('');
    setStaged([]);
    setExisting(product?.imageList || []);
  }, [open, initial, product]);

  useEffect(() => () => staged.forEach((s) => URL.revokeObjectURL(s.preview)), [staged]);

  if (!open) return null;

  const busy = saving || imgBusy;
  const dirty = staged.length > 0 || variantsDirty
    || Object.keys(EMPTY).some((k) => String(form[k] ?? '') !== String(initial[k] ?? ''));

  const set = (field) => (e) => {
    const { value } = e.target;
    setForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: '' }));
  };

  const pickFiles = (e) => {
    const chosen = Array.from(e.target.files || []);
    setStaged((prev) => [...prev, ...chosen.map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
    e.target.value = '';
  };
  const unstage = (idx) => {
    setStaged((prev) => {
      const s = prev[idx];
      if (s) URL.revokeObjectURL(s.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };
  const removeExisting = async (imageId) => {
    if (imgBusy || !product) return;
    setImgBusy(true);
    setApiError('');
    try {
      const updated = await productApi.deleteImage(product.id, imageId);
      setExisting(updated.imageList || []);
    } catch (err) {
      setApiError(handleApiError(err, t('imageDeleteFailed')));
    } finally {
      setImgBusy(false);
    }
  };

  const hasVariants = !!variants;
  const price = readPrice(form.price);

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = t('errTitle');
    if (!form.price || Number.isNaN(price) || price <= 0) next.price = t('errPrice');
    const qty = parseInt(form.quantity, 10);
    if (!hasVariants && (form.quantity === '' || Number.isNaN(qty) || qty < 0)) next.quantity = t('errQuantity');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (busy || !validate()) return;
    setSaving(true);
    setApiError('');
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      price,
      // With variants the server sums the combinations; the number sent is
      // the one on screen, which is that sum.
      quantity: hasVariants ? variants.rows.reduce((s, r) => s + (Number(r.stock) || 0), 0) : parseInt(form.quantity, 10),
      // Always sent: '' is how the merchant takes a product out of its category.
      category: form.category.trim(),
    };
    try {
      const saved = isEdit ? await productApi.update(product.id, payload) : await productApi.create(payload);
      if (staged.length) await productApi.uploadImages(saved.id, staged.map((s) => s.file));
      if (saveVariants.current) await saveVariants.current();
      onSaved?.(saved);
    } catch (err) {
      setApiError(handleApiError(err, t('saveFailed')));
    } finally {
      setSaving(false);
    }
  };

  // ---- the price card's figures
  const rate = FEE_PERCENT;
  const fee = Number.isFinite(price) ? feeOf(price) : null;
  const ownPrices = hasVariants ? variants.rows.filter((r) => r.price != null && r.price !== '').length : 0;
  const pct = String(rate).replace('.', lang === 'ka' ? ',' : '.');

  // ---- the New badge: automatic, for NEW_DAYS after the product was added
  const created = product?.createdAt ? new Date(product.createdAt) : null;
  const daysLeft = created ? Math.ceil((created.getTime() + NEW_DAYS * 86400000 - Date.now()) / 86400000) : NEW_DAYS;

  const photos = [
    ...existing.map((img) => ({ key: `e${img.id}`, url: img.url, remove: () => removeExisting(img.id) })),
    ...staged.map((s, i) => ({ key: s.preview, url: s.preview, fresh: true, remove: () => unstage(i) })),
  ];

  const tile = {
    position: 'relative', aspectRatio: '1 / 1', borderRadius: 'var(--k-r-img)', overflow: 'hidden',
    background: 'var(--k-ph2)', display: 'grid', placeItems: 'center', minWidth: 0,
  };
  const err = (k) => errors[k] && <span role="alert" style={{ font: `400 12.5px ${T.font}`, color: T.danger }}>{errors[k]}</span>;

  const title = isEdit ? (form.title.trim() || product.title) : t('editor.titleNew');
  const gap = isMobile ? 14 : isDesktop ? 20 : 18;

  return (
    // At least the screen's height, so a short form still has its save bar
    // at the foot of the screen (the page's padding is the shell's).
    <div style={{
      display: 'flex', flexDirection: 'column', gap,
      minHeight: isMobile ? undefined : `calc(100vh - ${isDesktop ? 60 : 48}px)`,
    }}>
      <PageHead
        T={T} mobile={isMobile} onBack={() => { if (!busy) onClose?.(); }} backLabel={t('editor.back')}
        title={title} sub={isEdit ? t('editor.subEdit') : t('editor.subAdd')}
      />
      {apiError && <Alert T={T} tone="bad" role="alert">{apiError}</Alert>}

      <div style={{
        display: 'grid', gap: 20, alignItems: 'start',
        gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div style={{ ...card(T, 16), display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 style={type.h3(T)}>{t('imagesTitle')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
              {photos.map((p, i) => (
                <span key={p.key} style={{ ...tile, boxShadow: i === 0 ? `0 0 0 2px ${T.accent}` : 'none' }}>
                  <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: p.fresh ? 0.7 : 1 }} />
                  {i === 0 && (
                    <span style={{
                      position: 'absolute', top: 6, left: 6, height: 20, padding: '0 6px', lineHeight: '20px',
                      borderRadius: 'var(--k-r-pill)', background: T.accent, color: T.onAccent, font: `700 10.5px/20px ${T.font}`,
                    }}>{t('editor.main')}</span>
                  )}
                  {/* Bottom right, clear of the "main" tag on a small tile. */}
                  <button
                    type="button" onClick={p.remove} disabled={busy} aria-label={t('removeImage')}
                    style={{
                      position: 'absolute', bottom: 4, right: 4, width: 26, height: 26, padding: 0, border: 0, borderRadius: '50%',
                      background: 'rgba(10,10,14,.66)', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center',
                    }}
                  ><Glyph size={13}>{G.close}</Glyph></button>
                </span>
              ))}
              <label style={{
                ...tile, background: T.surface, border: `2px dashed ${T.border}`, boxSizing: 'border-box',
                color: T.textDim, cursor: busy ? 'default' : 'pointer', gap: 4, alignContent: 'center',
              }}>
                <Glyph>{G.plus}</Glyph>
                <span style={{ font: `400 12px ${T.font}` }}>{t('editor.addPhoto')}</span>
                <input
                  ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple disabled={busy}
                  aria-label={t('editor.addPhotoLabel')} onChange={pickFiles}
                  style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
                />
              </label>
            </div>
            <span style={{ font: `400 12px ${T.font}`, color: T.textDim }}>{t('imagesHint')}</span>
          </div>

          <div style={{ ...card(T, 16), display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={fld(T)}>
              {t('editor.name')}
              <input value={form.title} onChange={set('title')} disabled={busy} {...titleRing}
                aria-invalid={errors.title ? 'true' : undefined}
                style={input(T, { focus: titleFocus, error: !!errors.title })} />
              {err('title')}
            </label>
            <div style={fld(T)}>
              <span>{t('fieldDescription')}</span>
              <MarkdownField
                value={form.description} rows={4}
                onChange={(v) => setForm((p) => ({ ...p, description: v }))}
              />
            </div>
            <div style={fld(T)}>
              <span>{t('category.label')}</span>
              <CategoryField
                T={T} value={form.category} disabled={busy} refresh={open}
                onChange={(v) => setForm((p) => ({ ...p, category: v }))}
              />
            </div>
          </div>

          <div style={{ ...card(T, 0), overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', minHeight: 56, boxSizing: 'border-box' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: 'block', font: `600 12.5px/1.4 ${T.font}` }}>{t('editor.newBadge')}</b>
                <div style={{ font: `400 12px/1.4 ${T.font}`, color: T.textDim }}>{t('editor.newBadgeSub', { days: NEW_DAYS })}</div>
              </div>
              <Chip T={T} name={daysLeft > 0 ? 'done' : 'canc'} dot={false}>
                {!created ? t('editor.newFromSave', { count: NEW_DAYS })
                  : daysLeft > 0 ? t('editor.newLeft', { count: daysLeft }) : t('editor.newOver')}
              </Chip>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div style={{ ...card(T, 16), display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={fld(T)}>
              {t('editor.basePrice')}
              <span style={{
                ...input(T, { focus: priceFocus, error: !!errors.price }), display: 'flex', alignItems: 'center', padding: 0, overflow: 'hidden',
              }}>
                <input
                  value={form.price} onChange={set('price')} inputMode="decimal" disabled={busy}
                  aria-label={t('editor.basePriceLabel')} aria-invalid={errors.price ? 'true' : undefined} {...priceRing}
                  style={{
                    flex: 1, minWidth: 0, height: '100%', border: 0, outline: 'none', background: 'transparent',
                    padding: '0 4px 0 15px', color: T.text, font: `400 15px ${T.font}`,
                  }}
                />
                <span style={{ padding: '0 14px', color: T.textDim }}>{LARI}</span>
              </span>
              {err('price')}
            </label>
            {hasVariants && Number.isFinite(price) && (
              <span style={{ font: `400 12px/1.45 ${T.font}`, color: T.textDim }}>
                {ownPrices === 0
                  ? t('editor.samePrice', { price: money(price) })
                  : t('editor.ownPrice', { count: ownPrices, price: money(price) })}
              </span>
            )}
            {!hasVariants && (
              <label style={fld(T)}>
                {t('editor.stock')}
                <input value={form.quantity} onChange={set('quantity')} inputMode="numeric" disabled={busy}
                  aria-invalid={errors.quantity ? 'true' : undefined} {...qtyRing}
                  style={input(T, { focus: qtyFocus, error: !!errors.quantity })} />
                {err('quantity')}
              </label>
            )}
            <div style={{ ...kv, font: `400 12.5px ${T.font}` }}>
              <span style={{ color: T.textDim }}>{t('editor.fee', { pct })}</span>
              <span style={type.price}>{fee == null ? '—' : money(fee)}</span>
            </div>
            <div style={{ ...kv, font: `400 12.5px ${T.font}` }}>
              <span style={{ color: T.textDim }}>{t('editor.keep')}</span>
              <b style={type.price}>{fee == null ? '—' : money(price - fee)}</b>
            </div>
          </div>

          <VariantEditor
            T={T} productId={product?.id} basePrice={Number.isFinite(price) ? price : product?.price}
            onChanged={setVariants} onDirty={setVariantsDirty} saveRef={saveVariants} disabled={busy}
          />

          {isEdit && (
            <button type="button" onClick={() => setDeleting(true)} disabled={busy}
              style={{ ...btn(T, 'd', { size: 'sm' }), alignSelf: 'flex-start' }}>
              <Glyph>{G.trash}</Glyph>{t('editor.delete')}
            </button>
          )}
        </div>
      </div>

      {/* The save bar stays at the foot of the screen while the page
          scrolls. On a phone it runs under the floating tab bar, as the board
          draws it, with its buttons just above the bar; the spacer keeps the
          last card clear of it. */}
      {isMobile && <div aria-hidden="true" style={{ height: 90 }} />}
      <div role="region" aria-label={t('editor.saveRegion')} style={{
        position: isMobile ? 'fixed' : 'sticky', bottom: 0, zIndex: 30, display: 'flex', alignItems: 'center', gap: 12,
        ...(isMobile ? { left: 0, right: 0 } : { marginTop: 'auto', marginLeft: isDesktop ? -30 : -20, marginRight: isDesktop ? -30 : -20, marginBottom: isDesktop ? -34 : -28 }),
        padding: isMobile ? '10px 12px 88px' : isDesktop ? '14px 32px' : '12px 24px',
        background: 'var(--k-hd-bg)', borderTop: `1px solid ${T.border}`,
      }}>
        {!isMobile && (
          <>
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', flex: 'none', background: dirty ? T.warn : T.border }} />
            <span style={{ flex: 1, minWidth: 0, font: `400 12.5px ${T.font}`, color: T.textDim }}>
              {dirty ? t('editor.unsaved') : t('editor.saved')}
            </span>
          </>
        )}
        <button type="button" onClick={() => onClose?.()} disabled={busy} style={btn(T, 'g', { block: isMobile })}>
          {t('editor.cancel')}
        </button>
        <button type="button" onClick={submit} disabled={busy} style={{ ...btn(T, 'p', { block: isMobile }), opacity: saving ? 0.7 : 1 }}>
          {saving ? t('saving') : t('save')}
        </button>
      </div>

      <DeleteProductDialog
        open={deleting}
        product={product}
        onClose={() => setDeleting(false)}
        onDeleted={() => { setDeleting(false); onSaved?.(null); }}
      />
    </div>
  );
}
