import {TestIdDirective} from 'ngx-testbox';

export const testIds = [
  'title',
  'heroesMenu',
  'heroLink',
  'heroSearch',
] as const;

export const testIdMap = TestIdDirective.idsToMap(testIds);
