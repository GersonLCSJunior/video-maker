const robots = {
    input: require('./robots/input'),
    text: require('./robots/text'),
    image: require('./robots/image'),
    video: require('./robots/video')
}

const start = async () => {
    robots.input();
    await robots.text();
    await robots.image();
    await robots.video();
}

start();