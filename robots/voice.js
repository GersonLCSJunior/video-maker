require('dotenv').config();
const TEXT_TO_SPEECH_API_KEY = process.env.TEXT_TO_SPEECH_API_KEY;

const fs = require('fs');

const state = require('./state');

const TextToSpeechV1 = require('ibm-watson/text-to-speech/v1');
const { IamAuthenticator } = require('ibm-watson/auth');

const tts = new TextToSpeechV1({
    authenticator: new IamAuthenticator({ apikey: TEXT_TO_SPEECH_API_KEY }),
    serviceUrl: 'https://stream.watsonplatform.net/text-to-speech/api/'
})

async function robot() {
    const content = state.load();
    await synthetizeVoiceForAllSentences(content);

    state.save(content);
    async function synthetizeVoiceForAllSentences(content) {
        for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
            await synthetizeVoiceForSentence(sentenceIndex, content.sentences[sentenceIndex].text)
        }
    }

    async function synthetizeVoiceForSentence(sentenceIndex, sentenceText) {
        const params = {
            text: sentenceText,
            voice: 'en-US_HenryV3Voice',
            accept: 'audio/wav'
        }
        return new Promise((resolve, reject) => {
            tts.synthesize(params)
            .then(response => {
                const audio = response.result;
                return tts.repairWavHeaderStream(audio);
            })
            .then(repairedFile => {
                fs.writeFileSync(`./content/${sentenceIndex}-audio.wav`, repairedFile);
                console.log(`${sentenceIndex}-audio.wav written with a corrected wav header`);
                resolve();
            })
            .catch(err => {
                reject(err);
            });

        })
    }
}

module.exports = robot;