import {test} from 'uvu';
import * as assert from 'uvu/assert';
import ActionsBus from "../../src/game/actions/ActionsBus";

test('simple_event', () => {
    class TestEventListener {
        received: boolean = false;

        simpleEvent() {
            this.received = true;
        }
    }

    const event_listener = new TestEventListener();

    const bus = new ActionsBus([
        event_listener
    ]);

    bus.emit('simpleEvent', {});

    assert.ok(event_listener.received);
});

test('request', async () => {
    class TestEventListener {
        bus: ActionsBus;

        simpleRequest() {
            setTimeout(() => {
                bus.emit('simpleResponse', 42);
            }, 1);
        }
    }

    const event_listener = new TestEventListener();
    const bus = new ActionsBus([
        event_listener
    ]);

    event_listener.bus = bus;

    let result: number = await bus.sendRequestAction('simple', {});

    assert.equal(result, 42);
});

test('reemit', async () => {
    class TestEventListener {
        bus: ActionsBus;

        state: number = 0;

        simpleEvent() {
            assert.equal(this.state, 0);
            this.state = 1;

            bus.emit('nextEvent', {});
        }

        nextEvent() {
            assert.equal(this.state, 1);
            this.state = 2;
        }
    }

    const event_listener = new TestEventListener();
    const bus = new ActionsBus([
        event_listener
    ]);

    event_listener.bus = bus;

    bus.emit('simpleEvent', {});
    assert.equal(event_listener.state, 2);
});

test.run();