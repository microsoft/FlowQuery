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
    expect(runner.provenance).toEqual([
        { nodes: [], relationships: [], rows: [{ nodes: [], relationships: [] }] },
    ]);
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

test("Deep mode threads UNWIND-virtual sub-query lineage onto node bindings", async () => {
    await new Runner(`
        CREATE VIRTUAL (:DeepCity) AS {
            UNWIND [
                {id: 'nyc', name: 'New York'},
                {id: 'lhr', name: 'London'}
            ] AS c
            RETURN c.id AS id, c.name AS name
        }
    `).run();
    const runner = new Runner(`MATCH (c:DeepCity) RETURN c.id AS id`, null, null, {
        provenance: true,
    });
    await runner.run();
    expect(runner.results.length).toBe(2);
    expect(runner.provenance.length).toBe(2);
    for (const row of runner.provenance) {
        const binding = row.nodes.find((n) => n.alias === "c");
        expect(binding).toBeDefined();
        // UNWIND-sourced virtuals produce empty inner provenance (no
        // graph slots), but the source field must still be present to
        // signal that lineage was threaded.
        expect(binding!.source).toBeDefined();
        expect(binding!.source!.nodes).toEqual([]);
        expect(binding!.source!.relationships).toEqual([]);
    }
    await new Runner("DELETE VIRTUAL (:DeepCity)").run();
});

test("Deep mode threads MATCH-virtual sub-query lineage onto node bindings", async () => {
    await new Runner(`
        CREATE VIRTUAL (:SrcCity) AS {
            UNWIND [
                {id: 'nyc', country: 'US'},
                {id: 'lax', country: 'US'},
                {id: 'lhr', country: 'UK'}
            ] AS c
            RETURN c.id AS id, c.country AS country
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:DerivedCity) AS {
            MATCH (s:SrcCity)
            WHERE s.country = 'US'
            RETURN s.id AS id
        }
    `).run();
    const runner = new Runner(`MATCH (d:DerivedCity) RETURN d.id AS id`, null, null, {
        provenance: true,
    });
    await runner.run();
    const ids = runner.results.map((r: Record<string, any>) => r.id).sort();
    expect(ids).toEqual(["lax", "nyc"]);
    expect(runner.provenance.length).toBe(2);
    for (let i = 0; i < runner.results.length; i++) {
        const d = runner.provenance[i].nodes.find((n) => n.alias === "d");
        expect(d).toBeDefined();
        // The inner MATCH bound an `s` slot whose id equals the outer
        // `d.id` for the contributing row.
        expect(d!.source).toBeDefined();
        const sBinding = d!.source!.nodes.find((n) => n.alias === "s");
        expect(sBinding).toBeDefined();
        expect(sBinding!.id).toBe(d!.id);
    }
    await new Runner("DELETE VIRTUAL (:DerivedCity)").run();
    await new Runner("DELETE VIRTUAL (:SrcCity)").run();
});

test("Deep mode threads virtual-relationship sub-query lineage onto hops", async () => {
    await new Runner(`
        CREATE VIRTUAL (:DeepCity) AS {
            UNWIND [
                {id: 'nyc'},
                {id: 'lax'}
            ] AS c
            RETURN c.id AS id
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:DeepCity)-[:DEEP_FLIGHT]-(:DeepCity) AS {
            UNWIND [
                {left_id: 'nyc', right_id: 'lax', airline: 'AA'}
            ] AS f
            RETURN f.left_id AS left_id, f.right_id AS right_id, f.airline AS airline
        }
    `).run();
    const runner = new Runner(
        `MATCH (a:DeepCity)-[r:DEEP_FLIGHT]->(b:DeepCity) RETURN a.id, b.id`,
        null,
        null,
        { provenance: true }
    );
    await runner.run();
    expect(runner.results.length).toBe(1);
    expect(runner.provenance.length).toBe(1);
    const row = runner.provenance[0];
    const aBinding = row.nodes.find((n) => n.alias === "a");
    const bBinding = row.nodes.find((n) => n.alias === "b");
    expect(aBinding!.source).toBeDefined();
    expect(bBinding!.source).toBeDefined();
    const rHop = row.relationships.find((rel) => rel.alias === "r")!.hops[0];
    expect(rHop.source).toBeDefined();
    // The inner sub-query of the relationship is non-graph
    // (UNWIND ... RETURN), so its provenance is the empty shape.
    expect(rHop.source!.nodes).toEqual([]);
    expect(rHop.source!.relationships).toEqual([]);
    await new Runner("DELETE VIRTUAL (:DeepCity)-[:DEEP_FLIGHT]-(:DeepCity)").run();
    await new Runner("DELETE VIRTUAL (:DeepCity)").run();
});

