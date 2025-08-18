function closestBeatDurationPowerOf4(bpm, durationSeconds, divide = 1) {
    if (bpm <= 0 || durationSeconds <= 0) {
        throw new Error("BPM and duration must be positive numbers.");
    }

    const beatLength = 60 / bpm; // seconds per beat
    const beats = durationSeconds / beatLength; // raw beat count

    // Find the closest power of 4 to the beat count
    const log4 = Math.log(beats) / Math.log(4);
    const lowerPower = Math.pow(4, Math.floor(log4));
    const upperPower = Math.pow(4, Math.ceil(log4));

    // Pick whichever is closer
    const closestBeats =
        Math.abs(beats - lowerPower) <= Math.abs(beats - upperPower)
            ? lowerPower
            : upperPower;

    const snappedDuration = closestBeats * beatLength;

    return {
        closestDuration: snappedDuration,
        segments: closestBeats * divide,
        segmentDuration: beatLength / divide
    };
}

/**
 * 
 * @param {BPM, duration, divide} inputs 
 * @param {*} events 
 * @returns { closestDuration, segments, segmentLength}
 */
module.exports = async function snapBPM(inputs, events) {
    const send = (topic, message) => {
        events.emit(topic, {
            name: inputs.name,
            job: inputs.job,
            ...message
        });
    }
    // given two inputs: BPM, and duration_ms -- find the best 4x beat BPM duration     
    const result = closestBeatDurationPowerOf4(inputs.BPM, inputs.duration, inputs.divide);
    return result
}