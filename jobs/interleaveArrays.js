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

/**
 * 
 * @param { arrays } inputs 
 * @param {*} events 
 * @returns { interleaved }
 */
module.exports = async function interleaveArrays(inputs, events) {
    const send = (topic, message) => {
        events.emit(topic, {
            name: inputs.name,
            job: inputs.job,
            ...message
        });
    }


    const interleaved = [];
    const maxLength = Math.max(...inputs.arrays.map(a => a.length));

    for (let i = 0; i < maxLength; i++) {
        for (const arr of arrays) {
            if (i < arr.length) {
                interleaved.push(arr[i]);
            }
        }
    }

    return {
        interleaved
    }
}