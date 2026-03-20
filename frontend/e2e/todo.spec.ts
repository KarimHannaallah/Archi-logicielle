import { test, expect } from '@playwright/test';

// Chaque test utilise un email unique pour éviter les conflits
let userCounter = 0;

// Setup rapide : register + create project via API directement (pas d'UI),
// puis injecter le token dans le browser et naviguer vers le projet.
test.beforeEach(async ({ page, request }) => {
    userCounter++;
    const email = `test-e2e-${Date.now()}-${userCounter}@example.com`;

    // 1. Register via API
    const regRes = await request.post('/api/auth/register', {
        data: { email, name: 'Test User', password: 'password123', consent: true },
    });
    const { token, user } = await regRes.json();

    // 2. Create project via API
    const projRes = await request.post('/api/projects', {
        headers: { Authorization: `Bearer ${token}` },
        data: { name: 'Test Project' },
    });
    const project = await projRes.json();

    // 3. Injecter le token dans le navigateur et naviguer vers le projet
    await page.goto('/');
    await page.evaluate(({ t, u }) => {
        localStorage.setItem('token', t);
        localStorage.setItem('user', JSON.stringify(u));
    }, { t: token, u: user });
    await page.goto(`/projects/${project.id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Test Project')).toBeVisible({ timeout: 10_000 });
});

test.describe('Todo App — E2E', () => {
    test.describe('Page load', () => {
        test('shows the app with empty state message', async ({ page }) => {
            await expect(page.locator('text=No items yet! Add one above!')).toBeVisible();
        });

        test('has an input field and an Add button', async ({ page }) => {
            await expect(page.getByPlaceholder('New Item')).toBeVisible();
            await expect(page.getByRole('button', { name: 'Add Item' })).toBeVisible();
        });
    });

    test.describe('Create a task', () => {
        test('adds a new item that appears in the list', async ({ page }) => {
            await page.getByPlaceholder('New Item').fill('Buy groceries');
            await page.getByRole('button', { name: 'Add Item' }).click();

            await expect(page.locator('text=Buy groceries')).toBeVisible();
            await expect(page.locator('text=No items yet! Add one above!')).not.toBeVisible();
        });

        test('input is cleared after adding', async ({ page }) => {
            await page.getByPlaceholder('New Item').fill('Task 1');
            await page.getByRole('button', { name: 'Add Item' }).click();

            await expect(page.locator('text=Task 1')).toBeVisible();
            await expect(page.getByPlaceholder('New Item')).toHaveValue('');
        });

        test('can add multiple items', async ({ page }) => {
            await page.getByPlaceholder('New Item').fill('Item A');
            await page.getByRole('button', { name: 'Add Item' }).click();
            await expect(page.locator('text=Item A')).toBeVisible();

            await page.getByPlaceholder('New Item').fill('Item B');
            await page.getByRole('button', { name: 'Add Item' }).click();
            await expect(page.locator('text=Item B')).toBeVisible();
        });
    });

    test.describe('Toggle (check/uncheck) a task', () => {
        test('marks an item as completed and back', async ({ page }) => {
            await page.getByPlaceholder('New Item').fill('Toggle me');
            await page.getByRole('button', { name: 'Add Item' }).click();
            await expect(page.locator('text=Toggle me')).toBeVisible();

            // Complete it
            const completeBtn = page.getByRole('button', { name: /complete/i }).first();
            await completeBtn.click();

            // Verify completed state exists
            const incompleteBtn = page.getByRole('button', { name: /incomplete/i }).first();
            await expect(incompleteBtn).toBeVisible();

            // Uncomplete it
            await incompleteBtn.click();
            await expect(page.getByRole('button', { name: /complete/i }).first()).toBeVisible();
        });
    });

    test.describe('Delete a task', () => {
        test('removes an item from the list', async ({ page }) => {
            await page.getByPlaceholder('New Item').fill('Delete me');
            await page.getByRole('button', { name: 'Add Item' }).click();
            await expect(page.locator('text=Delete me')).toBeVisible();

            const row = page.locator('.item', { hasText: 'Delete me' });
            await row.getByRole('button', { name: /remove/i }).click();

            await expect(page.locator('text=Delete me')).not.toBeVisible();
        });

        test('deleting one item does not affect others', async ({ page }) => {
            await page.getByPlaceholder('New Item').fill('Keep me');
            await page.getByRole('button', { name: 'Add Item' }).click();
            await expect(page.locator('text=Keep me')).toBeVisible();

            await page.getByPlaceholder('New Item').fill('Remove me');
            await page.getByRole('button', { name: 'Add Item' }).click();
            await expect(page.locator('text=Remove me')).toBeVisible();

            // Delete "Remove me" via its row
            const removeRow = page.locator('.item, [class*=item]', { hasText: 'Remove me' });
            await removeRow.getByRole('button', { name: /remove/i }).click();

            await expect(page.locator('text=Keep me')).toBeVisible();
            await expect(page.locator('text=Remove me')).not.toBeVisible();
        });
    });

    test.describe('Full workflow', () => {
        test('create → check → uncheck → delete', async ({ page }) => {
            // Create
            await page.getByPlaceholder('New Item').fill('Full cycle task');
            await page.getByRole('button', { name: 'Add Item' }).click();
            await expect(page.locator('text=Full cycle task')).toBeVisible();

            // Check
            await page.getByRole('button', { name: /complete/i }).first().click();
            await expect(page.getByRole('button', { name: /incomplete/i }).first()).toBeVisible();

            // Uncheck
            await page.getByRole('button', { name: /incomplete/i }).first().click();
            await expect(page.getByRole('button', { name: /complete/i }).first()).toBeVisible();

            // Delete
            const deleteRow = page.locator('.item', { hasText: 'Full cycle task' });
            await deleteRow.getByRole('button', { name: /remove/i }).click();
            await expect(page.locator('text=Full cycle task')).not.toBeVisible();
        });

        test('data persists across page reloads', async ({ page }) => {
            await page.getByPlaceholder('New Item').fill('Persistent item');
            await page.getByRole('button', { name: 'Add Item' }).click();
            await expect(page.locator('text=Persistent item')).toBeVisible();

            await page.reload({ waitUntil: 'domcontentloaded' });
            await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {/* HMR websocket keeps network busy */});

            await expect(page.locator('text=Persistent item')).toBeVisible({ timeout: 10_000 });
        });
    });
});
