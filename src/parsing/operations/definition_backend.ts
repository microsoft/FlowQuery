import ASTNode from "../ast_node";
import ParameterReference from "../expressions/parameter_reference";
import AsyncFunction from "../functions/async_function";
import Load from "./load";

/**
 * The backend function of a statement-backed virtual definition: the
 * single `LOAD ... FROM fn($request)` in its body.
 */
export interface DefinitionBackend {
    /** The async function node in the definition body. */
    func: AsyncFunction;
    /** Its class; carries `static capabilities` and read-context hooks. */
    functionClass: any;
    /** The function name as written in the query. */
    name: string;
    /** Position of the argument that passes `$request`. */
    requestIndex: number;
}

function collectLoads(node: ASTNode, out: Load[]): void {
    if (node instanceof Load) out.push(node);
    for (const child of node.getChildren()) collectLoads(child, out);
}

function referencesRequest(node: ASTNode): boolean {
    if (node instanceof ParameterReference && node.name === "$request") return true;
    return node.getChildren().some(referencesRequest);
}

/**
 * Find the definition's backend function, or `null` unless the body has
 * exactly one `LOAD` and it loads from an async function called with
 * `$request`.
 */
export function definitionBackend(statement: ASTNode | null): DefinitionBackend | null {
    if (statement === null) return null;
    const loads: Load[] = [];
    collectLoads(statement, loads);
    if (loads.length !== 1) return null;
    const func = loads[0].asyncFunction;
    if (func === null) return null;
    const requestIndex = func.getChildren().findIndex(referencesRequest);
    if (requestIndex < 0) return null;
    return { func, functionClass: func.constructor, name: func.name, requestIndex };
}

/**
 * Source capabilities declared by the backend function: its
 * `static capabilities` object, or the result of calling a
 * `static capabilities(request)` method with
 * `{operation: 'capabilities', label}` (nodes) or
 * `{operation: 'capabilities', type, sourceLabel, targetLabel}`
 * (relationships).  `null` when nothing is declared.
 */
export async function declaredCapabilities(
    backend: DefinitionBackend | null,
    request: Record<string, any>
): Promise<Record<string, any> | null> {
    if (backend === null) return null;
    const declared = backend.functionClass?.capabilities;
    if (declared === undefined || declared === null) return null;
    const value =
        typeof declared === "function"
            ? await declared.call(backend.functionClass, { version: 1, ...request })
            : declared;
    if (value === undefined || value === null) return null;
    if (typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`Function ${backend.name}: declared capabilities must be an object`);
    }
    return value;
}
