/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
    testEnvironment: "node",
    // Only transform our own TypeScript files, not node_modules
    transform: {
        "^.+\\.tsx?$": [
            "ts-jest",
            {
                tsconfig: "tsconfig.json",
            },
        ],
    },
    testPathIgnorePatterns: ["/node_modules/"],
    // Explicitly exclude node_modules from transformation
    transformIgnorePatterns: ["/node_modules/"],
    // Use moduleNameMapper to ensure flowquery imports use the dist files
    moduleNameMapper: {
        "^flowquery$": "<rootDir>/node_modules/flowquery/dist/index.node.js",
        "^flowquery/extensibility$": "<rootDir>/node_modules/flowquery/dist/extensibility.js",
    },
};
