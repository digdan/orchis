/**
 * 
 * @param { code } inputs
 * 
 * @param {*} events 
 * @returns { results }
 */

module.exports = async function evaluate(inputs, events) {
    const send = (topic, message) => {
        events.emit(topic, {
            name: inputs.name,
            job: inputs.job,
            ...message
        });
    }
    let code = inputs.code;
    return {
        result: eval(code)
    }
}