require('dotenv').config();
const state = require('./state');
const express = require('express');
const google = require('googleapis').google;
const youtube = google.youtube({ version: 'v3'})
const OAuth2 = google.auth.OAuth2

const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const PORT = 5399;
const URI = `http://localhost:${PORT}`;
const REDIRECT_PATH = '/redirect'
const REDIRECT_URI = URI + REDIRECT_PATH;

// http://localhost:5399/redirect

async function robot() {
    const content = state.load();

    await authenticateWithOAuth();
    await uploadVideo();
    await uploadThumbnail();

    async function authenticateWithOAuth() {
        const webServer = await startWebServer()
        const OAuthClient = await createOAuthClient()
        requestUserConsent(OAuthClient)
        const authorizationToken = await waitForGoogleCallback(webServer)
        await requestGoogleForAccessTokens(OAuthClient, authorizationToken)
        setGlobalGoogleAuthentication(OAuthClient)
        await stopWebServer(webServer)
    }

    async function startWebServer() {
        return new Promise((resolve, reject) => {
            const port = 5399;
            const app = express();

            const server = app.listen(port, () => {
                console.log(`> [youtube-robot] Listening on http://localhost:${port}`)

                resolve({
                    app,
                    server
                })
            })
        })
    }

    async function createOAuthClient() {
        const OAuthClient = new OAuth2 (
          OAUTH_CLIENT_ID,
          OAUTH_CLIENT_SECRET,
          REDIRECT_URI
        )
  
        return OAuthClient
    }
  
      function requestUserConsent(OAuthClient) {
        const consentUrl = OAuthClient.generateAuthUrl({
          access_type: 'offline',
          scope: ['https://www.googleapis.com/auth/youtube']
        })
  
        console.log(`> [youtube-robot] Please give your consent: ${consentUrl}`)
      }
  
      async function waitForGoogleCallback(webServer) {
        return new Promise((resolve, reject) => {
          console.log('> [youtube-robot] Waiting for user consent...')
  
          webServer.app.get(REDIRECT_PATH, (req, res) => {
            const authCode = req.query.code
            console.log(`> [youtube-robot] Consent given: ${authCode}`)
  
            res.send('<h1>Thank you!</h1><p>Now close this tab.</p>')
            resolve(authCode)
          })
        })
      }
  
      async function requestGoogleForAccessTokens(OAuthClient, authorizationToken) {
        return new Promise((resolve, reject) => {
          OAuthClient.getToken(authorizationToken, (error, tokens) => {
            if (error) {
              return reject(error)
            }
  
            console.log('> [youtube-robot] Access tokens received!')
  
            OAuthClient.setCredentials(tokens)
            resolve()
          })
        })
      }
  
      function setGlobalGoogleAuthentication(OAuthClient) {
        google.options({
          auth: OAuthClient
        })
      }
  
    async function stopWebServer(webServer) {
        return new Promise((resolve, reject) => {
            webServer.server.close(() => {
                resolve()
            })
        })
    }

    async function uploadVideo(content) {
        const videoFilePath = './content/video.mp4'
        const videoFileSize = fs.statSync(videoFilePath).size
        const videoTitle = `${content.prefix} ${content.searchTerm}`
        const videoTags = [content.searchTerm, ...content.sentences[0].keywords]
        const videoDescription = content.sentences.map((sentence) => {
            return sentence.text
        }).join('\n\n')
    
        const requestParameters = {
            part: 'snippet, status',
            requestBody: {
                snippet: {
                    title: videoTitle,
                    description: videoDescription,
                    tags: videoTags
                },
                status: {
                    privacyStatus: 'unlisted'
                }
            },
            media: {
                body: fs.createReadStream(videoFilePath)
            }
        }
    
        console.log('> [youtube-robot] Starting to upload the video to YouTube')
        const youtubeResponse = await youtube.videos.insert(requestParameters, {
            onUploadProgress: onUploadProgress
        })
    
        console.log(`> [youtube-robot] Video available at: https://youtu.be/${youtubeResponse.data.id}`)
        return youtubeResponse.data
    
        function onUploadProgress(event) {
            const progress = Math.round( (event.bytesRead / videoFileSize) * 100 )
            console.log(`> [youtube-robot] ${progress}% completed`)
        }
    
      }
    
      async function uploadThumbnail(videoInformation) {
        const videoId = videoInformation.id
        const videoThumbnailFilePath = './content/youtube-thumbnail.jpg'
    
        const requestParameters = {
            videoId: videoId,
            media: {
                mimeType: 'image/jpeg',
                body: fs.createReadStream(videoThumbnailFilePath)
            }
        }
    
        const youtubeResponse = await youtube.thumbnails.set(requestParameters)
        console.log(`> [youtube-robot] Thumbnail uploaded!`)
      }
}

module.exports = robot;