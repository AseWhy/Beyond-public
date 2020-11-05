module.exports.name = 'own';

module.exports.lib = {
    parseOwnName(input) {
        input = input.split('/');

        return {
            class: input[0],
            own: input[1]
        }
    }
}