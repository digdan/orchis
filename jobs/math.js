module.exports = async function math(inputs, events) {
    const send = (topic, message) => {
        events.emit(topic, {
            name: inputs.name,
            job: inputs.job,
            ...message
        });
    }
    let equation = '0';
    switch(inputs.operator) {
        case 'subtract':
            equation = `${inputs.value_a} - ${inputs.value_b}`;
            break;
        case 'add':
            equation = `${inputs.value_a} + ${inputs.value_b}`;
            break;
    }
    return {
        result: eval(equation)
    }
}