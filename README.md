# my-full-json-path-gadget

Maps between positions in a JSON file and the JSON paths at those positions, in
both directions. It reads the raw text rather than a parsed object, so the line
and column numbers refer to the file as written.

## Usage

```bash
# Path at a line
node src/json-path-tool.js <json-file> <line>

# Path at an exact position (disambiguates compact / minified JSON)
node src/json-path-tool.js <json-file> <line>:<column>

# Source span of a path
node src/json-path-tool.js <json-file> <json.path>
```

## Examples

```bash
$ node src/json-path-tool.js sample.json 10
users[0].profile.address.street

$ node src/json-path-tool.js sample.json 15
users[0].profile.preferences[0]

$ node src/json-path-tool.js sample.json users[0].profile.address
Lines 9-13 (9:20 to 13:10)

$ node src/json-path-tool.js sample.json 1
(root)
```

With everything on one line, the column picks out the value:

```bash
$ cat compact.json
{"a":1,"b":2,"c":3}

$ node src/json-path-tool.js compact.json 1:12
b
```

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Found; the result is on stdout |
| 1 | Bad usage, missing file, or invalid JSON (message on stderr) |
| 2 | Valid file, but nothing at the requested line/column/path |

## Behaviour notes

- **Invalid JSON is rejected up front.** The file is validated before any path
  work, so a malformed document produces an error naming the offending line and
  column instead of silently wrong paths.
- **Escapes in keys and values are decoded.** A key written as `"k\"x"` is
  reported as `k"x`.
- **A line resolves to the deepest value on it.** When several values at the
  same nesting depth share a line, the first one wins; add `:<column>` to pick a
  specific one.
- **Spans cover values, not keys.** A column pointing at the key text of
  `"a": 1` resolves to the enclosing object, not to `a`. Point at the value.
- **Path syntax is `a.b[0].c`.** Keys containing `.`, `[`, or `]` cannot be
  round-tripped through this syntax; they still work for line-to-path lookups,
  just not as path-to-line input.

## Layout

```
src/
  json-path-tool.js     CLI
  utils/
    json-utils.js       parser and lookups, importable on its own
sample.json             example document used by the docs above
```

`json-utils.js` exports `buildLineMap`, `findPathForLine`, `findLineForPath`,
`formatPath`, `parsePath`, `containsPosition`, `loadJsonFile`, and the
`JsonParseError` type, so the mapping can be reused without the CLI.
