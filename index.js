const robots = {
    state: require('./robots/state'),
    input: require('./robots/input'),
    text: require('./robots/text')
}

const start = async () => {
    robots.input();
    await robots.text();

    const content = robots.state.load();
    console.dir(content, { depth: null })
}

start();