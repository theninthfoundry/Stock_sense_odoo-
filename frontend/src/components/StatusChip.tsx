import React from 'react';
import { DocumentStatus } from '../types';

interface StatusChipProps {
  status: DocumentStatus | string;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status }) => {
  const normStatus = (status || 'draft').toLowerCase();

  return (
    <span className={`status-chip ${normStatus}`}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        backgroundColor: 'currentColor'
      }} />
      {normStatus}
    </span>
  );
};
