/**
 * Example plugin: Generate mock data for testing.
 * 
 * Usage in FlowQuery:
 *   LOAD JSON FROM mockUsers(10) AS user
 *   RETURN user.name, user.email
 */

import { FunctionDef } from 'flowquery/extensibility';

/**
 * MockUsers loader class - generates mock user data for testing.
 */
@FunctionDef({
    isAsyncProvider: true,
    description: 'Generates mock user data for testing purposes',
    category: 'testing',
    parameters: [
        {
            name: 'count',
            description: 'Number of mock users to generate',
            type: 'number',
            required: false,
            default: 5
        }
    ],
    output: {
        description: 'Mock user object',
        type: 'object',
        properties: {
            id: { description: 'User ID', type: 'number' },
            name: { description: 'Full name', type: 'string' },
            email: { description: 'Email address', type: 'string' },
            age: { description: 'Age in years', type: 'number' },
            active: { description: 'Whether user is active', type: 'boolean' }
        }
    },
    examples: [
        "LOAD JSON FROM mockUsers(10) AS user RETURN user.name, user.email",
        "LOAD JSON FROM mockUsers(20) AS user RETURN user WHERE user.active = true"
    ]
})
export class MockUsersLoader {
    private readonly firstNames: string[];
    private readonly lastNames: string[];
    private readonly domains: string[];

    constructor(
        firstNames: string[] = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'],
        lastNames: string[] = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'],
        domains: string[] = ['example.com', 'test.org', 'demo.net']
    ) {
        this.firstNames = firstNames;
        this.lastNames = lastNames;
        this.domains = domains;
    }

    /**
     * Generates mock user data.
     * 
     * @param count - Number of mock users to generate
     */
    async *fetch(count: number = 5): AsyncGenerator<any, void, unknown> {
        for (let i = 0; i < count; i++) {
            const firstName = this.firstNames[Math.floor(Math.random() * this.firstNames.length)];
            const lastName = this.lastNames[Math.floor(Math.random() * this.lastNames.length)];
            const domain = this.domains[Math.floor(Math.random() * this.domains.length)];
            
            yield {
                id: i + 1,
                name: `${firstName} ${lastName}`,
                email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
                age: Math.floor(Math.random() * 50) + 18,
                active: Math.random() > 0.3
            };
        }
    }
}

/**
 * MockProducts loader class - generates mock product data for testing.
 */
@FunctionDef({
    isAsyncProvider: true,
    description: 'Generates mock product data for testing purposes',
    category: 'testing',
    parameters: [
        {
            name: 'count',
            description: 'Number of mock products to generate',
            type: 'number',
            required: false,
            default: 5
        }
    ],
    output: {
        description: 'Mock product object',
        type: 'object',
        properties: {
            id: { description: 'Product ID', type: 'number' },
            name: { description: 'Product name', type: 'string' },
            category: { description: 'Product category', type: 'string' },
            price: { description: 'Price in dollars', type: 'number' },
            inStock: { description: 'Whether product is in stock', type: 'boolean' },
            rating: { description: 'Customer rating (0-5)', type: 'number' }
        }
    },
    examples: [
        "LOAD JSON FROM mockProducts(10) AS p RETURN p.name, p.price",
        "LOAD JSON FROM mockProducts(50) AS p RETURN p WHERE p.category = 'Electronics'"
    ]
})
export class MockProductsLoader {
    private readonly categories: string[];
    private readonly adjectives: string[];
    private readonly nouns: string[];

    constructor(
        categories: string[] = ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'],
        adjectives: string[] = ['Premium', 'Basic', 'Pro', 'Ultra', 'Classic'],
        nouns: string[] = ['Widget', 'Gadget', 'Item', 'Product', 'Thing']
    ) {
        this.categories = categories;
        this.adjectives = adjectives;
        this.nouns = nouns;
    }

    /**
     * Generates mock product data.
     * 
     * @param count - Number of mock products to generate
     */
    async *fetch(count: number = 5): AsyncGenerator<any, void, unknown> {
        for (let i = 0; i < count; i++) {
            const adj = this.adjectives[Math.floor(Math.random() * this.adjectives.length)];
            const noun = this.nouns[Math.floor(Math.random() * this.nouns.length)];
            const category = this.categories[Math.floor(Math.random() * this.categories.length)];
            
            yield {
                id: i + 1,
                name: `${adj} ${noun} ${i + 1}`,
                category,
                price: Math.round(Math.random() * 1000 * 100) / 100,
                inStock: Math.random() > 0.2,
                rating: Math.round(Math.random() * 50) / 10
            };
        }
    }
}

export { MockUsersLoader as default };
