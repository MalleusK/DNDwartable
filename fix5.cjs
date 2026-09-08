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
    if (file.includes('types' + path.sep + 'index.ts')) return;

    let content = fs.readFileSync(file, 'utf8');
    
    // Fix imports
    content = content.replace(/import\s+\{[^}]+\}\s+from\s+['"](?:\.\.\/|\.\/)*types['"];?/g, match => {
        const normalized = file.replace(/\\/g, '/');
        const afterSrc = normalized.split('src/')[1];
        const depth = afterSrc ? afterSrc.split('/').length - 1 : 0;
        const prefix = depth === 0 ? './' : '../'.repeat(depth);
        return match.replace(/(from\s+['"])(?:.*)(types['"])/, $1);
    });

    // Fix implicit any
    content = content.replace(/c =>/g, '(c: any) =>');
    content = content.replace(/m =>/g, '(m: any) =>');
    content = content.replace(/t =>/g, '(t: any) =>');
    content = content.replace(/a =>/g, '(a: any) =>');
    content = content.replace(/enc =>/g, '(enc: any) =>');
    content = content.replace(/spell =>/g, '(spell: any) =>');
    content = content.replace(/\(a, b\)/g, '(a: any, b: any)');
    content = content.replace(/\(sum, c\)/g, '(sum: any, c: any)');
    content = content.replace(/cId =>/g, '(cId: any) =>');
    content = content.replace(/sId =>/g, '(sId: any) =>');

    // Remove unused imports
    content = content.replace(/import \{.*Swords.*\} from 'lucide-react';/, match => match.replace('Swords,', '').replace('Swords', ''));
    content = content.replace(/import \{.*Flame.*\} from 'lucide-react';/, match => match.replace('Flame,', '').replace('Flame', ''));
    content = content.replace(/import \{.*Heart.*\} from 'lucide-react';/, match => match.replace('Heart,', '').replace('Heart', ''));
    content = content.replace(/import \{.*Minus.*\} from 'lucide-react';/, match => match.replace('Minus,', '').replace('Minus', ''));
    content = content.replace(/import React, \{ useState, useEffect \} from 'react';/g, "import React, { useState } from 'react';");
    if (file.includes('SpellModal')) {
        content = content.replace(/import React, \{ useState \} from 'react';/, "import React from 'react';");
    }

    fs.writeFileSync(file, content, 'utf8');
});

