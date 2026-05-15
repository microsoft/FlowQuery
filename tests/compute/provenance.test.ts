import Runner from "../../src/compute/runner";

afterEach(async () => {
    // Clean up any virtuals created by individual tests to avoid leakage.
});

async function createCityGraph(): Promise<void> {
    await new Runner(`
        CREATE VIRTUAL (:ProvCity) AS {
            UNWIND [
                {id: 'nyc', name: 'New York', country: 'US'},
                {id: 'lax', name: 'Los Angeles', country: 'US'},
                {id: 'yyz', name: 'Toronto', country: 'CA'},
                {id: 'lhr', name: 'London', country: 'UK'}
            ] AS c
            RETURN c.id AS id, c.name AS name, c.country AS country
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:ProvCity)-[:PROV_FLIGHT]-(:ProvCity) AS {
            UNWIND [
                {left_id: 'nyc', right_id: 'lax', airline: 'AA'},
                {left_id: 'nyc', right_id: 'yyz', airline: 'AC'},
                {left_id: 'lax', right_id: 'yyz', airline: 'AC'},
                {left_id: 'yyz', right_id: 'lhr', airline: 'BA'}
            ] AS f
            RETURN f.left_id AS left_id, f.right_id AS right_id, f.airline AS airline
        }
    `).run();
}

async function dropCityGraph(): Promise<void> {
    await new Runner("DELETE VIRTUAL (:ProvCity)-[:PROV_FLIGHT]-(:ProvCity)").run();
    await new Runner("DELETE VIRTUAL (:ProvCity)").run();
}

test("Provenance is disabled by default and returns an empty array", async () => {
    await createCityGraph();
    const runner = new Runner(`
        MATCH (a:ProvCity)
        RETURN a.name AS name
    `);
    await runner.run();
    expect(runner.results.length).toBeGreaterThan(0);
    expect(runner.provenance).toEqual([]);
    await dropCityGraph();
});

test("Provenance records the node id bound to each row", async () => {
    await createCityGraph();
    const runner = new Runner(
        `
        MATCH (a:ProvCity)
        WHERE a.country = 'US'
        RETURN a.name AS name
    `,
        null,
        null,
        { provenance: true }
    );
    await runner.run();
    expect(runner.results.length).toBe(runner.provenance.length);
    for (let i = 0; i < runner.results.length; i++) {
        const prov = runner.provenance[i];
        expect(prov.relationships).toEqual([]);
        expect(prov.nodes.length).toBe(1);
        expect(prov.nodes[0].alias).toBe("a");
        expect(prov.nodes[0].label).toBe("ProvCity");
        expect(typeof prov.nodes[0].id).toBe("string");
    }
    // Bound ids should be the US cities.
    const ids = runner.provenance.map((p) => p.nodes[0].id).sort();
    expect(ids).toEqual(["lax", "nyc"]);
    await dropCityGraph();
});

test("Provenance records relationship left_id, right_id, and type per row", async () => {
    await createCityGraph();
    const runner = new Runner(
        `
        MATCH (a:ProvCity {name: 'New York'})-[r:PROV_FLIGHT]->(b:ProvCity)
        RETURN a.name AS origin, b.name AS destination
    `,
        null,
        null,
        { provenance: true }
    );
    await runner.run();
    expect(runner.results.length).toBe(2);
    expect(runner.provenance.length).toBe(2);
    for (const p of runner.provenance) {
        expect(p.nodes.length).toBe(2);
        expect(p.nodes.map((n) => n.alias)).toEqual(["a", "b"]);
        expect(p.nodes[0].id).toBe("nyc");
        expect(p.relationships.length).toBe(1);
        const rel = p.relationships[0];
        expect(rel.alias).toBe("r");
        expect(rel.type).toBe("PROV_FLIGHT");
        expect(rel.hops.length).toBe(1);
        expect(rel.hops[0].left_id).toBe("nyc");
        expect(rel.hops[0].type).toBe("PROV_FLIGHT");
    }
    const rightIds = runner.provenance.map((p) => p.relationships[0].hops[0].right_id).sort();
    expect(rightIds).toEqual(["lax", "yyz"]);
    await dropCityGraph();
});

