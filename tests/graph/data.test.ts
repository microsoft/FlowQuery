import Data from "../../src/graph/data";
import NodeData from "../../src/graph/node_data";
import RelationshipData from "../../src/graph/relationship_data";

test("Data iteration", () => {
    const records = [
        { id: "1", name: "Alice" },
        { id: "2", name: "Bob" },
        { id: "3", name: "Charlie" },
    ];
    const data = new Data(records);
    expect(data.next()).toBe(true);
    expect(data.next()).toBe(true);
    expect(data.next()).toBe(true);
    expect(data.next()).toBe(false);
});

test("Data find", () => {
    const records = [
        { id: "1", name: "Alice" },
        { id: "2", name: "Bob" },
        { id: "3", name: "Charlie" },
        { id: "2", name: "Bob Duplicate" },
    ];
    const data: NodeData = new NodeData(records);
    data.find("2");
    expect(data.current()).toEqual({ id: "2", name: "Bob" });
    expect(data.find("2")).toBe(true);
    expect(data.current()).toEqual({ id: "2", name: "Bob Duplicate" });
    expect(data.find("2")).toBe(false);
});

test("Data find non-existing", () => {
    const records = [
        { id: "1", name: "Alice" },
        { id: "2", name: "Bob" },
    ];
    const data: NodeData = new NodeData(records);
    expect(data.find("3")).toBe(false);
});

test("RelationshipData find", () => {
    const records = [
        { left_id: "1", right_id: "2", type: "FRIEND", id: "r1" },
        { left_id: "2", right_id: "3", type: "COLLEAGUE", id: "r2" },
        { left_id: "1", right_id: "3", type: "FRIEND", id: "r3" },
    ];
    const data: RelationshipData = new RelationshipData(records);
    data.find("1");
    expect(data.current()).toEqual({ left_id: "1", right_id: "2", type: "FRIEND", id: "r1" });
    expect(data.find("1")).toBe(true);
    expect(data.current()).toEqual({ left_id: "1", right_id: "3", type: "FRIEND", id: "r3" });
    expect(data.find("1")).toBe(false);
    expect(data.find("2")).toBe(true);
    expect(data.current()).toEqual({ left_id: "2", right_id: "3", type: "COLLEAGUE", id: "r2" });
    expect(data.find("2")).toBe(false);
    expect(data.find("4")).toBe(false);
});
