/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
    testEnvironment: "node",
    transform: {
        "^.+.tsx?$": ["ts-jest", {}],
    },
    testPathIgnorePatterns: [
        "/node_modules/",
        "/flowquery-py/",
        "/flowquery-vscode/",
        "/docs/",
        "/misc/",
    ],
};
