/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { test, expect, dumpTestTree } from './ui-mode-fixtures';

test.describe.configure({ mode: 'parallel' });

const basicTestTree = {
  'a.test.ts': `
    import { test, expect } from '@playwright/test';
    test('passes', () => {});
    test('fails', () => { expect(1).toBe(2); });
    test.describe('suite', () => {
      test('inner passes', () => {});
      test('inner fails', () => { expect(1).toBe(2); });
    });
  `,
  'b.test.ts': `
    import { test, expect } from '@playwright/test';
    test('passes', () => {});
    test('fails', () => { expect(1).toBe(2); });
  `,
};

test('should filter by title', async ({ runUITest }) => {
  const page = await runUITest(basicTestTree);
  await page.getByPlaceholder('Filter').fill('inner');
  await expect.poll(dumpTestTree(page), { timeout: 15000 }).toBe(`
    ▼ ◯ a.test.ts
      ▼ ◯ suite
          ◯ inner passes
          ◯ inner fails
  `);
});

test('should filter by status', async ({ runUITest }) => {
  const page = await runUITest(basicTestTree);

  await page.getByTitle('Run all').click();

  await expect.poll(dumpTestTree(page), { timeout: 15000 }).toBe(`
    ▼ ❌ a.test.ts
        ✅ passes
        ❌ fails <=
      ► ❌ suite
    ▼ ❌ b.test.ts
        ✅ passes
        ❌ fails
  `);

  await expect(page.getByText('Status: all')).toBeVisible();

  await page.getByText('Status:').click();
  await page.getByLabel('failed').setChecked(true);
  await expect(page.getByText('Status: failed')).toBeVisible();

  await expect.poll(dumpTestTree(page), { timeout: 15000 }).toBe(`
    ▼ ❌ a.test.ts
        ❌ fails <=
      ► ❌ suite
    ▼ ❌ b.test.ts
        ❌ fails
  `);

  await page.getByLabel('passed').setChecked(true);
  await expect(page.getByText('Status: passed failed')).toBeVisible();

  await expect.poll(dumpTestTree(page), { timeout: 5000 }).toBe(`
    ▼ ❌ a.test.ts
        ✅ passes
        ❌ fails <=
      ► ❌ suite
    ▼ ❌ b.test.ts
        ✅ passes
        ❌ fails
  `);

});

test('should filter by project', async ({ runUITest }) => {
  const page = await runUITest({
    ...basicTestTree,
    'playwright.config.ts': `
      import { defineConfig } from '@playwright/test';
      export default defineConfig({
        projects: [
          { name: 'foo' },
          { name: 'bar' },
        ],
      });
    `
  });

  await expect.poll(dumpTestTree(page), { timeout: 15000 }).toBe(`
    ▼ ◯ a.test.ts
        ◯ passes
        ◯ fails
      ► ◯ suite
    ▼ ◯ b.test.ts
        ◯ passes
        ◯ fails
  `);

  await expect(page.getByText('Projects: foo')).toBeVisible();

  await page.getByText('Status:').click();
  await expect(page.getByLabel('foo')).toBeChecked();
  await expect(page.getByLabel('bar')).not.toBeChecked();
  await page.getByLabel('bar').setChecked(true);

  await expect.poll(dumpTestTree(page), { timeout: 15000 }).toBe(`
    ▼ ◯ a.test.ts
      ► ◯ passes
      ► ◯ fails
      ► ◯ suite
    ▼ ◯ b.test.ts
      ► ◯ passes
      ► ◯ fails
  `);

  await page.getByText('passes').first().click();
  await page.keyboard.press('ArrowRight');

  await expect.poll(dumpTestTree(page), { timeout: 15000 }).toBe(`
    ▼ ◯ a.test.ts
      ▼ ◯ passes <=
          ◯ foo
          ◯ bar
      ► ◯ fails
      ► ◯ suite
    ▼ ◯ b.test.ts
      ► ◯ passes
      ► ◯ fails
  `);

  await expect(page.getByText('Projects: foo bar')).toBeVisible();
});
