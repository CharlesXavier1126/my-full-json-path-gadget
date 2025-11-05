# my-full-json-path-gadget

## **1. `json-path-finder.js`**
This script takes a JSON file and a line number, then returns the full JSON path to the value at the line.

### **Usage:**
```bash
node src/json-path-finder.js <path-to-json-file> <line-number>
```

### **Example:**
```bash
node src/json-path-finder.js sample.json 12
```

## **2. `json-path-tool.js`**
This script is more flexible. It supports:
- Finding the JSON path from a line number
- Finding the line number range from a JSON path

### **Usage:**
```bash
# To get the JSON path from a line number:
node src/json-path-tool.js <path-to-json-file> <line-number>

# To get the line number range from a JSON path:
node src/json-path-tool.js <path-to-json-file> <json.path.to.value>
```

### **Example:**
```bash
# Get path from line number
node src/json-path-tool.js sample.json 12

# Get line range from JSON path
node src/json-path-tool.js sample.json users[0].name
```