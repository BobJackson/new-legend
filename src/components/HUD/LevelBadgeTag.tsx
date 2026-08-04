import React from 'react';
import { getLevelBadge } from '../../utils/levelBadge';

interface LevelBadgeTagProps {
  level: number;
  showName?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LevelBadgeTag: React.FC<LevelBadgeTagProps> = ({
  level,
  showName = true,
  size = 'md',
  className = ''
}) => {
  const badge = getLevelBadge(level);

  let py = 'py-0.5';
  let px = 'px-2';
  let textSize = 'text-[11px]';
  let iconSize = 'text-xs';

  if (size === 'sm') {
    py = 'py-0';
    px = 'px-1.5';
    textSize = 'text-[10px]';
    iconSize = 'text-[10px]';
  } else if (size === 'lg') {
    py = 'py-1';
    px = 'px-3';
    textSize = 'text-xs';
    iconSize = 'text-sm';
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 font-black bg-gradient-to-r ${badge.bgGradient} ${badge.textColor} border ${badge.borderColor} ${badge.glowClass} ${px} ${py} ${textSize} rounded-md shadow-md ${className}`}
      title={`LV.${level} - ${badge.name}`}
    >
      <span className={iconSize}>{badge.icon}</span>
      {showName ? (
        <span>
          <span className="opacity-90 mr-0.5">T{badge.tier}</span>
          <span>{badge.shortTitle}</span>
          <span className="opacity-75 font-mono ml-1">LV.{level}</span>
        </span>
      ) : (
        <span>LV.{level}</span>
      )}
    </div>
  );
};
