import type { EvaluationValue, VariableMap } from "packages/problem-format/types";

type Token =
  | { kind: "number"; value: number }
  | { kind: "identifier"; value: string }
  | { kind: "operator"; value: string }
  | { kind: "paren"; value: "(" | ")" }
  | { kind: "comma" };

class Cursor {
  private readonly tokens: Token[];

  private index = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  peek() {
    return this.tokens[this.index];
  }

  next() {
    const token = this.tokens[this.index];
    this.index += 1;
    return token;
  }

  matchOperator(...ops: string[]) {
    const token = this.peek();
    if (token?.kind !== "operator") return undefined;
    if (!ops.includes(token.value)) return undefined;
    this.next();
    return token.value;
  }

  matchParen(value: "(" | ")") {
    const token = this.peek();
    if (token?.kind !== "paren" || token.value !== value) return false;
    this.next();
    return true;
  }

  matchComma() {
    const token = this.peek();
    if (token?.kind !== "comma") return false;
    this.next();
    return true;
  }
}

const gcd = (a: number, b: number) => {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y !== 0) {
    const r = x % y;
    x = y;
    y = r;
  }
  return x || 1;
};

const lcm = (a: number, b: number) => {
  const x = Math.trunc(a);
  const y = Math.trunc(b);
  if (x === 0 || y === 0) return 0;
  return Math.abs((x / gcd(x, y)) * y);
};

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  abs: (x) => Math.abs(x),
  sign: (x) => (x === 0 ? 0 : x > 0 ? 1 : -1),
  pow: (x, n) => x ** n,
  gcd: (a, b) => gcd(a, b),
  lcm: (a, b) => lcm(a, b)
};

const asNumber = (value: EvaluationValue): number => {
  if (typeof value === "number") return value;
  return value ? 1 : 0;
};

const asBoolean = (value: EvaluationValue): boolean => {
  if (typeof value === "boolean") return value;
  return value !== 0;
};

const tokenize = (source: string) => {
  const out: Token[] = [];
  const input = source.trim();
  let i = 0;
  const twoCharOps = new Set(["<=", ">=", "==", "!=", "&&", "||"]);
  const oneCharOps = new Set(["+", "-", "*", "/", "%", "<", ">"]);
  while (i < input.length) {
    const c = input[i];
    if (/\s/u.test(c)) {
      i += 1;
      continue;
    }
    const two = input.slice(i, i + 2);
    if (twoCharOps.has(two)) {
      out.push({ kind: "operator", value: two });
      i += 2;
      continue;
    }
    if (oneCharOps.has(c)) {
      out.push({ kind: "operator", value: c });
      i += 1;
      continue;
    }
    if (c === "(" || c === ")") {
      out.push({ kind: "paren", value: c });
      i += 1;
      continue;
    }
    if (c === ",") {
      out.push({ kind: "comma" });
      i += 1;
      continue;
    }
    const numberMatch = input.slice(i).match(/^\d+(\.\d+)?/u);
    if (numberMatch) {
      out.push({ kind: "number", value: Number(numberMatch[0]) });
      i += numberMatch[0].length;
      continue;
    }
    const identMatch = input.slice(i).match(/^[A-Za-z_]\w*/u);
    if (identMatch) {
      out.push({ kind: "identifier", value: identMatch[0] });
      i += identMatch[0].length;
      continue;
    }
    throw new Error(`Unsupported token: ${c}`);
  }
  return out;
};

const parsePrimary = (cursor: Cursor, vars: VariableMap): EvaluationValue => {
  const token = cursor.peek();
  if (!token) throw new Error("Unexpected end of expression");
  if (token.kind === "number") {
    cursor.next();
    return token.value;
  }
  if (token.kind === "identifier") {
    cursor.next();
    if (cursor.matchParen("(")) {
      const fn = FUNCTIONS[token.value];
      if (!fn) throw new Error(`Unsupported function: ${token.value}`);
      const args: number[] = [];
      if (!cursor.matchParen(")")) {
        do {
          args.push(asNumber(parseLogicalOr(cursor, vars)));
        } while (cursor.matchComma());
        if (!cursor.matchParen(")")) {
          throw new Error("Expected closing parenthesis");
        }
      }
      return fn(...args);
    }
    const value = vars[token.value];
    if (typeof value !== "number") {
      throw new Error(`Unknown variable: ${token.value}`);
    }
    return value;
  }
  if (cursor.matchParen("(")) {
    const value = parseLogicalOr(cursor, vars);
    if (!cursor.matchParen(")")) throw new Error("Expected closing parenthesis");
    return value;
  }
  throw new Error("Invalid expression");
};

