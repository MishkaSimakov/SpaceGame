type Receiver<MessageT> = (message: MessageT) => void;

export class Channel<MessageT> {
    private messagesQueue: MessageT[] = [];
    private receiversQueue: Receiver<MessageT>[] = [];

    put(message: MessageT) {
        const receiver = this.receiversQueue.shift();

        if (receiver) {
            receiver(message);
        } else {
            this.messagesQueue.push(message);
        }
    }

    take(receiver: Receiver<MessageT>) {
        const message = this.messagesQueue.shift();

        if (message) {
            receiver(message);
        } else {
            this.receiversQueue.push(receiver);
        }
    }
}