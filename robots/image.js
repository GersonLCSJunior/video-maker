require('dotenv').config();

const imageDownloader = require('image-downloader');
const google = require('googleapis').google;
const customSearch = google.customsearch('v1');
const gm = require('gm').subClass({ imageMagick: true });
const path = require('path')
const rootPath = path.resolve(__dirname, '..')
const fromRoot = relPath => path.resolve(rootPath, relPath)


const state = require('./state');

const SEARCH_ENGINE_API_KEY = process.env.SEARCH_ENGINE_API_KEY;
const SEARCH_ENGINE_ID = process.env.SEARCH_ENGINE_ID;

async function robot() {
    const content = state.load();

    //await fetchImagesOfAllSentences(content);
    //await downloadAllImages(content);
    //await convertAllImages(content);
    //await createAllSentencesImages(content);
    await createYoutubeThumbnail();

    state.save(content);

    async function fetchImagesOfAllSentences(content) {
        for (const sentence of content.sentences) {
            const query = `${content.searchTerm} ${sentence.keywords[0]}`;
            sentence.images = await fetchGoogleAndReturnImagesLinks(query);

            sentence.googleSearchQuery = query;
        }
    }

    async function fetchGoogleAndReturnImagesLinks(query) {
        const response = await customSearch.cse.list({
            auth: SEARCH_ENGINE_API_KEY,
            cx: SEARCH_ENGINE_ID,
            q: query,
            searchType: 'image',
            num: 4
        })

        const imagesUrl = response.data.items.map(item => {
            return item.link;
        })

        return imagesUrl;
    }
    
    async function downloadAllImages(content) {
        content.downloadedImages = [];

        for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
            const images = content.sentences[sentenceIndex].images;
            for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
                const imageUrl = images[imageIndex];

                try {
                    if (content.downloadedImages.includes(imageUrl)) {
                        throw new Error('Image already downloaded')
                    }

                    await downloadAndSave(imageUrl, `${sentenceIndex}-original.png`);
                    content.downloadedImages.push(imageUrl);
                    console.log(`> [${sentenceIndex}||${imageIndex}] Baixou imagem com sucesso ${imageUrl}`);
                    break;
                } catch(error) {
                    console.log(`> [${sentenceIndex}||${imageIndex}] Erro ao baixar (${imageUrl}): ${error}`);
                }
            }
        }
    }

    async function downloadAndSave(url, fileName) {
        return imageDownloader.image({
            url: url,
            dest: `./data/${fileName}`
        })
    }

    async function convertAllImages(content) {
        for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
            await convertImage(sentenceIndex);
        }
    }

    async function convertImage(sentenceIndex) {
        return new Promise((resolve, reject) => {
            const inputFile = fromRoot(`./data/${sentenceIndex}-original.png[0]`)
            const outputFile = fromRoot(`./data/${sentenceIndex}-converted.png`)
            const width = 1920;
            const height = 1080;

            gm()
            .in(inputFile)
            .out('(')
                .out('-clone')
                .out('0')
                .out('-background', 'white')
                .out('-blur', '0x9')
                .out('-resize', `${width}x${height}^`)
            .out(')')
            .out('(')
                .out('-clone')
                .out('0')
                .out('-background', 'white')
                .out('-resize', `${width}x${height}`)
            .out(')')
            .out('-delete', '0')
            .out('-gravity', 'center')
            .out('-compose', 'over')
            .out('-composite')
            .out('-extent', `${width}x${height}`)
            .write(outputFile, (error) => {
                if (error) {
                    return reject(error)
                }

                console.log(`> [video-robot] Image converted: ${outputFile}`)
                resolve()
            })
        })
    }

    async function createAllSentencesImages(content) {
        for (sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
            await createSentenceImage(sentenceIndex, content.sentences[sentenceIndex].text);
        }
    }

    async function createSentenceImage(sentenceIndex, sentenceText) {
        return new Promise((resolve, reject) => {
            const outputFile = `./data/${sentenceIndex}-sentence.png`;

            const templateSettings = {
                0: {
                    size: '1920x400',
                    gravity: 'center'
                },
                1: {
                    size: '1920x1080',
                    gravity: 'center'
                },
                2: {
                    size: '800x1080',
                    gravity: 'west'
                },
                3: {
                    size: '1920x400',
                    gravity: 'center'
                },
                4: {
                    size: '1920x1080',
                    gravity: 'center'
                },
                5: {
                    size: '800x1080',
                    gravity: 'west'
                },
                6: {
                    size: '1920x400',
                    gravity: 'center'
                }
        
            }
        
            gm()
            .out('-size', templateSettings[sentenceIndex].size)
            .out('-gravity', templateSettings[sentenceIndex].gravity)
            .out('-background', 'transparent')
            .out('-fill', 'white')
            .out('-kerning', '-1')
            .out(`caption:${sentenceText}`)
            .write(outputFile, (error) => {
                if (error) {
                return reject(error)
                }
    
                console.log(`> [video-robot] Sentence created: ${outputFile}`)
                resolve()
            })
        })
    }

    async function createYoutubeThumbnail() {
        return new Promise((resolve, reject) => {
            gm()
            .in(fromRoot('./data/0-converted.png'))
            .write(fromRoot('./data/youtube-thumbnail.jpg'), (error) => {
                if (error) {
                    return reject(error)
                }

                console.log('> [video-robot] YouTube thumbnail created')
                resolve()
            })
        })
    }
}

module.exports = robot;