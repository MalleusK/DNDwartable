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
const allTypes = ['Campaign', 'Combatant', 'Monster', 'Encounter', 'Spell', 'SessionNote', 'DiceRollLog', 'CombatantType', 'ConditionInfo', 'EncounterMonsterConfig'];

files.forEach(file => {
    if (file.includes('types' + path.sep + 'index.ts')) return; // skip types file

    let content = fs.readFileSync(file, 'utf8');
    
    // Remove broken imports
    content = content.replace(/import\s+(?:type\s+)?\{[^}]*\}\s+from\s+['"]+['"];?/g, '');
    content = content.replace(/import\s+(?:type\s+)?\{[^}]*\}\s+from\s+['"](?:\.\.\/|\.\/)*types['"];?/g, '');
    
    // Find what types this file actually uses
    let usedTypes = [];
    allTypes.forEach(t => {
        // Simple regex to check if word exists in the file
        const regex = new RegExp('\\b' + t + '\\b');
        if (regex.test(content)) {
            usedTypes.push(t);
        }
    });

    if (usedTypes.length > 0) {
        // Calculate relative path to types
        const normalizedPath = file.replace(/\\/g, '/');
        const parts = normalizedPath.split('/');
        const depth = parts.length - 3; 
        const prefix = depth === 0 ? './' : '../'.repeat(depth);
        
        const importStr = 'import { ' + usedTypes.join(', ') + ' } from \'' + prefix + 'types\';\n';
        
        // Insert at top after react imports if any, or just at top
        if (content.startsWith('import ')) {
            content = content.replace(/^(import .*?\n)+/m, match => match + importStr);
        } else {
            content = importStr + content;
        }
    }
    
    fs.writeFileSync(file, content, 'utf8');
});

