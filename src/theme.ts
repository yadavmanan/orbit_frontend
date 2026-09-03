import type { Modality, Urgency } from './types';

export const modalityLabels: Record<Modality, string> = {
  CT: 'CT',
  MRI: 'MRI',
  XRAY: 'X-ray',
  US: 'Ultrasound',
};

export const modalityClasses: Record<Modality, string> = {
  CT: 'is-ct',
  MRI: 'is-mri',
  XRAY: 'is-xray',
  US: 'is-us',
};

export const urgencyClasses: Record<Urgency, string> = {
  routine: 'is-routine',
  urgent: 'is-urgent',
  stat: 'is-stat',
};