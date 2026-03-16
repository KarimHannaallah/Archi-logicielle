import { test, expect } from '@playwright/test';

const TEST_USER = {
    email: '',
    name: 'Test User',
    password: 'password123',
};

let userCounter = 0;

async function registerAndLogin(page: any) {
    userCounter++;
    TEST_USER.email = `test-p2-${Date.now()}-${userCounter}@example.com`;
    await page.goto('/register');
    await page.getByRole('textbox', { name: 'Name' }).fill(TEST_USER.name);
    await page.getByRole('textbox', { name: 'Email' }).fill(TEST_USER.email);
    await page.locator('#password').fill(TEST_USER.password);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /register/i }).click();
    await page.waitForURL('/');
}

test.describe('Project Workflow — E2E', () => {

    test('full workflow: create project → task → complete → auto-close → notifications', async ({ page }) => {
        await registerAndLogin(page);

        // 1. Page projets vide
        await expect(page.locator('text=Aucun projet')).toBeVisible();

        // 2. Créer un projet
        await page.getByPlaceholder('Nom du projet').fill('Mon Projet Test');
        await page.getByRole('button', { name: 'Créer' }).click();
        await expect(page.locator('text=Mon Projet Test')).toBeVisible();
        await expect(page.locator('.badge.bg-success')).toHaveText('open');

        // 3. Entrer dans le projet
        await page.locator('text=Mon Projet Test').click();
        await expect(page.locator('h3')).toHaveText('Mon Projet Test');

        // 4. Créer une tâche
        await page.getByPlaceholder('Nouvelle tâche').fill('Tâche unique');
        await page.getByRole('button', { name: 'Ajouter' }).click();
        await expect(page.locator('text=Tâche unique')).toBeVisible({ timeout: 5000 });

        // 5. Compléter la tâche
        await page.getByRole('button', { name: 'Terminer' }).click();

        // 6. Attendre que le projet passe à "closed"
        await expect(async () => {
            await page.reload();
            const badge = page.locator('.badge.fs-6');
            await expect(badge).toHaveText('closed', { timeout: 2000 });
        }).toPass({ timeout: 30000 });

        // 7. Vérifier les notifications
        await page.locator('button:has-text("🔔")').click();
        await expect(page.locator('text=Tâche terminée')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=terminé !')).toBeVisible();
    });

    test('project stays open if not all tasks completed', async ({ page }) => {
        await registerAndLogin(page);

        // Créer un projet
        await page.getByPlaceholder('Nom du projet').fill('Projet Partiel');
        await page.getByRole('button', { name: 'Créer' }).click();
        await page.locator('text=Projet Partiel').click();

        // Créer 2 tâches
        await page.getByPlaceholder('Nouvelle tâche').fill('Tâche A');
        await page.getByRole('button', { name: 'Ajouter' }).click();
        await expect(page.locator('text=Tâche A')).toBeVisible({ timeout: 5000 });

        await page.getByPlaceholder('Nouvelle tâche').fill('Tâche B');
        await page.getByRole('button', { name: 'Ajouter' }).click();
        await expect(page.locator('text=Tâche B')).toBeVisible({ timeout: 5000 });

        // Compléter seulement la première
        await page.getByRole('button', { name: 'Terminer' }).first().click();

        // Attendre un peu puis vérifier que le projet est toujours open
        await page.waitForTimeout(3000);
        await page.reload();
        const badge = page.locator('.badge.fs-6');
        await expect(badge).toHaveText('open');
    });

    test('TaskReopened notification appears', async ({ page }) => {
        await registerAndLogin(page);

        // Créer un projet + tâche
        await page.getByPlaceholder('Nom du projet').fill('Projet Reopen');
        await page.getByRole('button', { name: 'Créer' }).click();
        await page.locator('text=Projet Reopen').click();

        await page.getByPlaceholder('Nouvelle tâche').fill('Tâche reopen');
        await page.getByRole('button', { name: 'Ajouter' }).click();
        await expect(page.locator('text=Tâche reopen')).toBeVisible({ timeout: 5000 });

        // Compléter puis réouvrir
        await page.getByRole('button', { name: 'Terminer' }).click();
        await page.waitForTimeout(1000);
        await page.getByRole('button', { name: 'Réouvrir' }).click();

        // Vérifier la notification TaskReopened
        await page.waitForTimeout(2000);
        await page.locator('button:has-text("🔔")').click();
        await expect(page.locator('text=réouverte')).toBeVisible({ timeout: 10000 });
    });
});
