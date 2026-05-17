import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '../contexts/ThemeModeContext';
import { useGlow } from '../styles/glow';
import { Icon, LANGS } from '../components/glow/GlowPrimitives';
import { GlowScreen } from '../components/glow/GlowChrome';

export default function LanguageSettings() {
  const { T } = useGlow();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('storefront');
  const { language, setLanguage } = useThemeMode();
  const current = language || i18n.language || 'en';

  const pick = (code) => {
    setLanguage?.(code);          // persists via useAppTheme
    i18n.changeLanguage(code);    // applies live (the old Header used to do this)
    navigate(-1);
  };

  return (
    <GlowScreen T={T} padBottom={120}>
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
          <span style={{ width: 38, height: 4, borderRadius: 999, background: T.border }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 6px' }}>
          <span onClick={() => navigate(-1)} style={{ font: `500 13px ${T.font}`, color: T.textDim, cursor: 'pointer' }}>{t('settings.cancel')}</span>
          <span style={{ font: `700 15px ${T.font}`, color: T.text, letterSpacing: '-0.01em' }}>{t('languageSettings.title')}</span>
          <span onClick={() => navigate(-1)} style={{ font: `700 13px ${T.font}`, color: T.accentFg, cursor: 'pointer' }}>{t('settings.done')}</span>
        </div>
        <div style={{ padding: '6px 22px 16px', font: `400 12.5px/1.5 ${T.font}`, color: T.textDim }}>
          {t('languageSettings.note')}
        </div>

        <div style={{ padding: '0 12px 24px' }}>
          {LANGS.map((l) => {
            const active = l.code === current;
            return (
              <div
                key={l.code}
                onClick={() => pick(l.code)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 12px',
                  borderRadius: 12, background: active ? T.accentBg : 'transparent', cursor: 'pointer',
                }}
              >
                <span style={{
                  width: 38, height: 38, borderRadius: 12,
                  background: active ? T.accent : T.surface, color: active ? '#fff' : T.text,
                  border: active ? 'none' : `1px solid ${T.border}`,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  font: `800 12px ${T.mono}`, letterSpacing: '0.02em',
                }}>{l.short}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: `600 14px ${T.font}`, color: T.text, letterSpacing: '-0.01em' }}>{l.native}</div>
                </div>
                {active ? (
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: T.accent, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon.check /></span>
                ) : (
                  <span style={{ width: 22, height: 22, borderRadius: '50%', border: `1.5px solid ${T.borderStr}` }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </GlowScreen>
  );
}
