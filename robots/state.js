const fs = require('fs');
const contentFileDir = './data'
const contentFileName = 'content.json';
const contentFilePath = `${contentFileDir}/${contentFileName}`

function save(content) {
    fs.mkdirSync(contentFileDir, { recursive: true });
    const contentString = JSON.stringify(content);
    return fs.writeFileSync(contentFilePath, contentString);
}

function load() {
    const fileBuffer = fs.readFileSync(contentFilePath, 'utf-8');
    const contentJson = JSON.parse(fileBuffer);
    return contentJson;
}

module.exports = {
    save, 
    load
}