test("Provenance preserves original scalar type for ids (numbers stay numbers)", async () => {
    await new Runner(`
        CREATE VIRTUAL (:ProvNumId) AS {
            UNWIND [{id: 1, name: 'A'}, {id: 2, name: 'B'}] AS r
            RETURN r.id AS id, r.name AS name
        }
    `).run();
    const runner = new Runner(`MATCH (n:ProvNumId) RETURN n.name AS name`, null, null, {
        provenance: true,
    });
    await runner.run();
    expect(runner.provenance.length).toBe(2);
    for (const p of runner.provenance) {
        expect(typeof p.nodes[0].id).toBe("number");
    }
    const ids = runner.provenance.map((p) => p.nodes[0].id).sort();
    expect(ids).toEqual([1, 2]);
    await new Runner("DELETE VIRTUAL (:ProvNumId)").run();
});

test("Provenance for variable-length paths lists every hop in order", async () => {
    await createCityGraph();
    const runner = new Runner(
        `
        MATCH (a:ProvCity {name: 'New York'})-[r:PROV_FLIGHT*1..2]->(b:ProvCity)
        RETURN a.name AS origin, b.name AS destination
    `,
        null,
        null,
        { provenance: true }
    );
    await runner.run();
    expect(runner.results.length).toBe(runner.provenance.length);
    // At least one path must have two hops (NYC -> LAX -> YYZ or NYC -> YYZ -> LHR)
    const multi = runner.provenance.filter((p) => p.relationships[0].hops.length > 1);
    expect(multi.length).toBeGreaterThan(0);
    for (const p of multi) {
        // Each hop's right_id must equal the next hop's left_id.
        const hops = p.relationships[0].hops;
        for (let i = 0; i < hops.length - 1; i++) {
            expect(hops[i].right_id).toBe(hops[i + 1].left_id);
        }
    }
    await dropCityGraph();
});

test("Provenance includes anonymous aliases with alias: null", async () => {
    await createCityGraph();
    const runner = new Runner(
        `
        MATCH (a:ProvCity {name: 'New York'})-[:PROV_FLIGHT]->(:ProvCity)
        RETURN a.name AS origin
    `,
        null,
        null,
        { provenance: true }
    );
    await runner.run();
    expect(runner.results.length).toBe(2);
    for (const p of runner.provenance) {
        const named = p.nodes.find((n) => n.alias === "a");
        expect(named).toBeDefined();
        const anon = p.nodes.find((n) => n.alias === null);
        expect(anon).toBeDefined();
        expect(anon!.label).toBe("ProvCity");
        // Anonymous relationship binding present too.
        expect(p.relationships.length).toBe(1);
        expect(p.relationships[0].alias).toBeNull();
    }
    await dropCityGraph();
});

test("Provenance is permuted by ORDER BY and truncated by LIMIT in lockstep with results", async () => {
    await createCityGraph();
    const runner = new Runner(
        `
        MATCH (a:ProvCity)
        RETURN a.name AS name
        ORDER BY a.name ASC
        LIMIT 2
    `,
        null,
        null,
        { provenance: true }
    );
    await runner.run();
    expect(runner.results.length).toBe(2);
    expect(runner.provenance.length).toBe(2);
    // First two cities alphabetically: London (lhr), Los Angeles (lax)
    expect(runner.results.map((r: Record<string, any>) => r.name)).toEqual([
        "London",
        "Los Angeles",
    ]);
    expect(runner.provenance.map((p) => p.nodes[0].id)).toEqual(["lhr", "lax"]);
    await dropCityGraph();
});

