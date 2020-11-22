require('dotenv').config();

const Algorithmia = require('algorithmia');
const sentenceBoundaryDetection = require('sbd');

const ALGORITHMIA_API_KEY = process.env.ALGORITHMIA_API_KEY;

async function robot(content) {
    await fetchContentFromWikipedia(content);
    sanitizeContent(content);
    breakContentIntoSentences(content);

    async function fetchContentFromWikipedia(content) {
        const algorithmiaAuthenticated = Algorithmia.client(ALGORITHMIA_API_KEY);
        const wikipediaAlgorithm = algorithmiaAuthenticated.algo("web/WikipediaParser/0.1.2");
        const wikipediaResponse = await wikipediaAlgorithm.pipe(content.searchTerm);
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
}

module.exports = robot;