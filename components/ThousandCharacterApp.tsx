import React from 'react';
import { CULTURE_BOOKS } from '../lib/cultureContent';
import { CultureWorkspace, type CultureAppProps } from '../lib/cultureUI';

export default function ThousandCharacterApp(props: CultureAppProps) {
  return <CultureWorkspace book={CULTURE_BOOKS.qianziwen} {...props} />;
}
