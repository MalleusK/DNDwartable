const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./src');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Fix corrupted type imports
    content = content.replace(/import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]+['"]+/g, (match, p1) => {
        const normalizedPath = file.replace(/\\/g, '/');
        const parts = normalizedPath.split('/');
        // parts: ['.', 'src', 'components', 'Header', 'Header.tsx'] -> length 5
        // depth from src/types = length - 3
        const depth = parts.length - 3; 
        const prefix = depth === 0 ? './' : '../'.repeat(depth);
        return 'import { ' + p1 + ' } from \'' + prefix + 'types\'';
    });
    
    fs.writeFileSync(file, content, 'utf8');
});
