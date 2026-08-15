const fs = require('fs');
const path = require('path');

class JsonParseError extends Error {
    constructor(message, line, col) {
        super(line ? `${message} (line ${line}, column ${col})` : message);
        this.name = 'JsonParseError';
        this.line = line;
        this.col = col;
    }
}

// Walk the raw JSON text and record the source span of every value.
// Each span is { startLine, startCol, endLine, endCol, path }. Lines and
// columns are 1-based; startCol is the column of the value's first character
// and endCol is one column past its last, so a span covers [startCol, endCol).
function buildLineMap(jsonText) {
    const text = jsonText;
    let pos = 0;
    let line = 1;
    let col = 1;
    const ranges = [];

    function fail(message, atLine = line, atCol = col) {
        throw new JsonParseError(message, atLine, atCol);
    }

    // Single place where position advances, so line/col stay correct no matter
    // what we are consuming.
    function advance(count = 1) {
        for (let i = 0; i < count && pos < text.length; i++) {
            if (text[pos] === '\n') { line++; col = 1; }
            else col++;
            pos++;
        }
    }

    function skipWhitespace() {
        while (pos < text.length && /[ \t\r\n]/.test(text[pos])) advance();
    }

    // Consumes a quoted string and returns its decoded value, so keys and
    // values containing escapes (\" in particular) survive intact.
    function parseString() {
        const startLine = line;
        const startCol = col;
        if (text[pos] !== '"') fail('Expected a string');
        const start = pos;
        advance();
        while (pos < text.length && text[pos] !== '"') {
            if (text[pos] === '\\') advance(2);
            else advance();
        }
        if (pos >= text.length) fail('Unterminated string', startLine, startCol);
        advance();
        const raw = text.slice(start, pos);
        try {
            return JSON.parse(raw);
        } catch (err) {
            return fail(`Invalid string literal ${raw}`, startLine, startCol);
        }
    }

    function parseValue(pathArr) {
        skipWhitespace();
        const startLine = line;
        const startCol = col;

        if (text[pos] === '{') {
            advance();
            skipWhitespace();
            let first = true;
            while (pos < text.length && text[pos] !== '}') {
                if (!first) {
                    if (text[pos] !== ',') fail("Expected ',' or '}' in object");
                    advance();
                    skipWhitespace();
                }
                first = false;
                const key = parseString();
                skipWhitespace();
                if (text[pos] !== ':') fail("Expected ':' after object key");
                advance();
                parseValue([...pathArr, key]);
                skipWhitespace();
            }
            if (text[pos] !== '}') fail('Unterminated object', startLine, startCol);
            advance();
        } else if (text[pos] === '[') {
            advance();
            skipWhitespace();
            let idx = 0;
            let first = true;
            while (pos < text.length && text[pos] !== ']') {
                if (!first) {
                    if (text[pos] !== ',') fail("Expected ',' or ']' in array");
                    advance();
                    skipWhitespace();
                }
                first = false;
                parseValue([...pathArr, idx]);
                idx++;
                skipWhitespace();
            }
            if (text[pos] !== ']') fail('Unterminated array', startLine, startCol);
            advance();
        } else if (text[pos] === '"') {
            parseString();
        } else {
            // Primitive: number, true, false, null
            const start = pos;
            while (pos < text.length && !/[\s,\]\}]/.test(text[pos])) advance();
            const literal = text.slice(start, pos);
            const valid = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/.test(literal)
                || literal === 'true' || literal === 'false' || literal === 'null';
            if (!valid) fail(`Invalid value ${JSON.stringify(literal)}`, startLine, startCol);
        }

        ranges.push({ startLine, startCol, endLine: line, endCol: col, path: pathArr });
    }

    skipWhitespace();
    if (pos >= text.length) fail('Empty JSON document');
    parseValue([]);
    skipWhitespace();
    if (pos < text.length) fail('Unexpected content after the top-level value');
    return ranges;
}

function containsPosition(range, lineNumber, colNumber) {
    if (lineNumber < range.startLine || lineNumber > range.endLine) return false;
    if (colNumber === undefined) return true;
    if (lineNumber === range.startLine && colNumber < range.startCol) return false;
    if (lineNumber === range.endLine && colNumber >= range.endCol) return false;
    return true;
}

// Finds the deepest value covering the position. Pass colNumber to
// disambiguate several values sharing one line (compact or minified JSON);
// without it, the first value at the deepest nesting level on that line wins.
function findPathForLine(ranges, lineNumber, colNumber) {
    let best = null;
    for (const r of ranges) {
        if (!containsPosition(r, lineNumber, colNumber)) continue;
        if (!best || r.path.length > best.path.length) best = r;
    }
    return best ? best.path : null;
}

function formatPath(pathArr) {
    if (!pathArr || !pathArr.length) return '';
    let out = '';
    for (const p of pathArr) {
        if (typeof p === 'number') out += `[${p}]`;
        else out += (out ? '.' : '') + p;
    }
    return out;
}

function parsePath(pathStr) {
    const parts = [];
    const regex = /([^\.\[\]]+)|\[(\d+)\]/g;
    let match;
    while ((match = regex.exec(pathStr)) !== null) {
        if (match[1]) parts.push(match[1]);
        else if (match[2]) parts.push(parseInt(match[2]));
    }
    return parts;
}

function findLineForPath(ranges, pathStr) {
    const targetPath = parsePath(pathStr);
    const target = JSON.stringify(targetPath);
    for (const r of ranges) {
        if (JSON.stringify(r.path) === target) {
            return {
                startLine: r.startLine,
                startCol: r.startCol,
                endLine: r.endLine,
                endCol: r.endCol
            };
        }
    }
    return null;
}

// Reads the file and rejects malformed JSON up front, so a bad document
// produces a clear error instead of silently wrong paths.
function loadJsonFile(filePath) {
    const absPath = path.resolve(filePath);
    let text;
    try {
        text = fs.readFileSync(absPath, 'utf-8');
    } catch (err) {
        if (err.code === 'ENOENT') throw new JsonParseError(`File not found: ${absPath}`);
        if (err.code === 'EISDIR') throw new JsonParseError(`Not a file: ${absPath}`);
        throw err;
    }
    try {
        JSON.parse(text);
    } catch (err) {
        throw new JsonParseError(`${absPath} is not valid JSON: ${err.message}`);
    }
    return text;
}

module.exports = {
    JsonParseError,
    buildLineMap,
    containsPosition,
    findPathForLine,
    formatPath,
    parsePath,
    findLineForPath,
    loadJsonFile
};
