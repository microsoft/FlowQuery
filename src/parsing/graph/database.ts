import Node from "./graph_node";
import Relationship from "./relationship";

class Database {
    private static instance: Database;
    private static nodes: Map<string, Node> = new Map();
    private static relationships: Map<string, Relationship> = new Map();

    public static getInstance(): Database {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }
}

export default Database;
