import PredicateFunction from "./predicate_function";
import PredicateSum from "./predicate_sum";

class PredicateFunctionFactory {
    public static create(name: string): PredicateFunction {
        switch (name.toLowerCase()) {
            case "sum":
                return new PredicateSum();
            default:
                return new PredicateFunction(name);
        }
    }
}

export default PredicateFunctionFactory;