test("Deep mode recurses through nested virtual sub-queries", async () => {
    await new Runner(`
        CREATE VIRTUAL (:LevelA) AS {
            UNWIND [{id: 1}, {id: 2}] AS r
            RETURN r.id AS id
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:LevelB) AS {
            MATCH (a:LevelA) RETURN a.id AS id
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:LevelC) AS {
            MATCH (b:LevelB) RETURN b.id AS id
        }
    `).run();
    const runner = new Runner(`MATCH (c:LevelC) RETURN c.id AS id`, null, null, {
        provenance: true,
    });
    await runner.run();
    expect(runner.results.length).toBe(2);
    for (const row of runner.provenance) {
        const c = row.nodes.find((n) => n.alias === "c")!;
        expect(c.source).toBeDefined();
        const b = c.source!.nodes.find((n) => n.alias === "b")!;
        expect(b).toBeDefined();
        expect(b.id).toBe(c.id);
        // Recursive lineage: c → b → a.
        expect(b.source).toBeDefined();
        const a = b.source!.nodes.find((n) => n.alias === "a")!;
        expect(a).toBeDefined();
        expect(a.id).toBe(c.id);
    }
    await new Runner("DELETE VIRTUAL (:LevelC)").run();
    await new Runner("DELETE VIRTUAL (:LevelB)").run();
    await new Runner("DELETE VIRTUAL (:LevelA)").run();
});

// ============================================================================
// path-level lineage (always-on)
// ============================================================================

test("Relationship lineage exposes a `path` field listing every node id in order", async () => {
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
    for (const p of runner.provenance) {
        const rel = p.relationships[0];
        expect(rel.path).toBeDefined();
        expect(Array.isArray(rel.path)).toBe(true);
        // Single-hop: path = [left_id, right_id].
        expect(rel.path).toEqual([rel.hops[0].left_id, rel.hops[0].right_id]);
    }
    await dropCityGraph();
});

test("Variable-length relationship `path` lists every visited node id", async () => {
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
    for (const p of runner.provenance) {
        const rel = p.relationships[0];
        // path length = hops + 1.
        expect(rel.path.length).toBe(rel.hops.length + 1);
        // Path = [hops[0].left_id, hops[0].right_id, hops[1].right_id, ...]
        const expected: any[] = [rel.hops[0].left_id];
        for (const h of rel.hops) expected.push(h.right_id);
        expect(rel.path).toEqual(expected);
    }
    await dropCityGraph();
});

// ============================================================================
// row-level lineage (always-on)
// ============================================================================

test("Non-aggregate rows expose a single-segment `rows` array", async () => {
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
    for (const p of runner.provenance) {
        expect(Array.isArray(p.rows)).toBe(true);
        expect(p.rows.length).toBe(1);
        expect(p.rows[0].nodes).toEqual(p.nodes);
        expect(p.rows[0].relationships).toEqual(p.relationships);
    }
    await dropCityGraph();
});

test("Aggregate rows expose one segment per contributing input row, aligned with collect()", async () => {
    await createCityGraph();
    const runner = new Runner(
        `
        MATCH (a:ProvCity)-[:PROV_FLIGHT]->(b:ProvCity)
        RETURN a.country AS country, collect(b.name) AS destinations
    `,
        null,
        null,
        { provenance: true }
    );
    await runner.run();
    expect(runner.results.length).toBe(runner.provenance.length);
    for (let i = 0; i < runner.results.length; i++) {
        const result = runner.results[i];
        const prov = runner.provenance[i];
        const destinations: string[] = result.destinations;
        // One segment per contributing input row.
        expect(prov.rows.length).toBe(destinations.length);
        // Each row segment must include the `b` node whose name appears at the
        // corresponding index in collect(b.name).  Look it up via id.
        for (let k = 0; k < destinations.length; k++) {
            const segment = prov.rows[k];
            const bBinding = segment.nodes.find((n) => n.alias === "b");
            expect(bBinding).toBeDefined();
            // The contributing `a` must also be in the same segment.
            const aBinding = segment.nodes.find((n) => n.alias === "a");
            expect(aBinding).toBeDefined();
        }
    }
    await dropCityGraph();
});

// ============================================================================
// property-level lineage (always on when provenance is enabled)
// ============================================================================

test("Provenance attaches matched property values onto NodeBinding", async () => {
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
    for (const p of runner.provenance) {
        const a = p.nodes[0];
        expect(a.properties).toBeDefined();
        expect(a.properties!.name).toBeDefined();
        expect(a.properties!.country).toBe("US");
        // The id field should NOT be duplicated under properties.
        expect(a.properties!.id).toBeUndefined();
        // The _label field should not leak through either.
        expect(a.properties!._label).toBeUndefined();
    }
    await dropCityGraph();
});

test("Provenance attaches matched property values onto RelationshipHop", async () => {
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
    for (const p of runner.provenance) {
        const hop = p.relationships[0].hops[0];
        expect(hop.properties).toBeDefined();
        expect(hop.properties!.airline).toBeDefined();
        // Structural fields not duplicated.
        expect(hop.properties!.left_id).toBeUndefined();
        expect(hop.properties!.right_id).toBeUndefined();
    }
    await dropCityGraph();
});
