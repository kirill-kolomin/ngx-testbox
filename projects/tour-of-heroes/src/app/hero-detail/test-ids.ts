import {TestIdDirective} from 'ngx-testbox';

export const testIds = [
  'heroDetail',
  'heroTitle',
  'heroId',
  'heroNameLabel',
  'heroNameInput',
  'goBackButton',
  'saveButton',
] as const;

export const testIdMap = TestIdDirective.idsToMap(testIds);
