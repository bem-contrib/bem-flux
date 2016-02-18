BEM-Flux
========

Flux implementation on top of [bem-core](https://github.com/bem/bem-core/).

> And what's about React?

BEM stack provides a full-featured view layer and could be a great replacement for React.

Example
-------

```js
modules.require(['i-flux'], function (provide, FLUX) {
    var dispatcher = FLUX.DISPATCHER.create();

    var orderActions = FLUX.ACTIONS.create({
        dispatcher: dispatcher,

        actions: {
            orderPizza: ['size', 'price'],
        }
    });

    var ordersStore = FLUX.STORE.create({
        dispatcher: dispatcher,

        state: {
            size: null,
            price: null
        },

        handlers: [
            [orderActions.orderPizza, function (data) {
                this._set('size', data.size);
                this._set('price', price * 0.9); // discouont :)

                this.emitChange();
            }]
        ]
    });

    var controller = FLUX.CONTROLLER.decl('phone__controller', {
        stores: [
            [ordersStore, function (store) {
                this.findBlockInside('cart').setVal(store.get('price'));
            }]
        ],

        views: {
            'pizza.button': {
                click: function (event) {
                    var size = this.findBlockInside('size', 'input').getVal();
                    var price = this.findBlockInside('price', 'input').getVal();

                    orderActions.orderPizza(size, price);
                }
            }
        }
    });
});
```
