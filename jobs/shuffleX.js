function interleaveArrays(arrays) {
    const result = [];
    const maxLength = Math.max(...arrays.map(a => a.length));

    for (let i = 0; i < maxLength; i++) {
        for (const arr of arrays) {
            if (i < arr.length) {
                result.push(arr[i]);
            }
        }
    }

    return result;
}

module.exports = async function shuffleX(inputs, events) {
    const send = (topic, message) => {
        events.emit(topic, {
            name: inputs.name,
            task: inputs.task,
            ...message
        });
    }

    const shuffled = interleaveArrays(inputs.shuffleList)
    return {
        shuffled
    }
}