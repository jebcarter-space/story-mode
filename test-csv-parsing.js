// Simple test to validate CSV parsing logic
const fs = require('fs');

function parseCSV(content) {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;

    while (i < content.length) {
        const char = content[i];
        const nextChar = content[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote
                currentField += '"';
                i += 2;
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
                i++;
            }
        } else if (char === ',' && !inQuotes) {
            // Field separator
            currentRow.push(currentField);
            currentField = '';
            i++;
        } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
            // Row separator
            currentRow.push(currentField);
            if (currentRow.some(field => field.trim().length > 0)) {
                rows.push(currentRow);
            }
            currentRow = [];
            currentField = '';
            if (char === '\r' && nextChar === '\n') {
                i += 2;
            } else {
                i++;
            }
        } else if (char === '\r' && !inQuotes) {
            // Handle standalone \r (old Mac format)
            currentRow.push(currentField);
            if (currentRow.some(field => field.trim().length > 0)) {
                rows.push(currentRow);
            }
            currentRow = [];
            currentField = '';
            i++;
        } else {
            // Regular character
            currentField += char;
            i++;
        }
    }

    // Handle last field and row
    if (currentField.length > 0 || currentRow.length > 0) {
        currentRow.push(currentField);
        if (currentRow.some(field => field.trim().length > 0)) {
            rows.push(currentRow);
        }
    }

    return rows;
}

// Test with the problematic Haunting Grounds file
console.log('Testing CSV parsing with Haunting Grounds Oracle file...');

try {
    const content = fs.readFileSync('.story-mode/spark-tables/haunting-grounds.csv', 'utf8');
    console.log('Original content sample (first 200 chars):');
    console.log(content.substring(0, 200) + '...');
    console.log('\n');
    
    const parsed = parseCSV(content);
    console.log(`Parsed into ${parsed.length} rows`);
    console.log('First row (headers):', parsed[0]);
    console.log(`Number of columns: ${parsed[0].length}`);
    console.log('\nFirst data row:', parsed[1]);
    console.log(`Data row columns: ${parsed[1].length}`);
    
    // Extract all non-empty values
    const entries = [];
    for (let rowIndex = 1; rowIndex < parsed.length; rowIndex++) {
        const row = parsed[rowIndex];
        for (const cell of row) {
            if (cell && cell.trim().length > 0) {
                let cleanedCell = cell.trim();
                cleanedCell = cleanedCell.replace(/[.,:;!?]+$/, '');
                if (cleanedCell.length > 0) {
                    entries.push(cleanedCell);
                }
            }
        }
    }
    
    console.log(`\nExtracted ${entries.length} total entries`);
    console.log('Sample entries:');
    console.log(entries.slice(0, 10));
    
} catch (error) {
    console.error('Error:', error.message);
}
