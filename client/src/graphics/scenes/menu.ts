export default class Menu extends Phaser.Scene {
    joinExistingGameTitle: Phaser.GameObjects.Text;

    createNewGameTitle: Phaser.GameObjects.Text;

    inputDigits: Phaser.GameObjects.Text[] = [];
    inputDigitsUnderscore: Phaser.GameObjects.Rectangle[] = [];

    currentCursorPosition: number = 0;
    value: number[] = [];

    DIGITS = ["ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE"]

    constructor() {
        super({
            key: 'Menu',
        });
    }

    create() {
        this.scale.fullscreenTarget = document.getElementById('app');

        let centerX = this.game.canvas.width / 2;
        let centerY = this.game.canvas.height / 2;

        this.joinExistingGameTitle = this.add.text(centerX, 100, 'join exising game', {fontSize: '75px'})
            .setOrigin(0.5).setInteractive();

        this.drawDigits();

        this.createNewGameTitle = this.add.text(centerX, 600, "create new", {fontSize: '50px'})
            .setOrigin(0.5).setInteractive();

        addEventListener('paste', (event) => {
            event.preventDefault();

            let paste = (event as ClipboardEvent).clipboardData.getData('text');

            if (!/[0-9]{6}/.test(paste))
                return;

            let pasteAsText = paste.toString().slice(0, 6);

            for (let i = 0; i < 6; ++i) {
                this.value[i] = parseInt(pasteAsText[i]);
            }

            this.drawDigits();

            this.submit();
        });

        this.joinExistingGame();
    }

    joinExistingGame() {
        this.joinExistingGameTitle.removeAllListeners();
        this.createNewGameTitle.removeAllListeners();

        this.createNewGameTitle
            .on('pointerdown', () => {
                this.tweens.add({
                    targets: [
                        ...this.inputDigits,
                        ...this.inputDigitsUnderscore,
                        this.createNewGameTitle,
                        this.joinExistingGameTitle
                    ],
                    y: "-=500",
                    duration: 1000
                })

                this.tweens.addCounter({
                    from: 50,
                    to: 75,
                    onUpdate: (tween) => {
                        this.createNewGameTitle.setFontSize(tween.getValue());
                    }
                });

                this.createNewGame();
            });

        for (let i = 0; i < 10; ++i) {
            this.input.keyboard.on('keyup-' + this.DIGITS[i], () => {
                this.value[this.currentCursorPosition] = i;
                this.currentCursorPosition++;

                this.drawDigits();

                if (this.currentCursorPosition === 6) {
                    this.submit();
                }
            });
        }

        this.input.keyboard.on('keyup-BACKSPACE', () => {
            if (this.currentCursorPosition === 0)
                return;

            this.currentCursorPosition--;
            this.value[this.currentCursorPosition] = undefined;

            this.drawDigits();
        });
    }

    drawDigits() {
        let centerX = this.game.canvas.width / 2;
        let centerY = this.game.canvas.height / 2;

        for (let shape of this.inputDigits)
            shape.destroy();

        for (let shape of this.inputDigitsUnderscore)
            shape.destroy();

        this.inputDigits = [];
        this.inputDigitsUnderscore = [];

        for (let i = 0; i < 6; ++i) {
            if (this.value[i] !== undefined)
                this.inputDigits.push(
                    this.add.text(centerX + (i - 2.5) * 75, 400, this.value[i].toString(), {fontSize: '75px'})
                        .setOrigin(0.5, 1)
                );

            this.inputDigitsUnderscore.push(
                this.add.rectangle(centerX + (i - 2.5) * 75, 400, 50, 5, 0x4b4b4b)
                    .setOrigin(0.5, 0)
            );
        }
    }

    submit() {
        let link = parseInt(this.value.join(''));

        fetch('http://localhost:3000/check/' + link)
            .then(response => response.text())
            .then((text: string) => {
                if (text === 'true') {
                    window.location.href = 'http://localhost:3000/game/' + link;
                } else {
                    this.value = [];
                    this.currentCursorPosition = 0;

                    this.drawDigits();
                }
            });
    }

    createNewGame() {
        this.joinExistingGameTitle.removeAllListeners();
        this.createNewGameTitle.removeAllListeners();
    }
}