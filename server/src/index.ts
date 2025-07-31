import App from "./App";

App.getInstance().init()
    .then(res => {
        console.log("App started.");
    })
    .catch(err => {
        console.error(err);
    });

process.on('SIGUSR2', async () => {
    await App.getInstance().gracefulShutdown();
});