test("Provenance for aggregate RETURN unions contributing ids and dedups", async () => {
    await createCityGraph();
    const runner = new Runner(
        `
        MATCH (a:ProvCity)-[:PROV_FLIGHT]->(b:ProvCity)
        RETURN a.country AS country, count(b) AS reachable
    `,
        null,
        null,
        { provenance: true }
    );
    await runner.run();
    // Verify per-row provenance lists all contributing source-city ids per group.
    expect(runner.results.length).toBe(runner.provenance.length);
    const usRow = runner.results.findIndex((r: Record<string, any>) => r.country === "US");
    expect(usRow).toBeGreaterThanOrEqual(0);
    const usProv = runner.provenance[usRow];
    const usAIds = usProv.nodes
        .filter((n) => n.alias === "a")
        .map((n) => n.id)
        .sort();
    // NYC and LAX both originate flights and are US.
    expect(usAIds).toEqual(["lax", "nyc"]);
    await dropCityGraph();
});

test("Provenance is empty for non-graph queries (WITH/RETURN)", async () => {
    const runner = new Runner(`WITH 1 AS x, 2 AS y RETURN x + y AS sum`, null, null, {
        provenance: true,
    });
    await runner.run();
    expect(runner.results).toEqual([{ sum: 3 }]);
    expect(runner.provenance).toEqual([{ nodes: [], relationships: [] }]);
});

test("Provenance for OPTIONAL MATCH yields null ids on misses", async () => {
    await createCityGraph();
    // No PROV_FLIGHT edge originates from LHR; OPTIONAL MATCH should yield
    // a null relationship binding (or hops:[]) for LHR.
    const runner = new Runner(
        `
        MATCH (a:ProvCity {name: 'London'})
        OPTIONAL MATCH (a)-[r:PROV_FLIGHT]->(b:ProvCity)
        RETURN a.name AS origin, b.name AS destination
    `,
        null,
        null,
        { provenance: true }
    );
    await runner.run();
    expect(runner.results.length).toBe(1);
    expect(runner.results[0].destination).toBeNull();
    const p = runner.provenance[0];
    const aBinding = p.nodes.find((n) => n.alias === "a")!;
    expect(aBinding.id).toBe("lhr");
    const bBinding = p.nodes.find((n) => n.alias === "b")!;
    expect(bBinding.id).toBeNull();
    expect(p.relationships[0].hops).toEqual([]);
    await dropCityGraph();
});

test("Provenance flows through UNION ALL preserving branch contributions", async () => {
    await createCityGraph();
    const runner = new Runner(
        `
        MATCH (a:ProvCity {name: 'New York'}) RETURN a.name AS name
        UNION ALL
        MATCH (b:ProvCity {name: 'London'}) RETURN b.name AS name
    `,
        null,
        null,
        { provenance: true }
    );
    await runner.run();
    expect(runner.results.length).toBe(2);
    expect(runner.provenance.length).toBe(2);
    expect(runner.provenance[0].nodes[0].id).toBe("nyc");
    expect(runner.provenance[0].nodes[0].alias).toBe("a");
    expect(runner.provenance[1].nodes[0].id).toBe("lhr");
    expect(runner.provenance[1].nodes[0].alias).toBe("b");
    await dropCityGraph();
});

test("Provenance through UNION dedups results and keeps first branch's lineage", async () => {
    await createCityGraph();
    const runner = new Runner(
        `
        MATCH (a:ProvCity {name: 'New York'}) RETURN a.name AS name
        UNION
        MATCH (b:ProvCity {name: 'New York'}) RETURN b.name AS name
    `,
        null,
        null,
        { provenance: true }
    );
    await runner.run();
    expect(runner.results.length).toBe(1);
    expect(runner.provenance.length).toBe(1);
    // First branch wins on duplicate rows.
    expect(runner.provenance[0].nodes[0].alias).toBe("a");
    await dropCityGraph();
});

