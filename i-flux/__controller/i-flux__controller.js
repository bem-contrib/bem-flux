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
