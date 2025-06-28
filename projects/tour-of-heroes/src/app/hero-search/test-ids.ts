import {TestIdDirective} from 'ngx-testbox';

export const testIds = [
  'searchComponent',
  'searchLabel',
  'searchBox',
  'searchResults',
  'heroItem',
  'heroLink',
] as const;

export const testIdMap = TestIdDirective.idsToMap(testIds);
