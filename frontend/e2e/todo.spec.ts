import { test, expect } from '@playwright/test';

// Helpers pour l'auth
const TEST_USER = {
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    password: 'password123',
};

async function registerAndLogin(page: any) {
    await page.goto('/register');
    await page.getByLabel('Name').fill(TEST_USER.name);
    await page.getByLabel('Email').fill(TEST_USER.email);
    await page.getByLabel('Password').fill(TEST_USER.password);
    await page.getByLabel(/consent/i).check();
    await page.getByRole('button', { name: /register/i }).click();
    // Apres register, on est redirige vers la todo list
    await page.waitForURL('/');
}

// Chaque test utilise un email unique pour eviter les conflits
let userCounter = 0;
test.beforeEach(async ({ page }) => {
    userCounter++;
    TEST_USER.email = `test-e2e-${Date.now()}-${userCounter}@example.com`;
    await registerAndLogin(page);
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

            await page.getByRole('button', { name: /remove/i }).first().click();

            await expect(page.locator('text=Delete me')).not.toBeVisible();
            await expect(page.locator('text=No items yet! Add one above!')).toBeVisible();
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
            await page.getByRole('button', { name: /remove/i }).first().click();
            await expect(page.locator('text=No items yet! Add one above!')).toBeVisible();
        });

        test('data persists across page reloads', async ({ page }) => {
            await page.getByPlaceholder('New Item').fill('Persistent item');
            await page.getByRole('button', { name: 'Add Item' }).click();
            await expect(page.locator('text=Persistent item')).toBeVisible();

            await page.reload();

            await expect(page.locator('text=Persistent item')).toBeVisible();
        });
    });
});
