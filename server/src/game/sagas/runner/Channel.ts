// A receiver must handle its own failures: exceptions must not escape it.
type Receiver<MessageT> = (message: MessageT) => void;

export class Channel<MessageT> {
    private messagesQueue: [MessageT, () => void][] = [];
    private receiversQueue: Receiver<MessageT>[] = [];

    put(message: MessageT) {
        this.putAndWait(message, () => {});
    }

    putAndWait(message: MessageT, callback: () => void) {
        const receiver = this.receiversQueue.shift();

        if (receiver) {
            receiver(message);
            callback();
        } else {
            this.messagesQueue.push([message, callback]);
        }
    }

    take(receiver: Receiver<MessageT>) {
        const message = this.messagesQueue.shift();

        if (message) {
            receiver(message[0]);
            message[1]();
        } else {
            this.receiversQueue.push(receiver);
        }
    }
}