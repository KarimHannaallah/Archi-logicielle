/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
    forbidden: [
        {
            name: 'no-circular',
            severity: 'error',
            comment: 'Les dépendances circulaires rendent le code fragile et difficile à tester.',
            from: {},
            to: { circular: true },
        },
        {
            name: 'routes-no-persistence',
            severity: 'error',
            comment:
                'Les routes reçoivent le TodoService par injection. ' +
                'Elles ne doivent jamais importer la persistence directement.',
            from: { path: '^src/routes/' },
            to: { path: '^src/persistence/' },
        },
        {
            name: 'persistence-no-routes',
            severity: 'error',
            comment: 'La persistence ne doit pas dépendre des routes (inversion de dépendances).',
            from: { path: '^src/persistence/' },
            to: { path: '^src/routes/' },
        },
        {
            name: 'domain-no-infrastructure',
            severity: 'error',
            comment:
                'Le domaine ne doit pas importer les couches infrastructure ' +
                '(persistence/, routes/) ni les frameworks.',
            from: { path: '^src/domain/' },
            to: { path: '^src/(persistence|routes|middleware)/' },
        },
        {
            name: 'domain-no-npm-infra',
            severity: 'error',
            comment:
                'Le domaine ne doit pas dépendre de bibliothèques d\'infrastructure.',
            from: { path: '^src/domain/' },
            to: {
                dependencyTypes: ['npm'],
                path: '(express|sqlite3|mysql2|wait-port|jsonwebtoken|cors)',
            },
        },
    ],

    options: {
        doNotFollow: {
            path: 'node_modules',
        },
        tsPreCompilationDeps: true,
        tsConfig: {
            fileName: 'tsconfig.json',
        },
        enhancedResolveOptions: {
            exportsFields: ['exports'],
            conditionNames: ['import', 'require', 'node', 'default'],
        },
    },
};
