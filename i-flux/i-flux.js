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
