import prettierDoc from "prettier/doc";
import * as liquidsoap from "../dist/liquidsoap.cjs";
import { remapOffsets } from "./remap_offsets.js";

const {
  builders: { group, trim, indent, join, hardline, line, softline, ifBreak, fill },
} = prettierDoc;

export const languages = [
  {
    name: "liquidsoap",
    parsers: ["liquidsoap"],
    extensions: [".liq"],
    vscodeLanguageIds: ["liquidsoap"],
  },
];


export const parsers = {
  liquidsoap: {
    parse: (text) => {
      const result = liquidsoap.default.lang.parse(text);
      remapOffsets(result, text);
      result.ast.comments = result.comments;
      return result.ast;
    },
    astFormat: "liquidsoap",
    locStart: (node) => node.position?.[0]?.cnum ?? node.start ?? 0,
    locEnd: (node) => node.position?.[1]?.cnum ?? node.end ?? 0,
  },
};

const printStmts = (stmts, printed) => {
  if (!stmts || stmts.length === 0) return "";
  const result = [];
  for (let i = 0; i < printed.length; i++) {
    if (i > 0) {
      result.push(hardline);
      const prev = stmts[i - 1];
      const cur = stmts[i];
      if (
        prev.position?.[1]?.lnum &&
        cur.position?.[0]?.lnum &&
        cur.position[0].lnum - prev.position[1].lnum > 1
      ) {
        result.push(hardline);
      }
    }
    result.push(printed[i]);
  }
  return result;
};

const printString = (str) => {
  if (/(?<!\\)\n/.test(str)) return str;
  if (!/\s/.test(str)) return str;

  return fill(
    str
      .replace(/\\\n\s*/g, "")
      .split(/(\s)/)
      .map((s) => (s === " " ? ifBreak([" ", "\\", hardline, " "], " ") : s)),
  );
};

