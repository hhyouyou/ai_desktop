/**
 * 安全表达式解析器：递归下降，不使用 eval。
 * 支持 + - * / ( ) ^ %（百分号后缀）、小数、正负号。
 */

type Token =
  | { type: "num"; value: number; pos: number }
  | { type: "op"; value: "+" | "-" | "*" | "/" | "^"; pos: number }
  | { type: "lparen"; pos: number }
  | { type: "rparen"; pos: number }
  | { type: "percent"; pos: number };

export type EvalResult =
  | { ok: true; value: number; display: string }
  | { ok: false; error: string };

class CalcError extends Error {}

export function evaluateExpression(input: string): EvalResult {
  const source = input.trim();
  if (!source) return { ok: false, error: "请输入要计算的表达式" };

  const tokens: Token[] = [];
  let i = 0;

  while (i < source.length) {
    const ch = source[i];

    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\u00a0") {
      i += 1;
      continue;
    }

    if (/[0-9.]/.test(ch)) {
      let j = i;
      let dots = 0;
      while (j < source.length && /[0-9.]/.test(source[j])) {
        if (source[j] === ".") dots += 1;
        j += 1;
      }
      const raw = source.slice(i, j);
      const value = Number(raw);
      if (dots > 1 || raw === "." || !Number.isFinite(value)) {
        return { ok: false, error: `无法识别数字“${raw}”` };
      }
      tokens.push({ type: "num", value, pos: i });
      i = j;
      continue;
    }

    const normalized =
      ch === "×" ? "*" : ch === "÷" ? "/" : ch === "−" ? "-" : ch === "（" ? "(" : ch === "）" ? ")" : ch;

    if (normalized === "(") {
      tokens.push({ type: "lparen", pos: i });
      i += 1;
      continue;
    }
    if (normalized === ")") {
      tokens.push({ type: "rparen", pos: i });
      i += 1;
      continue;
    }
    if (normalized === "%") {
      tokens.push({ type: "percent", pos: i });
      i += 1;
      continue;
    }
    if (normalized === "+" || normalized === "-" || normalized === "*" || normalized === "/" || normalized === "^") {
      tokens.push({ type: "op", value: normalized, pos: i });
      i += 1;
      continue;
    }

    return { ok: false, error: `不支持的字符“${ch}”，只能使用数字和 + - * / ( ) ^ %` };
  }

  if (tokens.length === 0) return { ok: false, error: "请输入要计算的表达式" };

  try {
    const parser = new Parser(tokens);
    const value = parser.parseAll();
    if (!Number.isFinite(value)) return { ok: false, error: "结果超出可表示范围" };
    const normalized = Object.is(value, -0) ? 0 : value;
    return { ok: true, value: normalized, display: formatCalcNumber(normalized) };
  } catch (error) {
    return { ok: false, error: error instanceof CalcError ? error.message : "表达式有误，请检查括号和运算符" };
  }
}

class Parser {
  private index = 0;

  constructor(private readonly tokens: Token[]) {}

  parseAll(): number {
    const value = this.parseAdditive();
    if (this.index < this.tokens.length) {
      const rest = this.tokens[this.index];
      throw new CalcError(rest.type === "rparen" ? "括号不匹配，多了右括号" : "表达式末尾有多余内容");
    }
    return value;
  }

  private peek(): Token | undefined {
    return this.tokens[this.index];
  }

  private parseAdditive(): number {
    let value = this.parseMultiplicative();
    for (;;) {
      const token = this.peek();
      if (token && token.type === "op" && (token.value === "+" || token.value === "-")) {
        this.index += 1;
        const right = this.parseMultiplicative();
        value = token.value === "+" ? value + right : value - right;
        continue;
      }
      return value;
    }
  }

  private parseMultiplicative(): number {
    let value = this.parseUnary();
    for (;;) {
      const token = this.peek();
      if (token && token.type === "op" && (token.value === "*" || token.value === "/")) {
        this.index += 1;
        const right = this.parseUnary();
        if (token.value === "/" && right === 0) throw new CalcError("除数不能为 0");
        value = token.value === "*" ? value * right : value / right;
        continue;
      }
      return value;
    }
  }

  private parseUnary(): number {
    const token = this.peek();
    if (token && token.type === "op" && (token.value === "+" || token.value === "-")) {
      this.index += 1;
      const value = this.parseUnary();
      return token.value === "-" ? -value : value;
    }
    return this.parsePower();
  }

  private parsePower(): number {
    const base = this.parsePostfix();
    const token = this.peek();
    if (token && token.type === "op" && token.value === "^") {
      this.index += 1;
      const exponent = this.parseUnary();
      const value = Math.pow(base, exponent);
      if (Number.isNaN(value)) throw new CalcError("幂运算结果无效（例如负数的非整数次幂）");
      return value;
    }
    return base;
  }

  private parsePostfix(): number {
    let value = this.parsePrimary();
    for (;;) {
      const token = this.peek();
      if (token && token.type === "percent") {
        this.index += 1;
        value /= 100;
        continue;
      }
      return value;
    }
  }

  private parsePrimary(): number {
    const token = this.peek();
    if (!token) throw new CalcError("表达式不完整，缺少数字");
    if (token.type === "num") {
      this.index += 1;
      return token.value;
    }
    if (token.type === "lparen") {
      this.index += 1;
      const value = this.parseAdditive();
      const closing = this.peek();
      if (!closing || closing.type !== "rparen") throw new CalcError("括号不匹配，缺少右括号");
      this.index += 1;
      return value;
    }
    if (token.type === "rparen") throw new CalcError("括号不匹配，多了右括号");
    if (token.type === "percent") throw new CalcError("百分号前面缺少数字");
    throw new CalcError("运算符位置不对，请检查表达式");
  }
}

/** 数字展示：整数加千位分隔，超大/超小用科学计数法，最多保留 12 位有效数字。 */
export function formatCalcNumber(value: number): string {
  if (!Number.isFinite(value)) return "错误";
  const abs = Math.abs(value);
  if (abs !== 0 && (abs >= 1e15 || abs < 1e-9)) {
    return value.toExponential(6).replace(/\.?0+e/, "e");
  }
  const rounded = Number(value.toPrecision(12));
  if (Number.isInteger(rounded) && Math.abs(rounded) < 1e15) {
    return rounded.toLocaleString("zh-CN", { maximumFractionDigits: 0 });
  }
  return String(rounded);
}

/** 去掉千位分隔，供“复用结果”写回表达式。 */
export function plainCalcNumber(value: number): string {
  return String(Number(value.toPrecision(12)));
}
