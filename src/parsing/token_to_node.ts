import { Add, Subtract, Multiply, Divide, Modulo, Power, Equals, LessThan, GreaterThan, GreaterThanOrEqual, LessThanOrEqual, And, Or, Not, Is } from './expressions/operator';
import String from './expressions/string';
import Identifier from './expressions/identifier';
import Number from './expressions/number';
import Token from '../tokenization/token';
import ASTNode from './ast_node';
import JSON from './components/json';
import CSV from './components/csv';
import Text from './components/text';
import When from './logic/when';
import Then from './logic/then';
import Else from './logic/else';
import End from './logic/end';
import Null from './components/null';
class TokenToNode {
    public static convert(token: Token): ASTNode {
        if(token.isNumber()) {
            if(token.value === null) {
                throw new Error('Number token has no value');
            }
            return new Number(token.value);
        } else if(token.isString()) {
            if(token.value === null) {
                throw new Error('String token has no value');
            }
            return new String(token.value);
        } else if(token.isIdentifier()) {
            if(token.value === null) {
                throw new Error('Identifier token has no value');
            }
            return new Identifier(token.value);
        } else if(token.isOperator()) {
            if(token.isAdd()) {
                return new Add();
            } else if(token.isSubtract()) {
                return new Subtract();
            } else if(token.isMultiply()) {
                return new Multiply();
            } else if(token.isDivide()) {
                return new Divide();
            } else if(token.isModulo()) {
                return new Modulo();
            } else if(token.isExponent()) {
                return new Power();
            } else if(token.isEquals()) {
                return new Equals();
            } else if(token.isLessThan()) {
                return new LessThan();
            } else if(token.isGreaterThan()) {
                return new GreaterThan();
            } else if(token.isGreaterThanOrEqual()) {
                return new GreaterThanOrEqual();
            } else if(token.isLessThanOrEqual()) {
                return new LessThanOrEqual();
            } else if(token.isAnd()) {
                return new And();
            } else if(token.isOr()) {
                return new Or();
            } else if(token.isIs()) {
                return new Is();
            }
        } else if(token.isUnaryOperator()) {
            if(token.isNot()) {
                return new Not();
            }
        } else if (token.isKeyword()) {
            if(token.isJSON()) {
                return new JSON();
            } else if(token.isCSV()) {
                return new CSV();
            } else if(token.isText()) {
                return new Text();
            } else if(token.isWhen()) {
                return new When();
            } else if(token.isThen()) {
                return new Then();
            } else if(token.isElse()) {
                return new Else();
            } else if(token.isEnd()) {
                return new End();
            } else if(token.isNull()) {
                return new Null();
            }
        } else {
            throw new Error('Unknown token');
        }
        return new ASTNode();
    }
}

export default TokenToNode;