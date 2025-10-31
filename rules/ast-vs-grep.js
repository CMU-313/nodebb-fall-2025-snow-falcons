// 1) Real eval call (should be flagged by Semgrep and grep)
eval('1 + 1');

// 2) The string "eval(...)" (Semgrep should NOT flag; grep will match)
const s = "do not run eval('2+2') here";

// 3) Member call named eval (Semgrep will flag with basic pattern)
obj.eval('3 + 3');

// 4) Weird formatting across newlines (AST stable; grep may miss)
eval
(
  '4 + 4'
);


