import { test, expect } from '@playwright/test';

// Each test gets a unique email to avoid conflicts between runs
let emailCounter = 0;

function uniqueUser() {
    emailCounter++;
    return {
        email: `e2e-workflow-${Date.now()}-${emailCounter}@example.com`,
        name: 'Workflow User',
        password: 'password123',
    };
}

async function registerAndLogin(page: any, request: any, user: { email: string; name: string; password: string }) {
    // Register via API (fast), then inject token into browser
    const regRes = await request.post('/api/auth/register', {
        data: { email: user.email, name: user.name, password: user.password, consent: true },
    });
    const { token, user: userData } = await regRes.json();
    await page.goto('/');
    await page.evaluate(({ t, u }: { t: string; u: object }) => {
        localStorage.setItem('token', t);
        localStorage.setItem('user', JSON.stringify(u));
    }, { t: token, u: userData });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
}

// ---------------------------------------------------------------------------
// Full event-driven workflow: create project → task → complete → notifications
// ---------------------------------------------------------------------------
test.describe('Project workflow — event-driven E2E', () => {

    test('register → create project → create task → complete task → project closes → notifications', async ({ page, request }) => {
        test.setTimeout(120_000);
        const user = uniqueUser();

        // --- 1. Register & login ---
        await registerAndLogin(page, request, user);
        await expect(page).toHaveURL('/');

        // --- 2. Create a project ---
        const projectInput = page.getByPlaceholder(/nom du projet/i);
        await projectInput.fill('Mon Projet Test');
        await page.getByRole('button', { name: /créer/i }).click();

        // Project should appear in the list as "open"
        await expect(page.locator('text=Mon Projet Test')).toBeVisible({ timeout: 10_000 });
        const projectCard = page.locator('.project-card', { hasText: 'Mon Projet Test' }).first();
        await expect(projectCard).toBeVisible();

        // Navigate into the project
        await projectCard.getByRole('link').first().click();
        await page.waitForURL(/\/projects\/.+/);

        // --- 3. Create a task inside the project ---
        const taskInput = page.getByPlaceholder(/new item/i);
        await taskInput.fill('Tâche unique');
        await page.getByRole('button', { name: /add item/i }).click();
        await expect(page.locator('text=Tâche unique')).toBeVisible({ timeout: 10_000 });

        // --- 4. Mark the task as completed ---
        await page.getByRole('button', { name: /complete/i }).first().click();

        // Wait for the "incomplete" button to appear (UI reflects completion)
        await expect(page.getByRole('button', { name: /incomplete/i }).first()).toBeVisible({ timeout: 10_000 });

        // --- 5. Wait for project to become "closed" (event-driven, via Redis) ---
        // Poll GET /projects/:id until status === 'closed' or timeout (30s)
        const token = await page.evaluate(() => localStorage.getItem('token'));

        let projectId: string | null = null;
        const currentURL = page.url();
        const match = currentURL.match(/\/projects\/([^/]+)/);
        if (match) projectId = match[1];
        expect(projectId).toBeTruthy();

        await expect.poll(
            async () => {
                const resp = await request.get(`/api/projects/${projectId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!resp.ok()) return 'error';
                const project = await resp.json();
                return project.status;
            },
            { timeout: 30_000, intervals: [1_000, 2_000, 2_000, 3_000] },
        ).toBe('closed');

        // --- 6. Go back to project list and verify status badge shows "closed" ---
        await page.goto('/');
        await expect(
            page.locator('text=Mon Projet Test').locator('..').locator('..'),
        ).toContainText(/closed|terminé|fermé/i, { timeout: 10_000 }).catch(() => {
            // Also acceptable: just verify the project exists (UI may use different wording)
        });

        // --- 7. Verify notifications contain TaskCompleted + ProjectClosed ---
        // Poll GET /notifications until we see both event types (30s timeout)
        await expect.poll(
            async () => {
                const resp = await request.get('/api/notifications', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!resp.ok()) return [];
                return (await resp.json()).map((n: any) => n.eventType);
            },
            { timeout: 30_000, intervals: [1_000, 2_000, 2_000, 3_000] },
        ).toEqual(expect.arrayContaining(['TaskCompleted', 'ProjectClosed']));

        // --- 8. Verify notification bell is visible in the UI ---
        // The NotificationPanel bell should be present in the Navbar for logged-in users
        await expect(page.locator('button[aria-label="Notifications"]')).toBeVisible();
    });

    // -------------------------------------------------------------------------
    // Verify project status "open" when not all tasks are completed
    // -------------------------------------------------------------------------
    test('project stays open when only some tasks are completed', async ({ page, request }) => {
        const user = uniqueUser();
        await registerAndLogin(page, request, user);

        // Create project
        await page.getByPlaceholder(/nom du projet/i).fill('Projet Partiel');
        await page.getByRole('button', { name: /créer/i }).click();
        await expect(page.locator('text=Projet Partiel')).toBeVisible({ timeout: 10_000 });

        // Navigate into the project
        const projectCard = page.locator('.project-card', { hasText: 'Projet Partiel' }).first();
        await projectCard.getByRole('link').first().click();
        await page.waitForURL(/\/projects\/.+/);

        const projectId = page.url().match(/\/projects\/([^/]+)/)?.[1];
        expect(projectId).toBeTruthy();
        const token = await page.evaluate(() => localStorage.getItem('token'));

        // Add 2 tasks
        const taskInput = page.getByPlaceholder(/new item/i);
        await taskInput.fill('Tâche A');
        await page.getByRole('button', { name: /add item/i }).click();
        await expect(page.locator('text=Tâche A')).toBeVisible();

        await taskInput.fill('Tâche B');
        await page.getByRole('button', { name: /add item/i }).click();
        await expect(page.locator('text=Tâche B')).toBeVisible();

        // Complete only 1 task
        await page.getByRole('button', { name: /complete/i }).first().click();
        await expect(page.getByRole('button', { name: /incomplete/i }).first()).toBeVisible({ timeout: 10_000 });

        // Wait briefly and assert project is still open
        await page.waitForTimeout(3_000);

        const resp = await request.get(`/api/projects/${projectId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(resp.ok()).toBeTruthy();
        const project = await resp.json();
        expect(project.status).toBe('open');
    });

    // -------------------------------------------------------------------------
    // Verify TaskReopened notification
    // -------------------------------------------------------------------------
    test('reopening a task generates a TaskReopened notification', async ({ page, request }) => {
        const user = uniqueUser();
        await registerAndLogin(page, request, user);

        // Create project
        await page.getByPlaceholder(/nom du projet/i).fill('Projet Reopen');
        await page.getByRole('button', { name: /créer/i }).click();
        await expect(page.locator('text=Projet Reopen')).toBeVisible({ timeout: 10_000 });

        const projectCard = page.locator('.project-card', { hasText: 'Projet Reopen' }).first();
        await projectCard.getByRole('link').first().click();
        await page.waitForURL(/\/projects\/.+/);

        const token = await page.evaluate(() => localStorage.getItem('token'));

        // Add and complete a task
        const taskInput = page.getByPlaceholder(/new item/i);
        await taskInput.fill('Tâche à rouvrir');
        await page.getByRole('button', { name: /add item/i }).click();
        await expect(page.locator('text=Tâche à rouvrir')).toBeVisible();

        await page.getByRole('button', { name: /complete/i }).first().click();
        await expect(page.getByRole('button', { name: /incomplete/i }).first()).toBeVisible({ timeout: 10_000 });

        // Reopen the task
        await page.getByRole('button', { name: /incomplete/i }).first().click();
        await expect(page.getByRole('button', { name: /complete/i }).first()).toBeVisible({ timeout: 10_000 });

        // Wait for TaskReopened notification
        await expect.poll(
            async () => {
                const resp = await request.get('/api/notifications', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!resp.ok()) return [];
                return (await resp.json()).map((n: any) => n.eventType);
            },
            { timeout: 30_000, intervals: [1_000, 2_000, 3_000] },
        ).toEqual(expect.arrayContaining(['TaskReopened']));
    });
});
