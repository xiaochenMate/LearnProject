import React from 'react';
import { CULTURE_BOOKS } from '../lib/cultureContent';
import { CultureWorkspace, type CultureAppProps } from '../lib/cultureUI';

export default function PoetryApp(props: CultureAppProps) {
  return <CultureWorkspace book={CULTURE_BOOKS.poetry} {...props} />;
}
