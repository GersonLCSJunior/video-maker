const gm = require('gm').subClass({imageMagick: true})
const state = require('./state.js')
const spawn = require('child_process').spawn
const path = require('path')
const rootPath = path.resolve(__dirname, '..')

const os = require('os')
const fs = require('fs')

const videoshow = require('videoshow')
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path
const ffprobePath = require('@ffprobe-installer/ffprobe').path

const audio = path.join(__dirname, '../templates/1/newsroom.mp3')
const video = path.join(__dirname, '../content/output.mp4')

let ffmpeg = require('fluent-ffmpeg')
ffmpeg.setFfmpegPath(ffmpegPath)
ffmpeg.setFfprobePath(ffprobePath)

const fromRoot = relPath => path.resolve(rootPath, relPath)

async function robot() {
  console.log('> [video-robot] Starting...')
  const content = state.load()

  await convertAllImages(content);
  await createAllSentenceImages(content);
  await createYouTubeThumbnail();
  await renderAudio(content);
  await renderVideo(content);

  state.save(content)

  async function convertAllImages(content) {
    for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
      await convertImage(sentenceIndex)
    }
  }

  async function convertImage(sentenceIndex) {
    return new Promise((resolve, reject) => {
      const inputFile = fromRoot(`./content/${sentenceIndex}-original.png[0]`)
      const outputFile = fromRoot(`./content/${sentenceIndex}-converted.png`)
      const width = 1920
      const height = 1080

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

  async function createAllSentenceImages(content) {
    for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
      await createSentenceImage(sentenceIndex, content.sentences[sentenceIndex].text)
    }
  }

  async function createSentenceImage(sentenceIndex, sentenceText) {
    return new Promise((resolve, reject) => {
      const outputFile = fromRoot(`./content/${sentenceIndex}-sentence.png`)

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

  async function createYouTubeThumbnail() {
    return new Promise((resolve, reject) => {
      gm()
        .in(fromRoot('./content/0-converted.png'))
        .write(fromRoot('./content/youtube-thumbnail.jpg'), (error) => {
          if (error) {
            return reject(error)
          }

          console.log('> [video-robot] YouTube thumbnail created')
          resolve()
        })
    })
  }

  async function renderAudio(content) {
    const audio = ffmpeg();
    for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
      audio.input(`./content/${sentenceIndex}-audio.wav`)
    }
    audio.mergeToFile('./content/voice.wav')
  }

  async function renderVideo(content) {
    try {
      await renderAllImagesWithAudio(content);
      return await renderVideoWithFFmpeg(content)
    } catch(err) {
      console.error(err)
    }    
  }

  async function renderAllImagesWithAudio(content) {
    return new Promise(async (resolve, reject) => {
      for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
        await renderImagesWithAudio(sentenceIndex, content);
      }
      resolve();
    })
  }

  async function renderImagesWithAudio(sentenceIndex, content) {
    return new Promise(async (resolve, reject) => {
      const images = []
      images.push({
        path: `./content/${sentenceIndex}-converted.png`,
        caption: content.sentences[sentenceIndex].text
      })
  
      const duration = await getTrackDuration(`./content/${sentenceIndex}-audio.wav`);
      const inBetweenTime = 2;
      console.log(duration);
  
      const videoOptions = {
        fps: 25,
        loop: duration+inBetweenTime, // seconds
        transition: true,
        transitionDuration: 1, // seconds
        videoBitrate: 1024,
        videoCodec: "libx264",
        size: "640x?",
        audioBitrate: "128k",
        audioChannels: 2,
        format: "mp4",
        pixelFormat: "yuv420p",
        useSubRipSubtitles: false, // Use ASS/SSA subtitles instead
        subtitleStyle: {
          Fontname: "Verdana",
          Fontsize: "26",
          PrimaryColour: "11861244",
          SecondaryColour: "11861244",
          TertiaryColour: "11861244",
          BackColour: "-2147483640",
          Bold: "2",
          Italic: "0",
          BorderStyle: "2",
          Outline: "2",
          Shadow: "3",
          Alignment: "1", // left, middle, right
          MarginL: "40",
          MarginR: "60",
          MarginV: "40"
        }
      }
  
      videoshow(images, videoOptions)
      .audio(`./content/${sentenceIndex}-audio.wav`)
      .save(`./content/${sentenceIndex}-video.mp4`)
      .on("start", () => {
        console.log(`> [video-robot] Starting FFmpeg for video ${sentenceIndex}`)
      })
      .on("error", (err, stdout, stderr) => {
        console.error("Error:", err)
        console.error("ffmpeg stderr:", stderr)
        reject(err)
      })
      .on("end", () => {
        console.log('> [video-robot] FFmpeg closed')
        resolve()
      })
    })
  }

  async function renderVideoWithFFmpeg(content) {
    const video = ffmpeg();
    for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
      video.input(`./content/${sentenceIndex}-video.mp4`)
    }
    video.mergeToFile('./content/video.mp4')
  }

  async function getTrackDuration(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, function(error, metadata) {
        if (error) {
          reject(error);
        }
        resolve(metadata.format.duration);
      });
    })
  }

}

module.exports = robot