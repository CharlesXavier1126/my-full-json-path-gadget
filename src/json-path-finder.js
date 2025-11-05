const { buildLineMap, findPathForLine, formatPath, loadJsonFile } = require('./utils/json-utils');

// Main
if (require.main === module) {
    const [,, jsonFile, lineStr] = process.argv;
    if (!jsonFile || !lineStr) {
        console.log('Usage: node json-path-finder.js <file> <line-number>');
        process.exit(1);
    }
    
    const lineNumber = parseInt(lineStr, 10);
    const jsonText = loadJsonFile(jsonFile);
    const ranges = buildLineMap(jsonText);
    const pathArr = findPathForLine(ranges, lineNumber);
    
    if (pathArr) {
        console.log(formatPath(pathArr));
    } else {
        console.log('No path found for the given line number.');
    }
}