test("Provenance covers multiple chained MATCH clauses without duplicating shared aliases", async () => {
    await new Runner(`
        CREATE VIRTUAL (:ProvPerson) AS {
            UNWIND [
                {id: 1, name: 'Alice'},
                {id: 2, name: 'Bob'},
                {id: 3, name: 'Carol'}
            ] AS r
            RETURN r.id AS id, r.name AS name
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:ProvPerson)-[:PROV_KNOWS]-(:ProvPerson) AS {
            UNWIND [
                {left_id: 1, right_id: 2},
                {left_id: 2, right_id: 3}
            ] AS r
            RETURN r.left_id AS left_id, r.right_id AS right_id
        }
    `).run();
    const runner = new Runner(
        `
        MATCH (a:ProvPerson)-[:PROV_KNOWS]-(b:ProvPerson)
        MATCH (b)-[:PROV_KNOWS]-(c:ProvPerson)
        RETURN a.name AS a, b.name AS b, c.name AS c
    `,
        null,
        null,
        { provenance: true }
    );
    await runner.run();
    expect(runner.results.length).toBeGreaterThan(0);
    expect(runner.results.length).toBe(runner.provenance.length);
    for (const p of runner.provenance) {
        const aliases = p.nodes.map((n) => n.alias);
        // a, b, c each appear exactly once even though b is referenced twice.
        expect(aliases.slice().sort()).toEqual(["a", "b", "c"]);
    }
    await new Runner("DELETE VIRTUAL (:ProvPerson)-[:PROV_KNOWS]-(:ProvPerson)").run();
    await new Runner("DELETE VIRTUAL (:ProvPerson)").run();
});

test("Provenance is empty for CREATE / DELETE VIRTUAL statements", async () => {
    const runner = new Runner(`CREATE VIRTUAL (:ProvEmpty) AS { RETURN 1 AS id }`, null, null, {
        provenance: true,
    });
    await runner.run();
    expect(runner.provenance).toEqual([]);
    await new Runner("DELETE VIRTUAL (:ProvEmpty)").run();
});

test("Provenance flows through aggregated WITH into a downstream RETURN", async () => {
    await createCityGraph();
    // count(b) per origin country; downstream RETURN should still have access
    // to which a-ids (and r/b ids) contributed to each group's count.
    const runner = new Runner(
        `
        MATCH (a:ProvCity)-[r:PROV_FLIGHT]->(b:ProvCity)
        WITH a.country AS country, count(b) AS reachable
        RETURN country, reachable
    `,
        null,
        null,
        { provenance: true }
    );
    await runner.run();
    expect(runner.results.length).toBe(runner.provenance.length);
    const usIdx = runner.results.findIndex((r: Record<string, any>) => r.country === "US");
    expect(usIdx).toBeGreaterThanOrEqual(0);
    const usProv = runner.provenance[usIdx];
    const usAIds = usProv.nodes
        .filter((n) => n.alias === "a")
        .map((n) => n.id)
        .sort();
    // NYC and LAX both originate flights and are US.
    expect(usAIds).toEqual(["lax", "nyc"]);
    // The relationship binding should list every contributing hop (deduped).
    const usHops = usProv.relationships
        .filter((rel) => rel.alias === "r")
        .flatMap((rel) => rel.hops);
    // Three US-origin flights: nyc->lax, nyc->yyz, lax->yyz.
    expect(usHops.length).toBe(3);
    await dropCityGraph();
});

