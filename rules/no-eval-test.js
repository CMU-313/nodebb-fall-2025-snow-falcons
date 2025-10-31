function runUnsafe(code) {
  return eval(code);
}

runUnsafe('1 + 1');

globalThis['eval']('2 + 2');

new Function('return 3')();