const print = (path, options, print) => {
  const node = path.getValue();

  const printStatements = (field) =>
    printStmts(node[field], path.map(print, field));

  const printIfDef = (...ifdef) => [
    group([trim, ...ifdef, hardline]),
    group([path.call(print, "then_block")]),
    ...(node.else_block
      ? [
          group([hardline, trim, "%else", hardline]),
          group([path.call(print, "else_block")]),
        ]
      : []),
    group([hardline, trim, "%endif"]),
  ];

  const printPat = () => {
    if (!node.cast) return print("pat");

    return group([
      "(",
      group([indent([softline, print("pat")]), line, ":"]),
      indent([line, print("cast")]),
      softline,
      ")",
    ]);
  };

  const printEllipsis = (p) => {
    return group(["...", print(p)]);
  };

  const printSeq = (pos1, content1, pos2, content2) => {
    const posBefore = pos1?.[1]?.lnum;
    const posAfter = pos2?.[0]?.lnum;
    const blank =
      posBefore && posAfter && posAfter - posBefore > 1 ? [hardline] : [];
    return [content1, hardline, ...blank, content2];
  };

  const joinArgs = (p) => join([",", line], path.map(print, p));

  const printOptTyp = (name) => [
    ...(node.typ ? ["(", softline] : []),
    name === "label" ? node.label : print(name),
    ...(node.typ ? [":", softline, print("typ"), softline, ")"] : []),
  ];

  const printLabel = () =>
    node.label === ""
      ? printOptTyp("as_variable")
      : [
          "~",
          ...(node.as_variable
            ? [node.label, ":", printOptTyp("as_variable")]
            : printOptTyp("label")),
        ];

  const printFunArg = () =>
    group([...printLabel(), ...(node.default ? ["=", print("default")] : [])]);

  const printAppArg = () => {
    if (node.label) return group([node.label, "=", print("value")]);
    return print("value");
  };

  const printTypeAnnotation = () => {
    switch (node.subtype) {
      case "named":
        return node.value;
      case "nullable":
        return [print("value"), "?"];
      case "typeof":
        return group(["typeof", " ", print("value")]);
      case "fun_arg":
        return [
          ...(node.label ? ["~", node.label] : []),
          print("value"),
          ...(node.optional ? ["?"] : []),
        ];
      case "list":
        return group(["[", indent([softline, print("value")]), softline, "]"]);
      case "ref":
        return group(["ref", "(", print("value"), ")"]);
      case "getter":
        return group(["getter", "(", print("value"), ")"]);
      case "json_object":
        return [
          "[",
          "(",
          group([indent([softline, "string", "*", print("value")]), softline]),
          ")",
          "]",
          " ",
          "as",
          " ",
          "json.object",
        ];
      case "tuple":
        return group([
          "(",
          indent(
            group([
              softline,
              join([line, "*", line], path.map(print, "value")),
            ]),
          ),
          softline,
          ")",
        ]);
      case "arrow":
        return [
          group([
            "(",
            indent([softline, joinArgs("args")]),
            softline,
            ")",
          ]),
          "->",
          print("value"),
        ];
      case "method_annotation":
        return [
          ...(node.json_name
            ? [JSON.stringify(node.json_name), " ", "as", " "]
            : []),
          node.name,
          ...(node.optional ? ["?"] : []),
          ":",
          " ",
          print("value"),
        ];
      case "record":
        return group([
          "{",
          group([
            indent([softline, joinArgs("value")]),
            softline,
          ]),
          "}",
        ]);
      case "method":
        return [
          print("base"),
          ".",
          "{",
          group([indent([line, joinArgs("value")]), line]),
          "}",
        ];
      case "invoke":
        return group([print("value"), indent([softline, ".", node.method])]);
      case "source_annotation":
        if (node.abstract) return ["(", "_", ")"];
        return node.value.length === 0
          ? []
          : group([
              "(",
              indent([
                softline,
                join(
                  [",", line],
                  [
                    ...path.map(print, "value"),
                    ...(node.extensible ? ["..."] : []),
                  ],
                ),
              ]),
              softline,
              ")",
            ]);
      case "source_track_annotation":
        return [
          node.name,
          "=",
          node.value,
          ...(node.params.length === 0
            ? []
            : [
                group([
                  "(",
                  indent([softline, joinArgs("params")]),
                  softline,
                  ")",
                ]),
              ]),
        ];
      case "source":
        return [node.base, print("value")];
      default:
        throw `Unknown node: ${JSON.stringify(node, null, 2)}`;
    }
  };

  const printValue = () => {
    switch (node.type) {
      case "program":
        return printStatements("body");
      case "while": {
        const [whileHeader, whileBody] = path.map(print, "parts");
        return group([whileHeader, whileBody, line, "end"]);
      }
      case "while_header":
        return ["while", group([indent([line, print("condition")]), line])];
      case "while_body":
        return ["do", group([indent([line, printStatements("body")]), line])];
      case "for": {
        const [forHeader, forBody] = path.map(print, "parts");
        return group([forHeader, forBody, line, "end"]);
      }
      case "for_header":
        return group([
          "for",
          " ",
          group([node.variable, " ", "=", indent([line, print("from")]), line]),
          "to",
          indent([line, print("to")]),
          line,
        ]);
      case "for_body":
        return ["do", indent([line, printStatements("body")]), line];
      case "iterable_for": {
        const [iterHeader, iterBody] = path.map(print, "parts");
        return group([iterHeader, iterBody, line, "end"]);
      }
      case "iterable_for_header":
        return group([
          "for",
          " ",
          node.variable,
          " ",
          "=",
          indent([line, print("iterator")]),
          line,
        ]);
      case "iterable_for_body":
        return ["do", indent([line, printStatements("body")]), line];
      case "open":
        return ["open", " ", print("left")];
      case "if_def":
        return printIfDef(
          node.negative ? "%ifndef" : "%ifdef",
          " ",
          node.condition,
        );
      case "if_encoder":
        return printIfDef(
          node.negative ? "%ifnencoder" : "%ifencoder",
          " ",
          "%",
          node.condition,
        );
      case "if_version":
        return printIfDef("%ifversion", " ", node.opt, " ", node.version);
      case "ifdef_block":
        return printStmts(node.body, path.map(print, "body"));
      case "negative":
        return group(["-", print("value")]);
      case "append":
        return group([print("left"), "::", print("right")]);
      case "not":
        return group(["not", " ", print("value")]);
      case "var":
        return node.value === "_null" ? "null" : node.value;
      case "string":
        return printString(node.value);
      case "raw_string":
        return `{${node.id}|${node.value}|${node.id}}`;
      case "ground":
        return node.value;
      case "term":
        return print("value");
      case "ellipsis":
        return printEllipsis("value");
      case "argsof":
        return group([
          "%argsof",
          "(",
          group([
            node.source,
            ...(node.only.length !== 0 || node.except.length !== 0
              ? [
                  indent([
                    "[",
                    softline,
                    join(
                      [",", softline],
                      [...node.only, ...node.except.map((s) => `!${s}`)],
                    ),
                    "]",
                  ]),
                  softline,
                ]
              : []),
          ]),
          ")",
        ]);
      case "get":
        return group(["!", print("value")]);
      case "ptuple":
      case "tuple":
        return group([
          "(",
          group([
            indent([softline, joinArgs("value")]),
            softline,
          ]),
          ")",
        ]);
      case "list":
        return group([
          "[",
          indent(group([softline, joinArgs("value")])),
          softline,
          "]",
        ]);
      case "pmeth":
        return group([
          "{",
          indent([softline, joinArgs("value")]),
          softline,
          "}",
        ]);
      case "pvar":
        return group([indent(join([softline, "."], node.value))]);
      case "plist":
        return group([
          "[",
          indent([
            softline,
            join(
              [",", line],
              [
                ...path.map(print, "left"),
                ...(node.middle ? [group(["...", node.middle])] : []),
                ...path.map(print, "right"),
              ],
            ),
          ]),
          softline,
          "]",
        ]);
      case "invoke": {
        const invoke_meth = [
          ...(node.optional ? ["?"] : []),
          ".",
          print("meth"),
        ];

        return group([
          print("invoked"),
          ...(node.meth.type === "var" ? [indent(invoke_meth)] : invoke_meth),
        ]);
      }
      case "type_annotation":
        return printTypeAnnotation();
      case "parenthesis":
        return group(["(", indent([softline, print("value")]), softline, ")"]);
      case "block":
        return group(["begin", indent([line, printStatements("body")]), line, "end"]);
      case "cast":
        return group([
          "(",
          group([indent([softline, print("left")]), line, ":"]),
          indent([line, print("right")]),
          softline,
          ")",
        ]);
      case "fun":
        return group([
          "fun",
          " ",
          group([
            "(",
            indent([softline, joinArgs("arguments")]),
            softline,
            ")",
            " ",
            "->",
          ]),
          indent([line, printStatements("body")]),
        ]);
      case "fun_arg":
        return printFunArg();
      case "app_arg":
        return printAppArg();
      case "app": {
        if (node.args.length === 0) {
          return group([print("op"), "(", ")"]);
        }
        const printedArgs = path.map(print, "args");
        return group([
          print("op"),
          "(",
          indent([softline, join([",", line], printedArgs)]),
          softline,
          ")",
        ]);
      }
      case "eof":
        return "";
      case "seq":
        if (node.right.type === "eof") return print("left");
        return printSeq(
          node.left.position,
          print("left"),
          node.right.position,
          print("right"),
        );
      case "def":
        return group([
          "def",
          " ",
          ...(node.decoration ? [print("decoration"), " "] : []),
          printPat(),
          ...(node.arglist
            ? [
                "(",
                group([
                  indent([softline, joinArgs("arglist")]),
                  softline,
                ]),
                ")",
              ]
            : []),
          " ",
          "=",
          group([
            indent([hardline, printStatements("body")]),
            hardline,
            "end",
          ]),
        ]);
      case "let":
        return group([
          "let",
          " ",
          ...(node.decoration ? [print("decoration"), " "] : []),
          printPat(),
          " ",
          "=",
          group([indent([line, print("definition")])]),
        ]);
      case "binding":
        return group([
          printPat(),
          " ",
          "=",
          group([indent([line, print("definition")])]),
        ]);
      case "simple_fun":
        return group(["{", indent([softline, printStatements("body")]), softline, "}"]);
      case "if": {
        const parts = [
          "if",
          indent([line, print("condition")]),
          line,
          path.call(print, "then_block"),
        ];
        for (let i = 0; i < node.elsif.length; i++) {
          parts.push(line, path.call(print, "elsif", i));
        }
        if (node.else_block) {
          parts.push(line, path.call(print, "else_block"));
        }
        parts.push(line, "end");
        return group(parts);
      }
      case "then_block":
        return [
          "then",
          indent([line, printStmts(node.body, path.map(print, "body"))]),
        ];
      case "else_block":
        return [
          "else",
          indent([line, printStmts(node.body, path.map(print, "body"))]),
        ];
      case "elsif": {
        return [
          "elsif",
          indent([line, print("condition")]),
          line,
          "then",
          indent([line, printStmts(node.body, path.map(print, "body"))]),
        ];
      }
      case "inline_if":
        return group([
          print("condition"),
          indent([line, "? ", print("then"), line, ": ", print("else")]),
        ]);
      case "infix":
        return group([
          print("left"),
          " ",
          node.op,
          indent([line, print("right")]),
        ]);
      case "bool":
        return group(join([line, node.op, " "], path.map(print, "value")));
      case "string_interpolation":
        return path.map(print, "value");
      case "interpolated_string":
        return printString(node.value);
      case "interpolated_term":
        return group(["#{", indent([softline, print("value")]), softline, "}"]);
      case "coalesce":
        return group([print("left"), indent([line, "?? ", print("right")])]);
      case "assoc":
        return group([
          print("left"),
          "[",
          indent([softline, print("right")]),
          softline,
          "]",
        ]);
      case "include_lib":
        return group([trim, "%include", " ", "<", node.value, ">"]);
      case "include":
        return group([trim, "%include", " ", '"', node.value, '"']);
      case "include_extra":
        return group([trim, "%include_extra", " ", '"', node.value, '"']);
      case "time_interval":
        return [print("left"), "-", print("right")];
      case "time":
        return [
          ...(typeof node.week === "number" ? ["" + node.week, "w"] : []),
          ...(typeof node.hours === "number" ? ["" + node.hours, "h"] : []),
          ...(typeof node.minutes === "number" ? ["" + node.minutes, "m"] : []),
          ...(typeof node.seconds === "number" ? ["" + node.seconds, "s"] : []),
        ];
      case "encoder":
        return [
          "%",
          node.label,
          ...(node.params.length === 0
            ? []
            : [
                group([
                  "(",
                  indent([softline, joinArgs("params")]),
                  softline,
                  ")",
                ]),
              ]),
        ];
      case "regexp":
        return group(["r/", node.name, "/", ...node.flags]);
      case "methods":
        return [
          ...(node.base ? [print("base"), "."] : []),
          group([
            "{",
            indent([softline, joinArgs("methods")]),
            softline,
            "}",
          ]),
        ];
      case "method":
        return group([node.name, " ", "=", indent([line, print("value")])]);
      case "try":
        return group([...path.map(print, "parts"), line, "end"]);
      case "try_body":
        return [
          "try",
          indent(group([line, printStatements("body")], { shouldBreak: true })),
        ];
      case "try_catch":
        return [
          line,
          group([
            "catch",
            line,
            node.variable,
            ...(node.errors_list
              ? [
                  group([
                    line,
                    ":",
                    line,
                    print("errors_list"),
                  ]),
                ]
              : []),
            line,
            "do",
          ]),
          indent(group([line, printStatements("body")], { shouldBreak: true })),
        ];
      case "try_finally":
        return [
          line,
          "finally",
          indent(group([line, printStatements("body")], { shouldBreak: true })),
        ];
      case "null":
        return "null";
      default:
        throw `Unknown node: ${JSON.stringify(node, null, 2)}`;
    }
  };

  return [printValue(), ...(path.stack.length == 1 ? [hardline] : [])];
};

