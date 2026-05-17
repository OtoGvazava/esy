import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGlow } from '../../styles/glow';
import { productApi, handleApiError } from '../../utils/api';
import GlowModal from './GlowModal';
import { glowGhostBtn, glowError } from './glowForm';

export default function DeleteProductDialog({ open, product, onClose, onDeleted }) {
  const { t } = useTranslation(['owner', 'common']);
  const { T } = useGlow();
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => { if (open) setApiError(''); }, [open]);

  const confirm = async () => {
    if (busy || !product) return;
    setBusy(true);
    setApiError('');
    try {
      await productApi.remove(product.id);
      onDeleted?.(product);
      onClose?.();
    } catch (err) {
      setApiError(handleApiError(err, t('deleteFailed')));
    } finally {
      setBusy(false);
    }
  };

  const dangerBtn = {
    height: 50, padding: '0 22px', borderRadius: 14, border: 'none',
    background: T.danger, color: '#fff', font: `700 14px ${T.font}`,
    cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1,
  };

  const footer = (
    <>
      <button onClick={onClose} disabled={busy} style={glowGhostBtn(T, busy)}>
        {t('cancel', { ns: 'common', defaultValue: 'Cancel' })}
      </button>
      <button onClick={confirm} disabled={busy} style={dangerBtn}>
        {busy ? t('deleting') : t('deleteConfirm')}
      </button>
    </>
  );

  return (
    <GlowModal open={open} title={t('deleteTitle')} onClose={onClose} busy={busy} footer={footer}>
      {apiError && <div style={glowError(T)}>{apiError}</div>}
      <div style={{ font: `400 14px/1.55 ${T.font}`, color: T.textDim }}>
        {t('deleteBody', { title: product?.title || '' })}
      </div>
    </GlowModal>
  );
}
