module.exports = async function segmentsLength(inputs, events) {
    const send = (topic, message) => {
        events.emit(topic, {
            name: inputs.name,
            task: inputs.task,
            ...message
        });
    }

    const duration = parseFloat(inputs.duration);
    const segments = parseInt(inputs.segments);
    return {
        segments,
        duration,
        segmentDuration: (duration / segments),
    }
}