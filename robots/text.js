require('dotenv').config();

const Algorithmia = require('algorithmia');
const sentenceBoundaryDetection = require('sbd');
const NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1')

const ALGORITHMIA_API_KEY = process.env.ALGORITHMIA_API_KEY;
const WATSON_API_KEY = process.env.WATSON_API_KEY;

const nlu = new NaturalLanguageUnderstandingV1({
    iam_apikey: WATSON_API_KEY,
    version: '2018-04-05',
    url: 'https://gateway.watsonplatform.net/natural-language-understanding/api/'
})

const state = require('./state');

async function robot() {
    const content = state.load();
    await fetchContentFromWikipedia(content);
    sanitizeContent(content);
    breakContentIntoSentences(content);
    limitMaximumSentences(content);
    await fetchKeywordsOfAllSentences(content);
    state.save(content);

    async function fetchContentFromWikipedia(content) {
        const algorithmiaAuthenticated = Algorithmia.client(ALGORITHMIA_API_KEY);
        const wikipediaAlgorithm = algorithmiaAuthenticated.algo("web/WikipediaParser/0.1.2");
        const wikipediaResponse = await wikipediaAlgorithm.pipe(`'${content.searchTerm}'`);
        const wikipediaContent = wikipediaResponse.get();
        
        content.sourceContentOriginal = wikipediaContent.content;
    }

    function sanitizeContent(content) {
        const allLines = separateLines(content.sourceContentOriginal)
        const withoutBlankLines = removeBlankLines(allLines);
        const withoutMarkdown = removeMarkdown(withoutBlankLines);
        const joinedText = joinLines(withoutMarkdown);
        const withoutDateInParenthesis = removeDatesInParentheses(joinedText);

        content.sourceContentSanitized = withoutDateInParenthesis;

        function separateLines(text) {
            return text.split('\n');
        }

        function removeBlankLines(lines) {
            const withoutBlankLines = lines.filter(line => {
                if(line.trim().length === 0) {
                    return false;
                }
                return true;
            });
            return withoutBlankLines;
        }

        function removeMarkdown(lines) {
            return lines.filter(line => {
                if(line.trim().startsWith('=')) {
                    return false;
                }
                return true;
            });
        }

        function joinLines(lines) {
            return lines.join(' ');
        }

        function removeDatesInParentheses(text) {
            return text.replace(/\((?:\([^()]*\)|[^()])*\)/gm, '').replace(/  /g,' ')
        }
    }

    function breakContentIntoSentences() {
        content.sentences = [];
        const sentences = sentenceBoundaryDetection.sentences(content.sourceContentSanitized);
        sentences.forEach(sentence => {
            content.sentences.push({
                text: sentence,
                keywords: [],
                images: []
            })
        })
    }

    function limitMaximumSentences(content) {
        content.sentences = content.sentences.slice(0, content.maximumSentences);
    }

    async function fetchKeywordsOfAllSentences(content) {
        for (const sentence of content.sentences) {
            sentence.keywords = await fetchWatsonAndReturnKeywords(sentence.text)
        }
    }

    async function fetchWatsonAndReturnKeywords(sentence) {
        return new Promise((resolve, reject) => {
            nlu.analyze({
                text: sentence,
                features: {
                    keywords: {}
                }
            }, (error, response) => {
                if (error) {
                    reject(error);
                }
    
                const keywords = response.keywords.map(keyword => {
                    return keyword.text;
                })
    
                resolve(keywords);
            })
        })
    }
}

module.exports = robot;