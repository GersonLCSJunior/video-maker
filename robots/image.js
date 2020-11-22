require('dotenv').config();

const google = require('googleapis').google;
const customSearch = google.customsearch('v1');
const state = require('./state');

const SEARCH_ENGINE_API_KEY = process.env.SEARCH_ENGINE_API_KEY;
const SEARCH_ENGINE_ID = process.env.SEARCH_ENGINE_ID;

async function robot() {
    const content = state.load();

    await fetchImagesOfAllSentences(content);

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
            num: 2
        })

        const imagesUrl = response.data.items.map(item => {
            return item.link;
        })

        return imagesUrl;
    }
    

    
}

module.exports = robot;