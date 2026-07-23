import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'apps/web',
  'packages/contracts',
  'packages/validation',
  'packages/domain',
  'tests'
]);