const parseUnary = (cursor: Cursor, vars: VariableMap): EvaluationValue => {
  const op = cursor.matchOperator("+", "-");
  if (!op) return parsePrimary(cursor, vars);
  const value = asNumber(parseUnary(cursor, vars));
  return op === "-" ? -value : value;
};

const parseMulDiv = (cursor: Cursor, vars: VariableMap): EvaluationValue => {
  let left = parseUnary(cursor, vars);
  while (true) {
    const op = cursor.matchOperator("*", "/", "%");
    if (!op) break;
    const right = asNumber(parseUnary(cursor, vars));
    const leftValue = asNumber(left);
    if (op === "*") left = leftValue * right;
    if (op === "/") left = leftValue / right;
    if (op === "%") left = leftValue % right;
  }
  return left;
};

const parseAddSub = (cursor: Cursor, vars: VariableMap): EvaluationValue => {
  let left = parseMulDiv(cursor, vars);
  while (true) {
    const op = cursor.matchOperator("+", "-");
    if (!op) break;
    const right = asNumber(parseMulDiv(cursor, vars));
    const leftValue = asNumber(left);
    left = op === "+" ? leftValue + right : leftValue - right;
  }
  return left;
};

const parseComparison = (cursor: Cursor, vars: VariableMap): EvaluationValue => {
  let left = parseAddSub(cursor, vars);
  while (true) {
    const op = cursor.matchOperator("<", "<=", ">", ">=");
    if (!op) break;
    const right = asNumber(parseAddSub(cursor, vars));
    const leftValue = asNumber(left);
    left = op === "<" ? leftValue < right : op === "<=" ? leftValue <= right : op === ">" ? leftValue > right : leftValue >= right;
  }
  return left;
};

const parseEquality = (cursor: Cursor, vars: VariableMap): EvaluationValue => {
  let left = parseComparison(cursor, vars);
  while (true) {
    const op = cursor.matchOperator("==", "!=");
    if (!op) break;
    const right = parseComparison(cursor, vars);
    left = op === "==" ? asNumber(left) === asNumber(right) : asNumber(left) !== asNumber(right);
  }
  return left;
};

const parseLogicalAnd = (cursor: Cursor, vars: VariableMap): EvaluationValue => {
  let left = parseEquality(cursor, vars);
  while (cursor.matchOperator("&&")) {
    const right = parseEquality(cursor, vars);
    left = asBoolean(left) && asBoolean(right);
  }
  return left;
};

const parseLogicalOr = (cursor: Cursor, vars: VariableMap): EvaluationValue => {
  let left = parseLogicalAnd(cursor, vars);
  while (cursor.matchOperator("||")) {
    const right = parseLogicalAnd(cursor, vars);
    left = asBoolean(left) || asBoolean(right);
  }
  return left;
};

export const evaluateExpression = (source: string, vars: VariableMap): EvaluationValue => {
  const tokens = tokenize(source);
  const cursor = new Cursor(tokens);
  const value = parseLogicalOr(cursor, vars);
  if (cursor.peek()) {
    throw new Error(`Unexpected trailing token: ${JSON.stringify(cursor.peek())}`);
  }
  return value;
};

export const formatEvaluationValue = (value: EvaluationValue): string => {
  if (typeof value === "boolean") return value ? "1" : "0";
  if (!Number.isFinite(value)) return String(value);
  if (Math.abs(value - Math.round(value)) < 1e-10) return String(Math.round(value));
  return value.toFixed(10).replace(/\.?0+$/u, "");
};
