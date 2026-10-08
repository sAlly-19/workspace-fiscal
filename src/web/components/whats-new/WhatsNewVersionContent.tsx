import type { AppVersion, VersionBulletPoint } from './whatsNewData';
import { WHATS_NEW_VERSIONS } from './whatsNewData';

interface WhatsNewVersionContentProps {
  version: AppVersion;
  isLight: boolean;
}

function renderBulletText(bullet: VersionBulletPoint) {
  if (bullet.text.includes('(pro-rata die)')) {
    const [before, after] = bullet.text.split('(pro-rata die)');
    return (
      <>
        {before}(<i>pro-rata die</i>){after}
      </>
    );
  }
  if (bullet.text.includes('.zip') && bullet.text.includes('arquivos .zip com')) {
    const [before, after] = bullet.text.split('.zip');
    return (
      <>
        {before}
        <code>.zip</code>
        {after}
      </>
    );
  }
  return bullet.text;
}

export function WhatsNewVersionContent({ version, isLight }: WhatsNewVersionContentProps) {
  const currentSection = WHATS_NEW_VERSIONS.find((v) => v.id === version);

  if (!currentSection) return null;

  return (
    <>
      {currentSection.cards.map((card) => {
        const Icon = card.icon;
        const [lightHover, darkHoverRaw] = card.hoverBorderClasses.split(' ');
        const darkHover = darkHoverRaw ? darkHoverRaw.replace('dark:', '') : '';
        const spacingClass = card.id.startsWith('2.5.1') ? 'space-y-1' : 'space-y-1.5';

        return (
          <div
            key={card.id}
            className={`p-4 rounded-xl border transition-all ${
              isLight
                ? `bg-[#f8fafc] border-[#e2e8f0] ${lightHover}`
                : `bg-[#111114] border-[#27272a] ${darkHover}`
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-lg ${card.iconClasses} flex items-center justify-center shrink-0 mt-0.5`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className={`${spacingClass} flex-1`}>
                <h3 className="font-bold text-sm flex items-center justify-between">
                  <span>{card.title}</span>
                  <span
                    className={`text-[10px] font-semibold ${card.badgeClasses} uppercase tracking-wider`}
                  >
                    {card.badgeText}
                  </span>
                </h3>
                <p
                  className={`text-xs leading-relaxed ${
                    isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'
                  }`}
                >
                  {card.description}
                </p>
                {card.bullets && card.bullets.length > 0 && (
                  <ul
                    className={`list-disc list-inside text-[11px] space-y-1 ${
                      isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'
                    }`}
                  >
                    {card.bullets.map((bullet, idx) => {
                      const hasTrailingSpace = bullet.boldPrefix?.endsWith(' ');
                      const cleanPrefix = hasTrailingSpace
                        ? bullet.boldPrefix?.slice(0, -1)
                        : bullet.boldPrefix;

                      return (
                        <li key={idx}>
                          {cleanPrefix && <b>{cleanPrefix}</b>}
                          {hasTrailingSpace ? ' ' : ''}
                          {renderBulletText(bullet)}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

