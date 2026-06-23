import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGlow } from '../styles/glow';

const pad = (n) => String(n).padStart(2, '0');
const parse = (value) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  return { year: m ? Number(m[1]) : '', month: m ? Number(m[2]) : '', day: m ? Number(m[3]) : '' };
};

// Birth-date picker: Day / Month / Year dropdowns with localized month names
// (via Intl, so EN/KA need no extra strings). Far easier than a native date
// input for dates decades in the past — no month-by-month clicking. Emits an
// ISO `YYYY-MM-DD` string (or '' until all three are picked) so the backend
// contract is unchanged. Partial picks are held in local state — deriving the
// dropdowns from `value` alone would discard a year/month chosen before the
// others, so no single dropdown could ever "stick".
export default function DateOfBirthPicker({ value, onChange }) {
  const { T } = useGlow();
  const { t, i18n } = useTranslation('storefront');
  const lang = i18n.language === 'ka' ? 'ka' : 'en';

  const [sel, setSel] = useState(() => parse(value));
  const { year, month, day } = sel;

  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 120 }, (_, i) => thisYear - i);
  const monthFmt = new Intl.DateTimeFormat(lang, { month: 'long' });
  const months = Array.from({ length: 12 }, (_, i) => ({ n: i + 1, label: monthFmt.format(new Date(2020, i, 1)) }));
  const daysInMonth = year && month ? new Date(year, month, 0).getDate() : 31;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const emit = (y, mo, d) => {
    // Clamp the day to the chosen month (e.g. 31 → Feb) so it stays valid.
    const dd = y && mo && d ? Math.min(d, new Date(y, mo, 0).getDate()) : d;
    setSel({ year: y, month: mo, day: dd });
    onChange(y && mo && dd ? `${y}-${pad(mo)}-${pad(dd)}` : '');
  };

  const box = (filled) => ({
    padding: '12px 14px', borderRadius: 12, border: `1px solid ${T.border}`,
    background: T.dark ? T.surface2 : '#fff', color: filled ? T.text : T.textMute,
    font: `500 14px ${T.font}`, outline: 'none', width: '100%',
    appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', cursor: 'pointer',
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1.1fr', gap: 8 }}>
      <select aria-label={t('dob.day')} value={day || ''} onChange={(e) => emit(year, month, Number(e.target.value))} style={box(!!day)}>
        <option value="">{t('dob.day')}</option>
        {days.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
      <select aria-label={t('dob.month')} value={month || ''} onChange={(e) => emit(year, Number(e.target.value), day)} style={box(!!month)}>
        <option value="">{t('dob.month')}</option>
        {months.map((mo) => <option key={mo.n} value={mo.n}>{mo.label}</option>)}
      </select>
      <select aria-label={t('dob.year')} value={year || ''} onChange={(e) => emit(Number(e.target.value), month, day)} style={box(!!year)}>
        <option value="">{t('dob.year')}</option>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}
