// OCaml's sedlex lexer counts UTF-8 bytes; prettier indexes into the JS string
// using UTF-16 char offsets.  For ASCII-only files the two coincide, but any
// multi-byte character (e.g. π = 2 bytes, 1 JS char) introduces a drift that
// breaks prettier's ownLine / endOfLine comment classification.
//
// Strategy: one AST walk to collect all byte offsets needing remapping, then
// one linear UTF-8 scan to resolve them — no large intermediate array.

// Walk the AST and register a setter for each byte-offset field found.
// setters: Map<byteOffset, Array<(charIdx: number) => void>>
const collectOffsets = (node, setters) => {
  if (node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectOffsets(item, setters);
    return;
  }
  for (const key of Object.keys(node)) {
    if (
      (key === "cnum" || key === "bol" || key === "start" || key === "end") &&
      typeof node[key] === "number"
    ) {
      const byteOffset = node[key];
      if (!setters.has(byteOffset)) setters.set(byteOffset, []);
      setters.get(byteOffset).push((charIdx) => {
        node[key] = charIdx;
      });
    } else {
      collectOffsets(node[key], setters);
    }
  }
};

export const remapOffsets = (result, text) => {
  // Step 1: collect all byte offsets and their setters.
  const setters = new Map();
  collectOffsets(result, setters);
  if (setters.size === 0) return;

  // Step 2: sort offsets so we can walk them in order.
  const targets = [...setters.keys()].sort((a, b) => a - b);

  // Step 3: single linear scan through UTF-8 bytes, resolving setters on the fly.
  const utf8 = new TextEncoder().encode(text);
  let charIdx = 0;
  let targetIdx = 0;

  for (let byteIdx = 0; byteIdx <= utf8.length; ) {
    // Resolve all setters whose target matches the current byte position.
    while (targetIdx < targets.length && targets[targetIdx] === byteIdx) {
      for (const setter of setters.get(targets[targetIdx])) setter(charIdx);
      targetIdx++;
    }
    if (targetIdx >= targets.length || byteIdx >= utf8.length) break;

    const b = utf8[byteIdx];
    if (b < 0x80) {
      byteIdx += 1;
      charIdx += 1;
    } else if (b < 0xe0) {
      byteIdx += 2;
      charIdx += 1;
    } else if (b < 0xf0) {
      byteIdx += 3;
      charIdx += 1;
    } else {
      byteIdx += 4;
      charIdx += 2; // Surrogate pair: 4-byte UTF-8 = 2 UTF-16 code units
    }
  }
};
