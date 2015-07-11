modules.define('i-flux__store', ['i-bem'], function (provide, BEM) {
    BEM.decl('i-flux__store', {
        onSetMod: {
            js: function () {
                var params = this.params,
                    handlers = params.handlers.reduce(function (acc, pair) {
                    acc[pair[0]] = pair[1];

                    return acc;
                }, {});

                this.state = params.state || {};

                params.dispatcher.register(function (action) {
                    if (handlers[action.type]) {
                        handlers[action.type].call(this, action.data);
                    }
                }.bind(this));
            }
        },

        emitChange: function () {
            this.emit('change');
        },

        addChangeListener: function (callback) {
            this.on('change', callback);
        },

        removeChangeListener: function (callback) {
            this.un('change', callback);
        },

        _set: function (name, val) {
            this.state[name] = val;
        },

        get: function (name) {
            return this.state[name];
        },

        getAll: function () {
            return this.state;
        }
    });

    provide({
        create: function (params) {
            return BEM.create('i-flux__store', params);
        }
    });
});
