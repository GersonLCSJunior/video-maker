# Video Maker
---
Video Maker is a proof of concept project, based on [Filipe Deschamps' project](https://github.com/filipedeschamps/video-maker), but enhancing it's functionality by adding video narration using IBM's Text-To-Speech tecnology, and changing the video render software from Adobe After Effects to ffmpeg, which is free and open source.

You can find an example video following the link below:

[![Thumbnail from the Game Of Thrones example video](https://img.youtube.com/vi/sCl3Q3tTFXE/0.jpg)](https://www.youtube.com/watch?v=sCl3Q3tTFXE)

The application executes the following steps in order to create a video:

1. Prompts the user for a term that will be used as the video's theme.
2. Uses [Algorithmia Wikipedia Parser API](https://algorithmia.com/algorithms/web/WikipediaParser) to look up and scrap the wikipedia page related to the given term.
3. Breaks the content up into sentences and take the first seven.
4. Uses [IBM Watson Natural Language Processing Service](https://www.ibm.com/cloud/watson-natural-language-understanding) to find the keywords for each sentence.
5. Uses [Google's Custom Search API](https://developers.google.com/custom-search/v1/overview) to take an image for each sentence using the keywords from IBM Watson.
6. Uses [IBM Watson Text to Speech](https://www.ibm.com/cloud/watson-text-to-speech) to generate an audio file for each sentence.
7. Converts all images to the same format using [Image Magick](https://imagemagick.org/).
8. Creates an image version of each senteces that will serve as subtitles, also using [Image Magick](https://imagemagick.org/).
9. Generate video segments joining image, narration, and sentece image using [ffmpeg](http://ffmpeg.org/) through [videoshow](https://www.npmjs.com/package/videoshow).
10. Join all video segments using [ffmpeg](http://ffmpeg.org/).

It also automatically uploads the video to youtube and updates it with a cusotm thumbnail, all using [Youtube's Data API](https://developers.google.com/youtube/v3).