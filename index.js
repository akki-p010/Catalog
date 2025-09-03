// Prints c (constant term), and also reports points not lying on the curve with deviation.

import fs from "fs";

// ------------------ Utilities: BigInt fraction arithmetic ------------------
function bigIntAbs(x) { return x < 0n ? -x : x; }
function bigIntGcd(a, b) {
  a = bigIntAbs(a);
  b = bigIntAbs(b);
  while (b !== 0n) { const t = a % b; a = b; b = t; }
  return a;
}

class Fraction {
  constructor(n, d = 1n) {
    if (d === 0n) throw new Error("Division by zero in Fraction");
    if (d < 0n) { n = -n; d = -d; }
    const g = bigIntGcd(n, d);
    this.n = n / g;
    this.d = d / g;
  }
  add(o) { return new Fraction(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { return new Fraction(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { return new Fraction(this.n * o.n, this.d * o.d); }
  div(o) {
    if (o.n === 0n) throw new Error("Division by zero");
    let n = this.n * o.d;
    let d = this.d * o.n;
    if (d < 0n) { n = -n; d = -d; }
    return new Fraction(n, d);
  }
  isInteger() { return this.d === 1n; }
  toBigInt() {
    if (!this.isInteger()) throw new Error("Fraction is not an integer");
    return this.n;
  }
  toString() { return this.isInteger() ? this.n.toString() : `${this.n}/${this.d}`; }
}

// ------------------ Base decoder ------------------
function charToVal(ch) {
  const c = ch.toLowerCase();
  if (c >= '0' && c <= '9') return c.charCodeAt(0) - '0'.charCodeAt(0);
  if (c >= 'a' && c <= 'z') return 10 + (c.charCodeAt(0) - 'a'.charCodeAt(0));
  throw new Error(`Invalid digit '${ch}'`);
}
function decodeBaseStringToBigInt(valueStr, baseNum) {
  const B = BigInt(baseNum);
  let acc = 0n;
  for (const ch of valueStr.trim()) {
    const v = charToVal(ch);
    if (v >= baseNum) throw new Error(`Digit '${ch}' not valid for base ${baseNum}`);
    acc = acc * B + BigInt(v);
  }
  return acc;
}

// ------------------ Lagrange interpolation ------------------
function lagrange(points, xval) {
  let res = new Fraction(0n, 1n);
  for (let i = 0; i < points.length; i++) {
    const [xi, yi] = points[i];
    let term = new Fraction(yi, 1n);
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue;
      const [xj] = points[j];
      term = term.mul(new Fraction(xval - xj, 1n)).div(new Fraction(xi - xj, 1n));
    }
    res = res.add(term);
  }
  return res;
}
function lagrangeAtZero(points) { return lagrange(points, 0n); }

// ------------------ Main ------------------
function main() {
  const file = process.argv[2] || "input1.json";
  const data = JSON.parse(fs.readFileSync(file, "utf-8"));

  const k = Number(data.keys.k);
  if (!Number.isInteger(k) || k < 2) throw new Error("Invalid k");

  const points = [];
  for (const key of Object.keys(data)) {
    if (key === "keys") continue;
    const ent = data[key];
    if (!ent) continue;
    const x = BigInt(key);
    const baseNum = Number(ent.base);
    const y = decodeBaseStringToBigInt(ent.value, baseNum);
    points.push([x, y]);
  }
  if (points.length < k) throw new Error("Not enough points");

  points.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const kpoints = points.slice(0, k);

  const secretFrac = lagrangeAtZero(kpoints);
  console.log("Secret c =", secretFrac.toString());

  // ---------- Check all points ----------
  console.log("\nChecking all points:");
  for (const [x, y] of points) {
    const predFrac = lagrange(kpoints, x);
    if (!predFrac.isInteger()) {
      console.log(`x=${x} → predicted non-integer ${predFrac.toString()} (unexpected)`);
      continue;
    }
    const pred = predFrac.toBigInt();
    if (pred !== y) {
      const deviation = y - pred;
      console.log(`Point (x=${x}, y=${y}) deviates by ${deviation}`);
    }
  }
}

main();
