import React from 'react';
import { IntegrityReport } from '../../../integrity/GraphIntegrityService';

interface DrillNodeMicroProps {
  iconSvg: string;
  color: string;
  isAuthorNote: boolean;
  reified: boolean;
  integrityReport?: IntegrityReport;
}

export const DrillNodeMicro: React.FC<DrillNodeMicroProps> = ({
  iconSvg,
  color,
  isAuthorNote,
  reified,
  integrityReport,
}) => (
  <foreignObject
    width="120"
    height="120"
    x="-60"
    y="-60"
    className="overflow-visible pointer-events-none"
  >
    <div
      className={`w-20 h-20 rounded-full border-[5px] flex items-center justify-center transition-transform duration-700 shadow-[0_10px_30px_rgba(0,0,0,0.8)] ${
        isAuthorNote
          ? 'bg-nexus-900 border-amber-500'
          : reified
            ? 'bg-nexus-900 border-nexus-accent shadow-[0_0_20px_var(--accent-color)]'
            : 'bg-nexus-900'
      }`}
      style={{ borderColor: color }}
    >
      <div dangerouslySetInnerHTML={{ __html: iconSvg }} className="scale-[2.2]" />
      {integrityReport && integrityReport.status !== 'APPROVED' && (
        <div className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 flex items-center justify-center border-2 border-nexus-900 text-[10px] text-white">
          !
        </div>
      )}
    </div>
  </foreignObject>
);
