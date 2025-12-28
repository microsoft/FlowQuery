import { AsyncFunction, FunctionDef } from "flowquery/extensibility";

const usersData = [
    { id: 1, name: "Alice Johnson", email: "alice@example.com", age: 28 },
    { id: 2, name: "Bob Smith", email: "bob@example.com", age: 34 },
    { id: 3, name: "Charlie Brown", email: "charlie@example.com", age: 22 },
    { id: 4, name: "Diana Ross", email: "diana@example.com", age: 45 },
    { id: 5, name: "Eve Wilson", email: "eve@example.com", age: 31 },
];

const productsData = [
    { id: 101, name: "Laptop", price: 999.99, category: "Electronics", stock: 50 },
    { id: 102, name: "Headphones", price: 149.99, category: "Electronics", stock: 200 },
    { id: 103, name: "Coffee Mug", price: 12.99, category: "Kitchen", stock: 500 },
    { id: 104, name: "Notebook", price: 8.99, category: "Office", stock: 300 },
    { id: 105, name: "Backpack", price: 59.99, category: "Accessories", stock: 75 },
];

const ordersData = [
    { id: 1001, userId: 1, productId: 101, quantity: 1, total: 999.99, date: "2025-12-01" },
    { id: 1002, userId: 2, productId: 102, quantity: 2, total: 299.98, date: "2025-12-05" },
    { id: 1003, userId: 1, productId: 103, quantity: 4, total: 51.96, date: "2025-12-10" },
    { id: 1004, userId: 3, productId: 104, quantity: 10, total: 89.9, date: "2025-12-15" },
    { id: 1005, userId: 4, productId: 105, quantity: 1, total: 59.99, date: "2025-12-20" },
    { id: 1006, userId: 5, productId: 101, quantity: 1, total: 999.99, date: "2025-12-25" },
];

@FunctionDef({
    description: "Returns mock user data",
    category: "async",
    parameters: [],
    output: {
        description: "User object",
        type: "object",
        properties: {
            id: { description: "User ID", type: "number" },
            name: { description: "User name", type: "string" },
            email: { description: "User email", type: "string" },
            age: { description: "User age", type: "number" },
        },
    },
    examples: ["CALL users() YIELD id, name, email, age"],
})
export class Users extends AsyncFunction {
    async *generate(): AsyncGenerator<any, void, unknown> {
        for (const user of usersData) {
            yield user;
        }
    }
}

@FunctionDef({
    description: "Returns mock product data",
    category: "async",
    parameters: [],
    output: {
        description: "Product object",
        type: "object",
        properties: {
            id: { description: "Product ID", type: "number" },
            name: { description: "Product name", type: "string" },
            price: { description: "Product price", type: "number" },
            category: { description: "Product category", type: "string" },
            stock: { description: "Stock quantity", type: "number" },
        },
    },
    examples: ["CALL products() YIELD id, name, price, category, stock"],
})
export class Products extends AsyncFunction {
    async *generate(): AsyncGenerator<any, void, unknown> {
        for (const product of productsData) {
            yield product;
        }
    }
}

@FunctionDef({
    description: "Returns mock order data",
    category: "async",
    parameters: [],
    output: {
        description: "Order object",
        type: "object",
        properties: {
            id: { description: "Order ID", type: "number" },
            userId: { description: "User ID who placed the order", type: "number" },
            productId: { description: "Product ID ordered", type: "number" },
            quantity: { description: "Quantity ordered", type: "number" },
            total: { description: "Order total", type: "number" },
            date: { description: "Order date", type: "string" },
        },
    },
    examples: ["CALL orders() YIELD id, userId, productId, quantity, total, date"],
})
export class Orders extends AsyncFunction {
    async *generate(): AsyncGenerator<any, void, unknown> {
        for (const order of ordersData) {
            yield order;
        }
    }
}