export const printers = {
  liquidsoap: {
    print,
    canAttachComment: (node) => node.position != null && node.type !== "eof",
    isBlockComment: () => false,
    printComment: (path) => {
      const value = path.getValue().value;
      const lines = value.split("\n");
      return lines.length === 1 ? value : join(hardline, lines);
    },
    handleComments: {},
    getCommentChildNodes: (node) => {
      if (
        [
          "program", "def", "fun", "rfun", "simple_fun", "block",
          "while_body", "for_body", "iterable_for_body",
          "try_body", "try_finally",
        ].includes(node.type)
      )
        return node.body;
      if (node.type === "if")
        return [
          node.condition,
          node.then_block,
          ...node.elsif,
          ...(node.else_block ? [node.else_block] : []),
        ];
      if (node.type === "then_block" || node.type === "else_block")
        return node.body;
      if (node.type === "elsif")
        return [node.condition, ...node.body];
      if (["while", "for", "iterable_for", "try"].includes(node.type))
        return node.parts;
      if (node.type === "while_header") return [node.condition];
      if (node.type === "for_header") return [node.from, node.to];
      if (node.type === "iterable_for_header") return [node.iterator];
      if (node.type === "try_catch")
        return [
          ...(node.errors_list ? [node.errors_list] : []),
          ...node.body,
        ];
      if (["if_def", "if_version", "if_encoder"].includes(node.type))
        return [node.then_block, ...(node.else_block ? [node.else_block] : [])];
      if (node.type === "ifdef_block") return node.body;
      if (node.type === "app") return [node.op, ...node.args];
      return null;
    },
  },
};

export default { languages, parsers, printers };
