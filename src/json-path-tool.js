const {
    JsonParseError,
    buildLineMap,
    findPathForLine,
    formatPath,
    findLineForPath,
    loadJsonFile
} = require('./utils/json-utils');

function usage() {
    console.log('Usage:');
    console.log('  node json-path-tool.js <json-file> <line>          # path at that line');
    console.log('  node json-path-tool.js <json-file> <line>:<column> # path at that position');
    console.log('  node json-path-tool.js <json-file> <json.path>     # source span of that path');
    console.log('');
    console.log('Examples:');
    console.log('  node json-path-tool.js sample.json 12');
    console.log('  node json-path-tool.js sample.json 12:9');
    console.log('  node json-path-tool.js sample.json users[0].profile.address');
}

function main() {
    const [, , jsonFile, input] = process.argv;
    if (!jsonFile || !input) {
        usage();
        process.exit(1);
    }

    const jsonText = loadJsonFile(jsonFile);
    const ranges = buildLineMap(jsonText);

    const position = /^(\d+)(?::(\d+))?$/.exec(input);
    if (position) {
        const lineNumber = parseInt(position[1], 10);
        const colNumber = position[2] === undefined ? undefined : parseInt(position[2], 10);
        const pathArr = findPathForLine(ranges, lineNumber, colNumber);
        if (!pathArr) {
            console.error(`No value found at ${input}`);
            process.exit(2);
        }
        // The top-level value has an empty path, which formats to an empty string.
        console.log(pathArr.length ? formatPath(pathArr) : '(root)');
        return;
    }

    const span = findLineForPath(ranges, input);
    if (!span) {
        console.error(`No value found at path ${input}`);
        process.exit(2);
    }
    console.log(`Lines ${span.startLine}-${span.endLine} (${span.startLine}:${span.startCol} to ${span.endLine}:${span.endCol})`);
}

if (require.main === module) {
    try {
        main();
    } catch (err) {
        if (err instanceof JsonParseError) {
            console.error(`Error: ${err.message}`);
            process.exit(1);
        }
        throw err;
    }
}
