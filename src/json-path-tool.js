const { buildLineMap, findPathForLine, formatPath, findLineForPath, loadJsonFile } = require('./utils/json-utils');

// Main
if (require.main === module) {
    const [,, jsonFile, input] = process.argv;
    if (!jsonFile || !input) {
        console.log('Usage:');
        console.log('  node json-path-tool.js <json-file> <lineNumber>');
        console.log('  node json-path-tool.js <json-file> <json.path.to.value>');
        process.exit(1);
    }

    const jsonText = loadJsonFile(jsonFile);
    const ranges = buildLineMap(jsonText);

    if (/^\d+$/.test(input)) {
        const lineNumber = parseInt(input, 10);
        const pathArr = findPathForLine(ranges, lineNumber);
        if (pathArr) {
            console.log(formatPath(pathArr));
        } else {
            console.log('No path found for line', lineNumber);
        }
    } else {
        const result = findLineForPath(ranges, input);
        if (result) {
            console.log(`Path found at lines ${result.startLine} to ${result.endLine}`);
        } else {
            console.log('No lines found for path', input);
        }
    }
}