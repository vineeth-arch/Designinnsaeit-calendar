// Compares two email HTML fragments structurally, so the golden tests fail on any real difference
// (tag, attribute, style value, text) but not on serialisation noise (attribute order, style order,
// whitespace, trailing semicolons). Uses the DOMParser that vitest's jsdom environment provides.

export type Diff = { path: string; expected: string; actual: string };

const NBSP = " ";

function parseStyle(style: string | null): Record<string, string> {
  const map: Record<string, string> = {};
  for (const decl of (style ?? "").split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim().toLowerCase();
    const value = decl
      .slice(i + 1)
      .trim()
      .replace(/\s+/g, " ")
      .replace(/\s*,\s*/g, ",")
      .toLowerCase();
    if (prop) map[prop] = value;
  }
  return map;
}

function describe(el: Element): string {
  return `<${el.tagName.toLowerCase()}>`;
}

function textOf(node: Node): string {
  return (node.textContent ?? "").replace(/\s+/g, " ").trim().split(NBSP).join(NBSP);
}

function compare(
  expected: Element,
  actual: Element,
  path: string,
  out: Diff[],
  ignore: (p: string, attr: string) => boolean
) {
  if (expected.tagName !== actual.tagName) {
    out.push({ path, expected: describe(expected), actual: describe(actual) });
    return;
  }
  const attrNames = new Set([...expected.getAttributeNames(), ...actual.getAttributeNames()]);
  for (const name of attrNames) {
    if (ignore(path, name)) continue;
    if (name === "style") {
      const e = parseStyle(expected.getAttribute("style"));
      const a = parseStyle(actual.getAttribute("style"));
      for (const prop of new Set([...Object.keys(e), ...Object.keys(a)])) {
        if (e[prop] !== a[prop])
          out.push({
            path: `${path}@style.${prop}`,
            expected: e[prop] ?? "(none)",
            actual: a[prop] ?? "(none)",
          });
      }
      continue;
    }
    const e = (expected.getAttribute(name) ?? "(none)").trim();
    const a = (actual.getAttribute(name) ?? "(none)").trim();
    if (e.toLowerCase() !== a.toLowerCase()) out.push({ path: `${path}@${name}`, expected: e, actual: a });
  }
  const ec = [...expected.childNodes].filter(
    (n) => n.nodeType === 1 || (n.nodeType === 3 && textOf(n) !== "")
  );
  const ac = [...actual.childNodes].filter((n) => n.nodeType === 1 || (n.nodeType === 3 && textOf(n) !== ""));
  if (ec.length !== ac.length) {
    out.push({ path: `${path}/children`, expected: String(ec.length), actual: String(ac.length) });
    return;
  }
  ec.forEach((e, i) => {
    const a = ac[i];
    const here = `${path}/${e.nodeType === 1 ? `${(e as Element).tagName.toLowerCase()}[${i}]` : `#text[${i}]`}`;
    if (e.nodeType === 3 || a.nodeType === 3) {
      if (e.nodeType !== a.nodeType || textOf(e) !== textOf(a))
        out.push({ path: here, expected: textOf(e), actual: textOf(a) });
      return;
    }
    compare(e as Element, a as Element, here, out, ignore);
  });
}

function fragment(html: string): Element {
  const doc = new DOMParser().parseFromString(
    `<!doctype html><html><body>${html}</body></html>`,
    "text/html"
  );
  return doc.body;
}

/** Body of a full email document, or the fragment itself. */
export function bodyFragment(html: string): string {
  const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return m ? m[1] : html;
}

export function diffHtml(
  expectedHtml: string,
  actualHtml: string,
  ignore: (path: string, attr: string) => boolean = () => false
): Diff[] {
  const out: Diff[] = [];
  compare(fragment(expectedHtml), fragment(actualHtml), "body", out, ignore);
  return out;
}