test("Provenance combines pre-WITH group lineage with post-WITH live MATCH lineage", async () => {
    await new Runner(`
        CREATE VIRTUAL (:ProvUser) AS {
            UNWIND [
                {id: 1, name: 'Alice'},
                {id: 2, name: 'Bob'},
                {id: 3, name: 'Carol'}
            ] AS u
            RETURN u.id AS id, u.name AS name
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:ProvUser)-[:PROV_KNOWS]-(:ProvUser) AS {
            UNWIND [
                {left_id: 1, right_id: 2},
                {left_id: 1, right_id: 3}
            ] AS r
            RETURN r.left_id AS left_id, r.right_id AS right_id
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:ProvProject) AS {
            UNWIND [
                {id: 10, name: 'Atlas'},
                {id: 11, name: 'Borealis'}
            ] AS p
            RETURN p.id AS id, p.name AS name
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:ProvUser)-[:PROV_WORKS_ON]-(:ProvProject) AS {
            UNWIND [
                {left_id: 1, right_id: 10},
                {left_id: 1, right_id: 11}
            ] AS r
            RETURN r.left_id AS left_id, r.right_id AS right_id
        }
    `).run();
    const runner = new Runner(
        `
        MATCH (u:ProvUser)-[:PROV_KNOWS]->(s:ProvUser)
        WITH u, count(s) AS acquaintances
        MATCH (u)-[:PROV_WORKS_ON]->(p:ProvProject)
        RETURN u.name AS name, acquaintances, p.name AS project
    `,
        null,
        null,
        { provenance: true }
    );
    await runner.run();
    // Alice is the only user with PROV_KNOWS edges; she has two projects.
    expect(runner.results.length).toBe(2);
    expect(runner.provenance.length).toBe(2);
    for (let i = 0; i < runner.results.length; i++) {
        const p = runner.provenance[i];
        // The aggregated group's contribution (u, s, the KNOWS edge) survives.
        const u = p.nodes.find((n) => n.alias === "u")!;
        expect(u.id).toBe(1);
        const knownIds = p.nodes
            .filter((n) => n.alias === "s")
            .map((n) => n.id)
            .sort();
        expect(knownIds).toEqual([2, 3]);
        // The post-WITH MATCH contributes the freshly-bound project.
        const project = p.nodes.find((n) => n.alias === "p")!;
        expect([10, 11]).toContain(project.id);
        // KNOWS relationship hops from before the aggregation survived.
        const knowsHops = p.relationships
            .filter((rel) => rel.type === "PROV_KNOWS" || rel.alias === null)
            .flatMap((rel) => rel.hops);
        expect(knowsHops.some((h) => h.left_id === 1)).toBe(true);
    }
    await new Runner("DELETE VIRTUAL (:ProvUser)-[:PROV_WORKS_ON]-(:ProvProject)").run();
    await new Runner("DELETE VIRTUAL (:ProvUser)-[:PROV_KNOWS]-(:ProvUser)").run();
    await new Runner("DELETE VIRTUAL (:ProvProject)").run();
    await new Runner("DELETE VIRTUAL (:ProvUser)").run();
});

test("Provenance composes across chained aggregated WITH clauses", async () => {
    await createCityGraph();
    // First aggregation: count flights per (country, origin city).
    // Second aggregation: collapse over country, summing the counts.
    // The lineage on the final row must transitively trace back to the
    // original City and FLIGHT ids that fed both aggregations.
    const runner = new Runner(
        `
        MATCH (a:ProvCity)-[r:PROV_FLIGHT]->(b:ProvCity)
        WITH a.country AS country, a.name AS origin, count(b) AS reachable
        WITH country, sum(reachable) AS total
        RETURN country, total
    `,
        null,
        null,
        { provenance: true }
    );
    await runner.run();
    expect(runner.results.length).toBe(runner.provenance.length);
    expect(runner.results.length).toBeGreaterThan(0);
    const usIdx = runner.results.findIndex((r: Record<string, any>) => r.country === "US");
    expect(usIdx).toBeGreaterThanOrEqual(0);
    const usProv = runner.provenance[usIdx];
    const usAIds = usProv.nodes
        .filter((n) => n.alias === "a")
        .map((n) => n.id)
        .sort();
    // Original a-ids survive both aggregation hops.
    expect(usAIds).toEqual(["lax", "nyc"]);
    const usHops = usProv.relationships
        .filter((rel) => rel.alias === "r")
        .flatMap((rel) => rel.hops);
    expect(usHops.length).toBe(3);
    await dropCityGraph();
});
