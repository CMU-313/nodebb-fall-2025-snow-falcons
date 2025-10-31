# real eval call (should be flagged by Semgrep)
eval("1 + 1")

# string literal containing the word eval (Semgrep should NOT flag)
s = "do not run eval('2+2') here"

# computed access via getattr (basic rule will MISS this)
getattr(__builtins__, 'eval')("3 + 3")


