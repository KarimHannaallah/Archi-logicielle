import { test, expect } from '@playwright/test';

// Helpers pour l'auth
const TEST_USER = {
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    password: 'password123',
};

async function registerAndLogin(page: any) {
    await page.goto('/register');
    await page.getByRole('textbox', { name: 'Name' }).fill(TEST_USER.name);
    await page.getByRole('textbox', { name: 'Email' }).fill(TEST_USER.email);
    await page.locator('#password').fill(TEST_USER.password);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /register/i }).click();
    await page.waitForURL('/');
}

// Chaque test utilise un email unique pour eviter les conflits
let userCounter = 0;
test.beforeEach(async ({ page }) => {
    userCounter++;
    TEST_USER.email = `test-e2e-${Date.now()}-${userCounter}@example.com`;
    await registerAndLogin(page);

    // Créer un projet pour les tests todo
    await page.getByPlaceholder('Nom du projet').fill('Test Project');
    await page.getByRole('button', { name: 'Créer' }).click();
    await page.locator('text=Test Project').click();
    await expect(page.locator('h3')).toHaveText('Test Project');
});

test.describe('Todo App — E2E', () => {
    test.describe('Page load', () => {
        test('shows the app with empty state message', async ({ page }) => {
            await expect(page.locator('text=Aucune tâche')).toBeVisible();
        });

        test('has an input field and an Add button', async ({ page }) => {
            await expect(page.getByPlaceholder('Nouvelle tâche')).toBeVisible();
            await expect(page.getByRole('button', { name: 'Ajouter' })).toBeVisible();
        });
    });

    test.describe('Create a task', () => {
        test('adds a new item that appears in the list', async ({ page }) => {
            await page.getByPlaceholder('Nouvelle tâche').fill('Buy groceries');
            await page.getByRole('button', { name: 'Ajouter' }).click();

            await expect(page.locator('text=Buy groceries')).toBeVisible({ timeout: 5000 });
        });

        test('input is cleared after adding', async ({ page }) => {
            await page.getByPlaceholder('Nouvelle tâche').fill('Task 1');
            await page.getByRole('button', { name: 'Ajouter' }).click();

            await expect(page.locator('text=Task 1')).toBeVisible({ timeout: 5000 });
            await expect(page.getByPlaceholder('Nouvelle tâche')).toHaveValue('');
        });

        test('can add multiple items', async ({ page }) => {
            await page.getByPlaceholder('Nouvelle tâche').fill('Item A');
            await page.getByRole('button', { name: 'Ajouter' }).click();
            await expect(page.locator('text=Item A')).toBeVisible({ timeout: 5000 });

            await page.getByPlaceholder('Nouvelle tâche').fill('Item B');
            await page.getByRole('button', { name: 'Ajouter' }).click();
            await expect(page.locator('text=Item B')).toBeVisible({ timeout: 5000 });
        });
    });

    test.describe('Toggle (check/uncheck) a task', () => {
        test('marks an item as completed and back', async ({ page }) => {
            await page.getByPlaceholder('Nouvelle tâche').fill('Toggle me');
            await page.getByRole('button', { name: 'Ajouter' }).click();
            await expect(page.locator('text=Toggle me')).toBeVisible({ timeout: 5000 });

            // Complete it
            await page.getByRole('button', { name: 'Terminer' }).click();

            // Verify it moved to "Terminées" column
            await expect(page.getByRole('button', { name: 'Réouvrir' })).toBeVisible({ timeout: 5000 });

            // Uncomplete it
            await page.getByRole('button', { name: 'Réouvrir' }).click();
            await expect(page.getByRole('button', { name: 'Terminer' })).toBeVisible({ timeout: 5000 });
        });
    });

    test.describe('Delete a task', () => {
        test('removes an item from the list', async ({ page }) => {
            await page.getByPlaceholder('Nouvelle tâche').fill('Delete me');
            await page.getByRole('button', { name: 'Ajouter' }).click();
            await expect(page.locator('text=Delete me')).toBeVisible({ timeout: 5000 });

            await page.getByRole('button', { name: 'Supprimer' }).click();

            await expect(page.locator('text=Delete me')).not.toBeVisible({ timeout: 5000 });
            await expect(page.locator('text=Aucune tâche')).toBeVisible();
        });

        test('deleting one item does not affect others', async ({ page }) => {
            await page.getByPlaceholder('Nouvelle tâche').fill('Keep me');
            await page.getByRole('button', { name: 'Ajouter' }).click();
            await expect(page.locator('text=Keep me')).toBeVisible({ timeout: 5000 });

            await page.getByPlaceholder('Nouvelle tâche').fill('Remove me');
            await page.getByRole('button', { name: 'Ajouter' }).click();
            await expect(page.locator('text=Remove me')).toBeVisible({ timeout: 5000 });

            // Delete "Remove me" via its card
            const removeCard = page.locator('.card', { hasText: 'Remove me' });
            await removeCard.getByRole('button', { name: 'Supprimer' }).click();

            await expect(page.locator('text=Keep me')).toBeVisible();
            await expect(page.locator('text=Remove me')).not.toBeVisible({ timeout: 5000 });
        });
    });

    test.describe('Full workflow', () => {
        test('create → check → uncheck → delete', async ({ page }) => {
            // Create
            await page.getByPlaceholder('Nouvelle tâche').fill('Full cycle task');
            await page.getByRole('button', { name: 'Ajouter' }).click();
            await expect(page.locator('text=Full cycle task')).toBeVisible({ timeout: 5000 });

            // Check
            await page.getByRole('button', { name: 'Terminer' }).click();
            await expect(page.getByRole('button', { name: 'Réouvrir' })).toBeVisible({ timeout: 5000 });

            // Uncheck
            await page.getByRole('button', { name: 'Réouvrir' }).click();
            await expect(page.getByRole('button', { name: 'Terminer' })).toBeVisible({ timeout: 5000 });

            // Delete
            await page.getByRole('button', { name: 'Supprimer' }).click();
            await expect(page.locator('text=Aucune tâche')).toBeVisible({ timeout: 5000 });
        });

        test('data persists across page reloads', async ({ page }) => {
            await page.getByPlaceholder('Nouvelle tâche').fill('Persistent item');
            await page.getByRole('button', { name: 'Ajouter' }).click();
            await expect(page.locator('text=Persistent item')).toBeVisible({ timeout: 5000 });

            await page.reload();

            await expect(page.locator('text=Persistent item')).toBeVisible({ timeout: 5000 });
        });
    });
});
