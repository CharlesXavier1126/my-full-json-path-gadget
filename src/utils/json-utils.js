const fs = require('fs');

// Helper to recursively walk through the JSON object and record line ranges for each value
function buildLineMap(jsonText) {
    const lines = jsonText.split(/\r?\n/);
    const text = jsonText;
    let pos = 0;
    let line = 1;
    let col = 1;
    // Map: { startLine, endLine, path }
    const ranges = [];

    function skipWhitespace() {
        while (pos < text.length && /[ \t\r\n]/.test(text[pos])) {
            if (text[pos] === '\n') line++, col = 1;
            else col++;
            pos++;
        }
    }

    function parseValue(path) {
        skipWhitespace();
        const startLine = line;
        if (text[pos] === '{') {
            pos++;
            col++;
            skipWhitespace();
            let first = true;
            while (pos < text.length && text[pos] !== '}') {
                if (!first) {
                    if (text[pos] === ',') { pos++; col++; skipWhitespace(); }
                }
                first = false;
                // Parse key
                skipWhitespace();
                if (text[pos] !== '"') break;
                let key = '';
                pos++; col++;
                while (pos < text.length && text[pos] !== '"') {
                    key += text[pos];
                    pos++; col++;
                }
                pos++; col++;
                skipWhitespace();
                if (text[pos] === ':') { pos++; col++; }
                skipWhitespace();
                parseValue([...path, key]);
                skipWhitespace();
            }
            if (text[pos] === '}') { pos++; col++; }
        }
        else if (text[pos] === '[') {
            pos++;
            col++;
            skipWhitespace();
            let idx = 0;
            let first = true;
            while (pos < text.length && text[pos] !== ']') {
                if (!first) {
                    if (text[pos] === ',') { pos++; col++; skipWhitespace(); }
                }
                first = false;
                parseValue([...path, idx]);
                idx++;
                skipWhitespace();
            }
            if (text[pos] === ']') { pos++; col++; }
        } else {
            // Primitive: string, number, boolean, null
            if (text[pos] === '"') {
                pos++; col++;
                while (pos < text.length && text[pos] !== '"') {
                    if (text[pos] === '\\') {
                        pos += 2; col += 2;
                    } else {
                        pos++; col++;
                    }
                }
                pos++; col++;
            } else {
                while (pos < text.length && !/[\s,\]\}]/.test(text[pos])) {
                    pos++; col++;
                }
            }
        }
        const endLine = line;
        ranges.push({ startLine, endLine, path });
    }

    skipWhitespace();
    parseValue([]);
    return ranges;
}

function findPathForLine(ranges, lineNumber) {
    // Find the deepest path that includes the line
    let best = null;
    for (const r of ranges) {
        if (r.startLine <= lineNumber && r.endLine >= lineNumber) {
            if (!best || r.path.length > best.path.length) {
                best = r;
            }
        }
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
    for (const r of ranges) {
        if (JSON.stringify(r.path) === JSON.stringify(targetPath)) {
            return { startLine: r.startLine, endLine: r.endLine };
        }
    }
    return null;
}

function loadJsonFile(filePath) {
    const path = require('path');
    const absPath = path.resolve(filePath);
    return fs.readFileSync(absPath, 'utf-8');
}

module.exports = {
    buildLineMap,
    findPathForLine,
    formatPath,
    parsePath,
    findLineForPath,
    loadJsonFile
};