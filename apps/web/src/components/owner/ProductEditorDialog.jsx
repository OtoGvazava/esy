import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGlow } from '../../styles/glow';
import { Icon } from '../glow/GlowPrimitives';
import { productApi, handleApiError } from '../../utils/api';
import VariantEditor from './VariantEditor';
import GlowModal from './GlowModal';
import MarkdownField from './MarkdownField';
import { glowField, glowLabel, glowPrimaryBtn, glowGhostBtn, glowError } from './glowForm';

const EMPTY = { title: '', description: '', price: '', quantity: '' };

// Glow-styled product add/edit form (matches the store's CreateStore look) +
// a DB-backed photo gallery. No external image URL — photos are uploaded.
export default function ProductEditorDialog({ open, product, onClose, onSaved }) {
  // Whether this product uses variants — reported up by the editor below so
  // the quantity field can lock itself (D11).
  const [hasVariants, setHasVariants] = useState(false);
  const { t } = useTranslation(['owner', 'common']);
  const { T } = useGlow();
  const isEdit = Boolean(product);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');

  const [existing, setExisting] = useState([]); // [{id,url}]
  const [staged, setStaged] = useState([]); // [{ file, preview }]
  const [imgBusy, setImgBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setErrors({});
    setApiError('');
    setStaged([]);
    if (product) {
      setForm({
        title: product.title || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        quantity: (product.quantity ?? product.stock ?? '').toString(),
      });
      setExisting(product.imageList || []);
    } else {
      setForm(EMPTY);
      setExisting([]);
    }
    return undefined;
  }, [product, open]);

  useEffect(() => () => staged.forEach((s) => URL.revokeObjectURL(s.preview)), [staged]);

  const set = (field) => (e) => {
    const { value } = e.target;
    setForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: '' }));
  };

  const pickFiles = (e) => {
    const chosen = Array.from(e.target.files || []);
    setStaged((prev) => [
      ...prev,
      ...chosen.map((file) => ({ file, preview: URL.createObjectURL(file) })),
    ]);
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
      onSaved?.();
    } catch (err) {
      setApiError(handleApiError(err, t('imageDeleteFailed')));
    } finally {
      setImgBusy(false);
    }
  };

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = t('errTitle');
    const price = parseFloat(form.price);
    if (!form.price || Number.isNaN(price) || price <= 0) next.price = t('errPrice');
    const qty = parseInt(form.quantity, 10);
    if (form.quantity === '' || Number.isNaN(qty) || qty < 0) next.quantity = t('errQuantity');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (saving || !validate()) return;
    setSaving(true);
    setApiError('');
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      price: parseFloat(form.price),
      quantity: parseInt(form.quantity, 10),
    };
    try {
      const saved = isEdit
        ? await productApi.update(product.id, payload)
        : await productApi.create(payload);
      if (staged.length) {
        await productApi.uploadImages(saved.id, staged.map((s) => s.file));
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      setApiError(handleApiError(err, t('saveFailed')));
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || imgBusy;

  const fieldWrap = (key, label, node) => (
    <div>
      <div style={glowLabel(T)}>{label}</div>
      {node}
      {errors[key] && (
        <div style={{ marginTop: 6, font: `500 11.5px ${T.font}`, color: T.danger }}>{errors[key]}</div>
      )}
    </div>
  );

  const thumb = {
    width: 76, height: 76, borderRadius: 12, objectFit: 'cover',
    border: `1px solid ${T.border}`, display: 'block',
  };
  const thumbX = {
    position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: '50%',
    border: `1px solid ${T.border}`, background: T.bg, color: T.text, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
  };

  const footer = (
    <>
      <button onClick={onClose} disabled={busy} style={glowGhostBtn(T, busy)}>
        {t('cancel', { ns: 'common', defaultValue: 'Cancel' })}
      </button>
      <button onClick={submit} disabled={busy} style={glowPrimaryBtn(T, busy)}>
        {saving ? t('saving') : t('save')}
      </button>
    </>
  );

  return (
    <GlowModal
      open={open}
      title={isEdit ? t('editTitle') : t('addTitle')}
      onClose={onClose}
      busy={busy}
      footer={footer}
    >
      {apiError && <div style={glowError(T)}>{apiError}</div>}

      {fieldWrap('title', t('fieldTitle'), (
        <input value={form.title} onChange={set('title')} style={glowField(T)} />
      ))}

      {fieldWrap('description', t('fieldDescription'), (
        <MarkdownField
          value={form.description}
          onChange={(v) => {
            setForm((p) => ({ ...p, description: v }));
            if (errors.description) setErrors((p) => ({ ...p, description: '' }));
          }}
          rows={5}
        />
      ))}

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          {fieldWrap('price', t('fieldPrice'), (
            <input
              type="number" min="0" step="0.01" value={form.price}
              onChange={set('price')} style={glowField(T)}
            />
          ))}
        </div>
        <div style={{ flex: 1 }}>
          {fieldWrap('quantity', t('fieldQuantity'), (
            <input
              type="number" min="0" step="1" value={form.quantity}
              // Once a product has variants its stock is the sum of the
              // combinations (D11), so editing it here would be overwritten by
              // the next variant save. Disabled rather than hidden: the number
              // is still worth seeing.
              disabled={hasVariants}
              title={hasVariants ? t('variants.quantityLocked') : undefined}
              onChange={set('quantity')} style={glowField(T)}
            />
          ))}
          {hasVariants && (
            <div style={{ marginTop: 6, font: `500 11.5px ${T.font}`, color: T.textMute }}>
              {t('variants.quantityLocked')}
            </div>
          )}
        </div>
      </div>

      {/* Variants live below the basics: they only make sense once the product
          has a title and a base price for a row to fall back to. */}
      <div style={{ paddingTop: 4 }}>
        <VariantEditor
          T={T}
          productId={product?.id}
          basePrice={form.price}
          onChanged={setHasVariants}
        />
      </div>

      <div>
        <div style={glowLabel(T)}>{t('imagesTitle')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
          {existing.map((img) => (
            <div key={img.id} style={{ position: 'relative' }}>
              <img src={img.url} alt="" style={thumb} />
              <button
                onClick={() => removeExisting(img.id)} disabled={busy}
                style={thumbX} aria-label={t('removeImage')}
              ><Icon.close /></button>
            </div>
          ))}
          {staged.map((s, i) => (
            <div key={s.preview} style={{ position: 'relative' }}>
              <img src={s.preview} alt="" style={{ ...thumb, opacity: 0.65 }} />
              <button
                onClick={() => unstage(i)} disabled={busy}
                style={thumbX} aria-label={t('removeImage')}
              ><Icon.close /></button>
            </div>
          ))}
        </div>
        <input
          ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif"
          multiple hidden onChange={pickFiles}
        />
        <button
          onClick={() => fileRef.current?.click()} disabled={busy}
          style={{ ...glowGhostBtn(T, busy), height: 44 }}
        >
          + {t('addImages')}
        </button>
        <div style={{ marginTop: 8, font: `500 11.5px ${T.font}`, color: T.textMute }}>
          {t('imagesHint')}
        </div>
      </div>
    </GlowModal>
  );
}
