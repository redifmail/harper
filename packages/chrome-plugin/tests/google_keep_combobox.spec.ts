import { expect, test } from './fixtures';
import { clickHarperHighlight, getHarperHighlights } from './testUtils';

// Keep activates its existing note editor by toggling contenteditable on a div
// whose ARIA role is combobox. A search combobox must not be treated as a note.
const KEEP_PAGE = `<!doctype html>
<html lang="en"><body>
  <textarea aria-label="Control editor">A mistaek.</textarea>
  <input role="combobox" type="text" aria-label="Search notes" value="This is an test." />
  <div id="title" role="textbox" contenteditable="true">Untitled</div>
  <div id="note" role="combobox" contenteditable="false" tabindex="0"
       style="display: block; width: 460px; min-height: 100px; padding: 12px;">
    <p>This is an test.</p>
  </div>
</body></html>`;

const KEEP_URL = 'https://keep.google.com/harper-combobox-test';

test('Keep: newly activated note body gets suggestions and can apply them', async ({ page }) => {
	await page.route(KEEP_URL, (route) =>
		route.fulfill({ contentType: 'text/html', body: KEEP_PAGE }),
	);
	await page.goto(KEEP_URL);
	const note = page.locator('#note');
	await expect(note).toHaveAttribute('contenteditable', 'false');
	await expect(
		getHarperHighlights(page).and(page.locator('[data-problem-text="mistaek"]')),
	).toBeVisible({ timeout: 30000 });
	await expect(getHarperHighlights(page).and(page.locator('[data-problem-text="an"]'))).toHaveCount(
		0,
	);

	// In Keep, the same element becomes editable; no child is inserted.
	await note.evaluate((el) => el.setAttribute('contenteditable', 'true'));
	await expect(getHarperHighlights(page).and(page.locator('[data-problem-text="an"]'))).toBeVisible(
		{ timeout: 30000 },
	);
	expect(await clickHarperHighlight(page, 'an')).toBe(true);
	await page.getByTitle('Click to replace "an" with "a"').click();
	await expect(note).toHaveText('This is a test.');
});

test('Keep: an inactive note body is not linted', async ({ page }) => {
	await page.route(KEEP_URL, (route) =>
		route.fulfill({ contentType: 'text/html', body: KEEP_PAGE }),
	);
	await page.goto(KEEP_URL);
	await expect(page.locator('#note')).toHaveAttribute('contenteditable', 'false');
	await expect(
		getHarperHighlights(page).and(page.locator('[data-problem-text="mistaek"]')),
	).toBeVisible({ timeout: 30000 });
	await expect(getHarperHighlights(page).and(page.locator('[data-problem-text="an"]'))).toHaveCount(
		0,
	);
});

test('Other sites: editable comboboxes remain excluded', async ({ page }) => {
	const url = 'http://localhost:8081/harper-combobox-test';
	await page.route(url, (route) =>
		route.fulfill({
			contentType: 'text/html',
			body: KEEP_PAGE.replace('contenteditable="false"', 'contenteditable="true"'),
		}),
	);
	await page.goto(url);
	await expect(
		getHarperHighlights(page).and(page.locator('[data-problem-text="mistaek"]')),
	).toBeVisible({ timeout: 30000 });
	await expect(getHarperHighlights(page).and(page.locator('[data-problem-text="an"]'))).toHaveCount(
		0,
	);
});
