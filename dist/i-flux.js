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
modules.define('i-flux__dispatcher', function (provide) {
    /**
     * Copyright (c) 2014, Facebook, Inc.
     * All rights reserved.
     *
     * This source code is licensed under the BSD-style license found in the
     * LICENSE file in the root directory of this source tree. An additional grant
     * of patent rights can be found in the PATENTS file in the same directory.
     *
     * @link https://github.com/facebook/flux/blob/master/dist/Flux.js
     */

    function invariant(condition, format, args) {
        if (condition) {
            return;
        }

        var argIndex = 0;
        var error = new Error(
            'Invariant Violation: ' +
            format.replace(/%s/g, function () {
                var arg = args[argIndex];

                argIndex += 1;

                return arg;
            })
        );

        error.framesToPop = 1; // we don't care about invariant's own frame

        throw error;
    }

    /**
     * Dispatcher is used to broadcast payloads to registered callbacks. This is
     * different from generic pub-sub systems in two ways:
     *
     *   1) Callbacks are not subscribed to particular events. Every payload is
     *      dispatched to every registered callback.
     *   2) Callbacks can be deferred in whole or part until other callbacks have
     *      been executed.
     *
     * For example, consider this hypothetical flight destination form, which
     * selects a default city when a country is selected:
     *
     *   var flightDispatcher = new Dispatcher();
     *
     *   // Keeps track of which country is selected
     *   var CountryStore = {country: null};
     *
     *   // Keeps track of which city is selected
     *   var CityStore = {city: null};
     *
     *   // Keeps track of the base flight price of the selected city
     *   var FlightPriceStore = {price: null}
     *
     * When a user changes the selected city, we dispatch the payload:
     *
     *   flightDispatcher.dispatch({
     *     actionType: 'city-update',
     *     selectedCity: 'paris'
     *   });
     *
     * This payload is digested by `CityStore`:
     *
     *   flightDispatcher.register(function(payload) {
     *     if (payload.actionType === 'city-update') {
     *       CityStore.city = payload.selectedCity;
     *     }
     *   });
     *
     * When the user selects a country, we dispatch the payload:
     *
     *   flightDispatcher.dispatch({
     *     actionType: 'country-update',
     *     selectedCountry: 'australia'
     *   });
     *
     * This payload is digested by both stores:
     *
     *    CountryStore.dispatchToken = flightDispatcher.register(function(payload) {
     *     if (payload.actionType === 'country-update') {
     *       CountryStore.country = payload.selectedCountry;
     *     }
     *   });
     *
     * When the callback to update `CountryStore` is registered, we save a reference
     * to the returned token. Using this token with `waitFor()`, we can guarantee
     * that `CountryStore` is updated before the callback that updates `CityStore`
     * needs to query its data.
     *
     *   CityStore.dispatchToken = flightDispatcher.register(function(payload) {
     *     if (payload.actionType === 'country-update') {
     *       // `CountryStore.country` may not be updated.
     *       flightDispatcher.waitFor([CountryStore.dispatchToken]);
     *       // `CountryStore.country` is now guaranteed to be updated.
     *
     *       // Select the default city for the new country
     *       CityStore.city = getDefaultCityForCountry(CountryStore.country);
     *     }
     *   });
     *
     * The usage of `waitFor()` can be chained, for example:
     *
     *   FlightPriceStore.dispatchToken =
     *     flightDispatcher.register(function(payload) {
     *       switch (payload.actionType) {
     *         case 'country-update':
     *           flightDispatcher.waitFor([CityStore.dispatchToken]);
     *           FlightPriceStore.price =
     *             getFlightPriceStore(CountryStore.country, CityStore.city);
     *           break;
     *
     *         case 'city-update':
     *           FlightPriceStore.price =
     *             FlightPriceStore(CountryStore.country, CityStore.city);
     *           break;
     *     }
     *   });
     *
     * The `country-update` payload will be guaranteed to invoke the stores'
     * registered callbacks in order: `CountryStore`, `CityStore`, then
     * `FlightPriceStore`.
     */

    var Dispatcher = function (params) {
        this._lastID = 1;
        this._prefix = 'ID_';
        this._callbacks = {};
        this._isPending = {};
        this._isHandled = {};
        this._isDispatching = false;
        this._pendingPayload = null;
        this._debug = Boolean(params.debug);
    };

    /**
     * Registers a callback to be invoked with every dispatched payload. Returns
     * a token that can be used with `waitFor()`.
     *
     * @param {function} callback
     * @return {string}
     */
    Dispatcher.prototype.register = function (callback) {
        var id = this._prefix + this._lastID;

        this._lastID += 1;
        this._callbacks[id] = callback;

        return id;
    }

    /**
     * Removes a callback based on its token.
     *
     * @param {string} id
     */
    Dispatcher.prototype.unregister = function (id) {
        invariant(
            this._callbacks[id],
            'Dispatcher.unregister(...): `%s` does not map to a registered callback.',
            [id]
        );

        delete this._callbacks[id];
    }

    /**
     * Waits for the callbacks specified to be invoked before continuing execution
     * of the current callback. This method should only be used by a callback in
     * response to a dispatched payload.
     *
     * @param {array<string>} ids
     */
    Dispatcher.prototype.waitFor = function (ids) {
        invariant(
            this._isDispatching,
            'Dispatcher.waitFor(...): Must be invoked while dispatching.'
        );

        for (var i = 0; i < ids.length; i += 1) {
            var id = ids[i];

            if (this._isPending[id]) {
                invariant(
                    this._isHandled[id],
                    'Dispatcher.waitFor(...): Circular dependency detected while ' +
                    'waiting for `%s`.',
                    [id]
                );
                continue;
            }

            invariant(
                this._callbacks[id],
                'Dispatcher.waitFor(...): `%s` does not map to a registered callback.',
                [id]
            );

            this._invokeCallback(id);
        }
    }

    Dispatcher.prototype._log = function () {
        if (this._debug) {
            console.log.apply(console, arguments);
        }
    }

    /**
     * Dispatches a payload to all registered callbacks.
     *
     * @param {object} payload
     */
    Dispatcher.prototype.dispatch = function (payload) {
        invariant(
            !this._isDispatching,
            'Dispatch.dispatch(...): Cannot dispatch in the middle of a dispatch.'
        );

        this._log('Start dispatching', payload);

        this._startDispatching(payload);

        try {
            Object.keys(this._callbacks).forEach(function (id) {
                if (this._isPending[id]) {
                    return;
                }

                this._invokeCallback(id);
            }, this);
        } finally {
            this._stopDispatching();
        }
    }

    /**
     * Is this Dispatcher currently dispatching.
     *
     * @return {boolean}
     */
    Dispatcher.prototype.isDispatching = function () {
        return this._isDispatching;
    }

    /**
     * Call the callback stored with the given id. Also do some internal
     * bookkeeping.
     *
     * @param {string} id
     * @protected
     */
    Dispatcher.prototype._invokeCallback = function (id) {
        this._isPending[id] = true;
        this._callbacks[id](this._pendingPayload);
        this._isHandled[id] = true;
    }

    /**
     * Set up bookkeeping needed when dispatching.
     *
     * @param {object} payload
     * @protected
     */
    Dispatcher.prototype._startDispatching = function (payload) {
        Object.keys(this._callbacks).forEach(function (id) {
            this._isPending[id] = false;
            this._isHandled[id] = false;
        }, this);

        this._pendingPayload = payload;
        this._isDispatching = true;
    }

    /**
     * Clear bookkeeping used for dispatching.
     *
     * @protected
     */
    Dispatcher.prototype._stopDispatching = function () {
        this._pendingPayload = null;
        this._isDispatching = false;
    };

    provide({
        create: function (params) {
            return new Dispatcher(params);
        }
    });
});
modules.define('i-flux__controller', ['i-bem__dom'], function (provide, BEMDOM) {
    var Controller = BEMDOM.decl('i-flux__controller', {
        onSetMod: {
            js: function () {
                this._attachStores(this.stores || {});
                this._attachViews(this.views || {});
            }
        },

        _attachStores: function (stores) {
            stores.forEach(function (pair) {
                var store = pair[0];
                var callback = pair[1];

                store.addChangeListener(callback.bind(this, store));
            }, this);
        },

        _attachViews: function (views) {
            Object.keys(views).forEach(function (name) {
                // название представления может содержать только блок ('button'),
                // либо блок и элемент контроллера, в котором
                // следует искать указанный блок ('view-services.button')
                var chunks = name.split('.');
                var block = chunks.pop();
                var elem = chunks.pop();
                var $elem = elem ? this.elem.apply(this, elem.split('_')) : this.domElem;
                var events = views[name];

                if (!$elem.length) {
                    throw new Error('Cannot find elems with selector ' + elem);
                }

                // сокращённый синтаксис, если нужно слушать только событие change
                if (typeof events === 'function') {
                    events = { change: events };
                }

                Object.keys(events).forEach(function (event) {
                    var callback = events[event];

                    // используем live-подписку, чтобы не подписываться повторно
                    // при обновлении содержимого блоков
                    BEMDOM.blocks[block].on($elem, event, callback, this);
                }, this);
            }, this);
        }
    });

    provide(Controller);
});
modules.define(
    'i-flux',
    ['i-flux__actions', 'i-flux__controller', 'i-flux__dispatcher', 'i-flux__store'],
    function (provide, ACTIONS, CONTROLLER, DISPATCHER, STORE) {

provide({
    ACTIONS: ACTIONS,
    CONTROLLER: CONTROLLER,
    DISPATCHER: DISPATCHER,
    STORE: STORE
});

});
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
