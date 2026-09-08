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
    content = content.replace(/import type \{([^}]+)\} from ''/g, (match, p1) => {
        let depth = file.split(path.sep).length - 2;
        let prefix = depth === 0 ? './' : '../'.repeat(depth);
        return 'import type { ' + p1 + ' } from \'' + prefix + 'types\'';
    });
    
    // Fix X import in EncounterPlanner
    if (file.includes('EncounterPlanner')) {
        content = content.replace(/Plus, Trash2, Play, Users/g, 'Plus, Trash2, Play, Users, X');
    }
    
    fs.writeFileSync(file, content, 'utf8');
});
