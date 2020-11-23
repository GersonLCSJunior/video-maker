const robots = {
    input: require('./robots/input'),
    text: require('./robots/text'),
    image: require('./robots/image'),
    voice: require('./robots/voice'),
    video: require('./robots/video')
}

const start = async () => {
    robots.input();
    await robots.text();
    await robots.image();
    await robots.voice();
    await robots.video();
}

start();