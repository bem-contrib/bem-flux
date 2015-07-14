modules.define('i-flux__actions', function (provide) {
    provide({
        create: function (params) {
            var dispatcher = params.dispatcher;
            var actions = params.actions;
            var randId = Math.random().toString().slice(2);

            return Object.keys(actions).reduce(function (acc, action) {
                var key = randId + '_' + action;

                acc[action] = function () {
                    var argNames = actions[action];
                    var data = {};
                    var i;
                    
                    if (!Array.isArray(argNames)) {
                        argNames = [argNames];
                    }

                    for (i = 0; i < argNames.length; i += 1) {
                        data[argNames[i]] = arguments[i];
                    }

                    dispatcher.dispatch({
                        type: key,
                        data: data
                    });
                };

                acc[action].toString = function () {
                    return key;
                };

                return acc;
            }, {});

            return actions;
        }
    });
});
