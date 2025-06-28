import {TestIdDirective} from 'ngx-testbox';

export const testIds = [
  'title',
  'nameInput',
  'addButton',
  'heroesList',
  'heroItem',
  'heroLink',
  'heroDeleteButton',
  'heroId',
  'heroName',
] as const;

export const testIdMap = TestIdDirective.idsToMap(testIds);
